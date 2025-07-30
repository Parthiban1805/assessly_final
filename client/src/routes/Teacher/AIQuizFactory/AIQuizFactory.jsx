import axios from 'axios';
import { ArrowLeft, Bot, Check, Download, Edit, Eye, FileUp, Save, Send, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreadcrumbContext } from '../../../contexts/BreadcrumbContext';

const AIQuizFactory = () => {
    const navigate = useNavigate();
    const chatEndRef = useRef(null);

    // --- State Management ---
    const [messages, setMessages] = useState(() => JSON.parse(sessionStorage.getItem('aiChatMessages')) || []);
    const [userInput, setUserInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    // FIX: Do not store the file content in sessionStorage. Hold the File object in state directly.
    const [uploadedFile, setUploadedFile] = useState(null); 
    const [questions, setQuestions] = useState(() => JSON.parse(sessionStorage.getItem('aiBaseQuestions')) || []);
    const [variations, setVariations] = useState(() => JSON.parse(sessionStorage.getItem('aiVariations')) || {});
    const [conversationContext, setConversationContext] = useState(() => sessionStorage.getItem('aiConversationContext') || 'awaiting_upload');
    const [numVariations, setNumVariations] = useState(3);
    const {setCrumbs} = useBreadcrumbContext();

    // --- useEffects for state persistence ---
    useEffect(() => { sessionStorage.setItem('aiChatMessages', JSON.stringify(messages)); }, [messages]);
    useEffect(() => { sessionStorage.setItem('aiBaseQuestions', JSON.stringify(questions)); }, [questions]);
    useEffect(() => { sessionStorage.setItem('aiVariations', JSON.stringify(variations)); }, [variations]);
    // FIX: Removed the useEffect that was causing the QuotaExceededError.
    // useEffect(() => { sessionStorage.setItem('aiUploadedFile', JSON.stringify(uploadedFile)); }, [uploadedFile]);
    useEffect(() => { sessionStorage.setItem('aiConversationContext', conversationContext); }, [conversationContext]);

    // --- Core useEffects ---
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (messages.length === 0) {
            addMessageToChat('Welcome to the AI Quiz Factory! Please upload a PDF to begin.', 'assistant');
        }
        setCrumbs([
            { name: 'Add Questions', path: '/add-question' },
            { name: 'AI Quiz Factory', path: `/teacher/view-quiz` }
        ]);
    }, [messages, setCrumbs]);

    useEffect(() => {
        const editedDataString = sessionStorage.getItem('quizToEdit');
        if (editedDataString) {
            try {
                const editedData = JSON.parse(editedDataString);
                if (editedData.type === 'base') {
                    setQuestions(editedData.questions);
                    addMessageToChat('Base questions updated. What is your next command?', 'assistant');
                    setConversationContext('awaiting_generate_variations');
                } else if (editedData.type === 'variations') {
                    const varObj = {};
                    editedData.questions.forEach((v, i) => { varObj[`base_q_${i}`] = [v]; });
                    setVariations(varObj);
                    addMessageToChat('Variations updated. You can now finalize the quiz.', 'assistant');
                    setConversationContext('finalizable');
                }
                sessionStorage.removeItem('quizToEdit');
            } catch(e) { console.error("Could not parse edited quiz data."); }
        }
    }, []);

    // --- Helper & Logic Functions ---
    const addMessageToChat = (text, sender, data = {}) => setMessages(prev => [...prev, { text, sender, ...data }]);

    // FIX: This function is no longer needed as we don't store Base64 content.
    // const getFileFromStorage = () => { ... };

    const handleUserInput = async () => {
        if (!userInput.trim() || isProcessing) return;
        const prompt = userInput.trim();
        addMessageToChat(prompt, 'user');
        setUserInput('');
        if (prompt.toLowerCase() === 'reset') { handleResetSession(); return; }
        setIsProcessing(true);
        await handleCommand(prompt);
        setIsProcessing(false);
    };

    const handleResetSession = () => {
        // Clear all relevant session storage keys
        Object.keys(sessionStorage).forEach(key => { if (key.startsWith('ai')) sessionStorage.removeItem(key); });
        // Reset all state
        setMessages([]); 
        setQuestions([]); 
        setVariations({}); 
        setUploadedFile(null); // Reset the file state
        setConversationContext('awaiting_upload');
        // Add a fresh welcome message
        addMessageToChat('Session reset. Welcome back! Please upload a PDF to begin.', 'assistant');
    };

    const handleRecommendationClick = async (command, data = {}) => {
        const userMessage = command.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        addMessageToChat(userMessage, 'user');
        setIsProcessing(true);
        await handleCommand(command, data);
        setIsProcessing(false);
    };

    // --- Core Command Logic (Unchanged) ---
    const handleCommand = async (command, data = {}) => {
        const lowerCaseCommand = command.toLowerCase();

        switch (conversationContext) {
            case 'awaiting_prompt':
                if (lowerCaseCommand.startsWith('generate')) await generateBaseQuestions(command);
                else addMessageToChat('Please start with a "generate" command.', 'assistant');
                break;
            case 'awaiting_view_or_edit_base':
                if (lowerCaseCommand === 'view' || lowerCaseCommand === 'edit') {
                    handleViewOrEdit(lowerCaseCommand, 'base', questions);
                } else if (lowerCaseCommand === 'confirm') {
                    addMessageToChat('Base questions confirmed. You can now generate variations or finalize the quiz with only these base questions.', 'assistant');
                    setConversationContext('awaiting_generate_variations');
                } else {
                     addMessageToChat('Please choose an action from the buttons below.', 'assistant');
                }
                break;
            case 'awaiting_generate_variations':
                if (lowerCaseCommand === 'generate_variations') await generateVariations(data.numToGenerate);
                else if (lowerCaseCommand === 'finalize_base') handleFinalConfirm(false);
                else addMessageToChat('Please choose an action from the buttons below.', 'assistant');
                break;
            case 'awaiting_view_or_edit_variations':
                if (lowerCaseCommand.includes('view') || lowerCaseCommand.includes('edit')) {
                    handleViewOrEdit(lowerCaseCommand, 'variations', Object.values(variations).flat());
                } else if (lowerCaseCommand.includes('confirm')) {
                    addMessageToChat('Variations confirmed. You can now finalize the quiz.', 'assistant');
                    setConversationContext('finalizable');
                } else {
                     addMessageToChat('Invalid command. Please View, Edit, or Confirm variations.', 'assistant');
                }
                break;
            case 'finalizable':
                 if (lowerCaseCommand === 'confirm_and_save') handleFinalConfirm(true);
                 else addMessageToChat('Please confirm to finalize.', 'assistant');
                 break;
            default:
                addMessageToChat("I'm waiting for your next action. Use the buttons or type 'reset'.", 'assistant');
        }
    };

    const handleFileUpload = (file) => {
        if (file && file.type === 'application/pdf') {
            // FIX: Simply store the File object in state. Do not use FileReader.
            setUploadedFile(file);
            addMessageToChat(`Uploaded "${file.name}". What's your command?`, 'assistant');
            setConversationContext('awaiting_prompt');
        } else {
            addMessageToChat('Please upload a valid PDF file.', 'assistant', { isError: true });
        }
    };

    const pollJobStatus = (jobId, jobType) => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get(`http://localhost:8000/api/v1/quiz/status/${jobId}`);
                const { status, message, result } = response.data;
                if (status === 'completed') {
                    clearInterval(interval);
                    setIsProcessing(false);
                    if (jobType === 'base_generation') {
                        setQuestions(prev => [...prev, ...result]);
                        addMessageToChat(`Generated ${result.length} new questions. You now have ${questions.length + result.length} total. What's next?`, 'assistant');
                        setConversationContext('awaiting_view_or_edit_base');
                    } else if (jobType === 'variation_generation') {
                        setVariations(result);
                        addMessageToChat(`Generated variations for ${Object.keys(result).length} questions.`, 'assistant');
                        setConversationContext('awaiting_view_or_edit_variations');
                    }
                } else if (status === 'failed') {
                    addMessageToChat(`Sorry, the process failed: ${message}`, 'assistant', { isError: true });
                    clearInterval(interval);
                    setIsProcessing(false);
                }
            } catch (error) {
                addMessageToChat('Error checking job status.', 'assistant', { isError: true });
                clearInterval(interval);
                setIsProcessing(false);
            }
        }, 3000);
    };

    const generateBaseQuestions = async (prompt) => {
        // FIX: Directly use the File object from state.
        if (!uploadedFile) { 
            addMessageToChat("File not found. Please re-upload.", 'assistant', { isError: true }); 
            setIsProcessing(false); // Make sure to stop processing
            return; 
        }
        try {
            const formData = new FormData();
            // FIX: Append the file object directly.
            formData.append('file', uploadedFile, uploadedFile.name);
            formData.append('user_prompt', prompt);
            const numMatch = prompt.match(/\d+/);
            formData.append('num_questions', numMatch ? numMatch[0] : '5');
            addMessageToChat('Understood. Starting generation process...', 'assistant');
            const response = await axios.post('http://localhost:8000/api/v1/quiz/generate', formData);
            pollJobStatus(response.data.job_id, 'base_generation');
        } catch (error) { 
            console.error("Generation error:", error); 
            addMessageToChat('Failed to start generation.', 'assistant', { isError: true }); 
            setIsProcessing(false); // Stop processing on error
        }
    };

    const generateVariations = async (numToGenerate) => {
        try {
            addMessageToChat(`Understood. Generating ${numToGenerate} variations per question...`, 'assistant');
            const payload = { base_questions: questions, num_variations: numToGenerate };
            const response = await axios.post('http://localhost:8000/api/v1/quiz/variations', payload);
            pollJobStatus(response.data.job_id, 'variation_generation');
        } catch (error) { 
            console.error("Variation error:", error); 
            addMessageToChat('Failed to start variation generation.', 'assistant', { isError: true }); 
            setIsProcessing(false); // Stop processing on error
        }
    };

    const handleViewOrEdit = (command, type, data) => {
        const pageKey = command.includes('view') ? 'quizToView' : 'quizToEdit';
        sessionStorage.setItem(pageKey, JSON.stringify({
            type, questions: data, title: `${pageKey === 'quizToView' ? 'Viewing' : 'Editing'} ${type} Questions`
        }));
        navigate(pageKey === 'quizToView' ? '/teacher/view-quiz' : '/teacher/edit-quiz');
    };
    
    // --- Finalization & UI (Unchanged) ---
    const handleFinalConfirm = (includeVariations) => {
        if (questions.length === 0) { addMessageToChat("There are no questions to confirm.", 'assistant', { isError: true }); return; }
        const tagCounts = {};
        questions.forEach(q => { tagCounts[q.tags] = (tagCounts[q.tags] || 0) + 1; });
        const totalQuestions = questions.length;
        const calculatedTags = Object.keys(tagCounts).map(tag => ({ tag, weightage: (Math.round((tagCounts[tag] / totalQuestions) * 1000) / 10).toString() }));
        const headers = ['question', 'option1', 'option2', 'option3', 'option4', 'answer', 'mark', 'tags'];
        const createCsvRow = (q) => {
            const opts = [...(q.options || []), '', '', '', ''];
            return [`"${(q.question || '').replace(/"/g, '""')}"`, `"${(opts[0] || '').replace(/"/g, '""')}"`, `"${(opts[1] || '').replace(/"/g, '""')}"`, `"${(opts[2] || '').replace(/"/g, '""')}"`, `"${(opts[3] || '').replace(/"/g, '""')}"`, `"${(q.answer || '').replace(/"/g, '""')}"`, q.mark || 1, `"${(q.tags || '').replace(/"/g, '""')}"`].join(',');
        };
        let rows = questions.map(createCsvRow);
        let finalFileName = 'ai-generated-quiz.csv';
        if (includeVariations && Object.keys(variations).length > 0) {
            rows = [...rows, ...Object.values(variations).flat().map(createCsvRow)];
            finalFileName = 'ai-generated-quiz-with-variations.csv';
        }
        const csvContent = [headers.join(','), ...rows].join('\n');
        const quizDataForParent = { fileName: finalFileName, csvContent, tags: calculatedTags };
        addMessageToChat('Quiz finalized! Click "Return to Form" to populate your assessment.', 'assistant', { isNavigable: true, navigationData: quizDataForParent, isDownloadable: true, csvContent, fileName: finalFileName });
        setConversationContext('done');
    };

    const downloadCSV = (csvContent, fileName) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName || "quiz.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- UI Rendering Components (Unchanged) ---
    const Message = ({ msg }) => {
        const isBot = msg.sender === 'assistant';
        return (
            <div className={`flex items-end gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
                {isBot && <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"><Bot className="w-5 h-5 text-slate-500"/></div>}
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${isBot ? 'bg-slate-100 text-slate-800 rounded-bl-none' : 'bg-blue-600 text-white rounded-br-none'} ${msg.isError ? 'bg-red-200 text-red-800 border border-red-300' : ''}`}>
                    <p>{msg.text}</p>
                    {msg.isNavigable && <button onClick={() => navigate('/add-question', { state: { aiQuizData: msg.navigationData } })} className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-md font-semibold text-xs hover:bg-blue-600">Return to Form & Populate</button>}
                    {msg.isDownloadable && <button onClick={() => downloadCSV(msg.csvContent, msg.fileName)} className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-md font-semibold text-xs hover:bg-blue-600"><Download size={14}/> Download CSV</button>}
                </div>
                {!isBot && <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-slate-600"/></div>}
            </div>
        );
    };

    const RecommendationChips = () => {
        // ... (This component is unchanged)
        let chips = [];
        switch (conversationContext) {
            case 'awaiting_view_or_edit_base':
                chips = [{ label: 'View Questions', command: 'view', icon: <Eye size={16}/> }, { label: 'Edit Questions', command: 'edit', icon: <Edit size={16}/> }, { label: 'Confirm & Proceed', command: 'confirm', icon: <Check size={16}/> }]; break;
            case 'awaiting_generate_variations':
                return (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-3">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-slate-700">Variations:</label>
                            <input type="number" value={numVariations} onChange={(e) => setNumVariations(parseInt(e.target.value))} min="1" max="5" className="w-16 px-2 py-1 border border-slate-300 rounded-md"/>
                            <button onClick={() => handleRecommendationClick('generate_variations', { numToGenerate: numVariations })} className="flex-1 px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700">Generate Variations</button>
                        </div>
                        <button onClick={() => handleRecommendationClick('finalize_base')} className="w-full px-3 py-1.5 text-sm font-semibold bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100">Finalize (Base Only)</button>
                    </div>
                );
            case 'awaiting_view_or_edit_variations':
                chips = [{ label: 'View Variations', command: 'view', icon: <Eye size={16}/> }, { label: 'Edit Variations', command: 'edit', icon: <Edit size={16}/> }, { label: 'Confirm Variations', command: 'confirm', icon: <Check size={16}/> }]; break;
            case 'finalizable':
                chips = [{ label: 'Confirm & Save', command: 'confirm_and_save', icon: <Save size={16}/> }]; break;
        }
        return chips.length > 0 ? <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-200 bg-slate-50">{chips.map(c => <button key={c.command} onClick={() => handleRecommendationClick(c.command)} className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100">{c.icon}{c.label}</button>)}</div> : null;
    };
    
    // --- Main Render with Tailwind CSS (Unchanged) ---
    return (
        <div className="flex items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-3xl h-[80vh] flex flex-col bg-white rounded-2xl shadow-md border border-slate-200">
                <header className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Bot className="w-6 h-6 text-blue-600" /></div>
                        <div>
                            <h2 className="font-bold text-slate-800">AI Quiz Factory</h2>
                            <p className="text-xs text-green-600 font-semibold">Online</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/add-question')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"><ArrowLeft size={16}/> Back to Form</button>
                </header>

                <main className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => <Message key={index} msg={msg} />)}
                    {isProcessing && <div className="flex items-end gap-2.5 justify-start"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"><Bot className="w-5 h-5 text-slate-500"/></div><div className="p-3 rounded-2xl bg-slate-100 rounded-bl-none flex items-center gap-2"><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span><span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span></div></div>}
                    <div ref={chatEndRef} />
                </main>
                
                <RecommendationChips />
                
                <footer className="p-4 border-t border-slate-200 flex-shrink-0">
                    {conversationContext === 'awaiting_upload' ? (
                        <label htmlFor="pdf-upload" className="flex flex-col items-center justify-center w-full p-6 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                            <FileUp className="w-10 h-10 mx-auto text-slate-400" />
                            <p className="mt-2 text-sm text-slate-500"><span className="font-semibold text-blue-600">Click to upload PDF</span></p>
                            <input type="file" id="pdf-upload" accept=".pdf" onChange={(e) => handleFileUpload(e.target.files[0])} className="hidden"/>
                        </label>
                    ) : (
                        <div className="relative">
                            <input type="text" className="w-full pl-4 pr-12 py-3 bg-slate-100 border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={conversationContext === 'awaiting_prompt' ? "e.g., generate 10 questions..." : "Type 'reset' to start over..."} value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleUserInput()} disabled={isProcessing} />
                            <button onClick={handleUserInput} disabled={isProcessing || !userInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-full transition-colors hover:bg-blue-700 disabled:bg-slate-300"><Send size={18} /></button>
                        </div>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default AIQuizFactory;
