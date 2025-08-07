import axios from 'axios';
import { ArrowLeft, Bot, Check, Download, Edit, Eye, FileUp, Save, Send, User } from 'lucide-react'; // Icons for various actions and roles
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreadcrumbContext } from '../../../contexts/BreadcrumbContext'; // Breadcrumb context hook
import { API_BASE_URL } from '../../../config/constants'; // Import the common API base URL

/**
 * AIQuizFactory component provides an interactive chat-based interface for teachers
 * to generate and manage quiz questions using an AI. It supports uploading PDFs,
 * generating base questions, creating variations, and exporting the final quiz.
 *
 * @returns {JSX.Element} The AI Quiz Factory UI.
 */
const AIQuizFactory = () => {
    const navigate = useNavigate(); // Hook for programmatic navigation.
    const chatEndRef = useRef(null); // Ref to automatically scroll to the latest chat message.

    // --- State Management ---
    // Messages displayed in the chat interface, persisted in session storage.
    const [messages, setMessages] = useState(() => JSON.parse(sessionStorage.getItem('aiChatMessages')) || []);
    // User's current input in the chat message composer.
    const [userInput, setUserInput] = useState('');
    // Flag indicating if an AI processing task is active.
    const [isProcessing, setIsProcessing] = useState(false);
    // The uploaded PDF file object.
    const [uploadedFile, setUploadedFile] = useState(null);
    // Array of base questions generated or loaded, persisted in session storage.
    const [questions, setQuestions] = useState(() => JSON.parse(sessionStorage.getItem('aiBaseQuestions')) || []);
    // Object containing question variations, persisted in session storage.
    const [variations, setVariations] = useState(() => JSON.parse(sessionStorage.getItem('aiVariations')) || {});
    // Current context/phase of the conversation, guiding AI responses and available commands.
    const [conversationContext, setConversationContext] = useState(() => sessionStorage.getItem('aiConversationContext') || 'awaiting_upload');
    // Number of variations to generate per question.
    const [numVariations, setNumVariations] = useState(3);
    const {setCrumbs} = useBreadcrumbContext(); // Hook to set breadcrumbs.

    // --- useEffects for state persistence in sessionStorage ---
    useEffect(() => { sessionStorage.setItem('aiChatMessages', JSON.stringify(messages)); }, [messages]);
    useEffect(() => { sessionStorage.setItem('aiBaseQuestions', JSON.stringify(questions)); }, [questions]);
    useEffect(() => { sessionStorage.setItem('aiVariations', JSON.stringify(variations)); }, [variations]);
    useEffect(() => { sessionStorage.setItem('aiConversationContext', conversationContext); }, [conversationContext]);
    // Note: uploadedFile (File object) is NOT directly persisted to sessionStorage due to size limits.
    // Its presence is implied by conversationContext.

    // --- Core useEffects ---
    /**
     * Effect hook to scroll to the bottom of the chat and display a welcome message
     * if the chat is empty on component mount. Also sets breadcrumbs.
     */
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (messages.length === 0) {
            addMessageToChat('Welcome to the AI Quiz Factory! Please upload a PDF to begin.', 'assistant');
        }
        // Set breadcrumbs for the AI Quiz Factory page.
        setCrumbs([
            { name: 'Add Questions', path: '/add-question' },
            { name: 'AI Quiz Factory', path: `/teacher/ai-quiz-factory` }
        ]);
    }, [messages, setCrumbs]); // Dependencies: messages (for chat update), setCrumbs (for breadcrumbs).

    /**
     * Effect hook to handle data received from `EditAIQuiz` component.
     * If questions were edited, updates the state and conversation context.
     */
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
                    // Reconstruct variations object if edited variations are returned as a flat array.
                    const varObj = {};
                    editedData.questions.forEach((v, i) => { varObj[`base_q_${i}`] = [v]; }); // Simplified, assuming each variation corresponds to a 'base_q_i'
                    setVariations(varObj);
                    addMessageToChat('Variations updated. You can now finalize the quiz.', 'assistant');
                    setConversationContext('finalizable');
                }
                sessionStorage.removeItem('quizToEdit'); // Clear session storage after processing.
            } catch(e) { console.error("Could not parse edited quiz data:", e); }
        }
    }, []); // Empty dependency array means this runs only once on mount.

    // --- Helper & Logic Functions ---
    /**
     * Adds a new message to the chat history state.
     * @param {string} text - The content of the message.
     * @param {'user' | 'assistant'} sender - The sender of the message.
     * @param {object} [data={}] - Additional data for the message (e.g., `isError`, `isNavigable`).
     */
    const addMessageToChat = (text, sender, data = {}) => setMessages(prev => [...prev, { text, sender, ...data }]);

    /**
     * Handles user input from the chat message composer.
     * Processes 'reset' command or delegates to `handleCommand` for other inputs.
     */
    const handleUserInput = async () => {
        if (!userInput.trim() || isProcessing) return; // Prevent empty or multiple submissions.
        const prompt = userInput.trim();
        addMessageToChat(prompt, 'user'); // Add user's message to chat.
        setUserInput(''); // Clear input field.
        if (prompt.toLowerCase() === 'reset') { handleResetSession(); return; } // Handle reset command.
        setIsProcessing(true); // Set processing state.
        await handleCommand(prompt); // Process the command.
        setIsProcessing(false); // Clear processing state.
    };

    /**
     * Resets the entire chat session, clearing states and session storage.
     */
    const handleResetSession = () => {
        // Clear all relevant session storage keys that start with 'ai'.
        Object.keys(sessionStorage).forEach(key => { if (key.startsWith('ai')) sessionStorage.removeItem(key); });
        // Reset all component states.
        setMessages([]);
        setQuestions([]);
        setVariations({});
        setUploadedFile(null); // Clear the file object.
        setConversationContext('awaiting_upload');
        // Add a fresh welcome message to the chat.
        addMessageToChat('Session reset. Welcome back! Please upload a PDF to begin.', 'assistant');
    };

    /**
     * Handles clicks on recommendation chips/buttons.
     * Simulates user input and delegates to `handleCommand`.
     * @param {string} command - The command string associated with the chip.
     * @param {object} [data={}] - Optional data for the command (e.g., number of variations).
     */
    const handleRecommendationClick = async (command, data = {}) => {
        // Format command string for display in chat.
        const userMessage = command.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        addMessageToChat(userMessage, 'user'); // Add formatted message to chat.
        setIsProcessing(true); // Set processing state.
        await handleCommand(command, data); // Process the command.
        setIsProcessing(false); // Clear processing state.
    };

    // --- Core Command Logic ---
    /**
     * Core function to process commands based on the current conversation context.
     * Delegates to specific handlers for generating questions, variations, etc.
     * @param {string} command - The user's input command.
     * @param {object} [data={}] - Additional data for the command.
     */
    const handleCommand = async (command, data = {}) => {
        const lowerCaseCommand = command.toLowerCase();

        switch (conversationContext) {
            case 'awaiting_prompt':
                if (lowerCaseCommand.startsWith('generate')) await generateBaseQuestions(command);
                else addMessageToChat('Please start with a "generate" command.', 'assistant', { isError: true });
                break;
            case 'awaiting_view_or_edit_base':
                if (lowerCaseCommand === 'view' || lowerCaseCommand === 'edit') {
                    handleViewOrEdit(lowerCaseCommand, 'base', questions);
                } else if (lowerCaseCommand === 'confirm') {
                    addMessageToChat('Base questions confirmed. You can now generate variations or finalize the quiz with only these base questions.', 'assistant');
                    setConversationContext('awaiting_generate_variations');
                } else {
                     addMessageToChat('Please choose an action from the buttons below.', 'assistant', { isError: true });
                }
                break;
            case 'awaiting_generate_variations':
                if (lowerCaseCommand === 'generate_variations') await generateVariations(data.numToGenerate);
                else if (lowerCaseCommand === 'finalize_base') handleFinalConfirm(false); // Finalize with only base questions.
                else addMessageToChat('Please choose an action from the buttons below.', 'assistant', { isError: true });
                break;
            case 'awaiting_view_or_edit_variations':
                if (lowerCaseCommand.includes('view') || lowerCaseCommand.includes('edit')) {
                    handleViewOrEdit(lowerCaseCommand, 'variations', Object.values(variations).flat());
                } else if (lowerCaseCommand.includes('confirm')) {
                    addMessageToChat('Variations confirmed. You can now finalize the quiz.', 'assistant');
                    setConversationContext('finalizable');
                } else {
                     addMessageToChat('Invalid command. Please View, Edit, or Confirm variations.', 'assistant', { isError: true });
                }
                break;
            case 'finalizable':
                 if (lowerCaseCommand === 'confirm_and_save') handleFinalConfirm(true); // Finalize with variations.
                 else addMessageToChat('Please confirm to finalize.', 'assistant', { isError: true });
                 break;
            default:
                addMessageToChat("I'm waiting for your next action. Use the buttons or type 'reset'.", 'assistant');
        }
    };

    /**
     * Handles the selection of a PDF file for upload.
     * Stores the file and updates conversation context.
     * @param {File} file - The selected PDF file object.
     */
    const handleFileUpload = (file) => {
        if (file && file.type === 'application/pdf') {
            setUploadedFile(file); // Store the file object.
            addMessageToChat(`Uploaded "${file.name}". What's your command?`, 'assistant');
            setConversationContext('awaiting_prompt'); // Move to awaiting prompt.
        } else {
            addMessageToChat('Please upload a valid PDF file.', 'assistant', { isError: true });
        }
    };

    /**
     * Polls the status of an asynchronous job initiated on the backend (e.g., question generation).
     * Updates chat messages and state upon completion or failure.
     * @param {string} jobId - The ID of the job to poll.
     * @param {string} jobType - Type of job ('base_generation' or 'variation_generation').
     */
    const pollJobStatus = (jobId, jobType) => {
        const interval = setInterval(async () => {
            try {
                // Poll status endpoint for the AI service.
                const response = await axios.get(`${API_BASE_URL}/quiz/status/${jobId}`);
                const { status, message, result } = response.data;
                if (status === 'completed') {
                    clearInterval(interval); // Stop polling.
                    setIsProcessing(false); // Clear processing state.
                    if (jobType === 'base_generation') {
                        setQuestions(prev => [...prev, ...result]); // Add new questions.
                        addMessageToChat(`Generated ${result.length} new questions. You now have ${questions.length + result.length} total. What's next?`, 'assistant');
                        setConversationContext('awaiting_view_or_edit_base'); // Transition context.
                    } else if (jobType === 'variation_generation') {
                        setVariations(result); // Set generated variations.
                        addMessageToChat(`Generated variations for ${Object.keys(result).length} questions.`, 'assistant');
                        setConversationContext('awaiting_view_or_edit_variations'); // Transition context.
                    }
                } else if (status === 'failed') {
                    addMessageToChat(`Sorry, the process failed: ${message}`, 'assistant', { isError: true });
                    clearInterval(interval);
                    setIsProcessing(false);
                }
            } catch (error) {
                console.error("Error polling job status:", error);
                addMessageToChat('Error checking job status.', 'assistant', { isError: true });
                clearInterval(interval);
                setIsProcessing(false);
            }
        }, 3000); // Poll every 3 seconds.
    };

    /**
     * Sends a request to the AI backend to generate base questions from the uploaded PDF.
     * Initiates polling for job status.
     * @param {string} prompt - User's prompt for question generation.
     */
    const generateBaseQuestions = async (prompt) => {
        if (!uploadedFile) {
            addMessageToChat("File not found. Please re-upload.", 'assistant', { isError: true });
            setIsProcessing(false);
            return;
        }
        try {
            const formData = new FormData();
            formData.append('file', uploadedFile, uploadedFile.name); // Append the actual file object.
            formData.append('user_prompt', prompt);
            const numMatch = prompt.match(/\d+/); // Extract number of questions from prompt.
            formData.append('num_questions', numMatch ? numMatch[0] : '5'); // Default to 5 questions.

            addMessageToChat('Understood. Starting generation process...', 'assistant');
            // Send request to generate questions.
            const response = await axios.post(`${API_BASE_URL}/quiz/generate`, formData);
            pollJobStatus(response.data.job_id, 'base_generation'); // Start polling.
        } catch (error) {
            console.error("Generation error:", error);
            addMessageToChat('Failed to start generation.', 'assistant', { isError: true });
            setIsProcessing(false);
        }
    };

    /**
     * Sends a request to the AI backend to generate variations for existing base questions.
     * Initiates polling for job status.
     * @param {number} numToGenerate - Number of variations to generate per question.
     */
    const generateVariations = async (numToGenerate) => {
        try {
            addMessageToChat(`Understood. Generating ${numToGenerate} variations per question...`, 'assistant');
            const payload = { base_questions: questions, num_variations: numToGenerate };
            // Send request to generate variations.
            const response = await axios.post(`${API_BASE_URL}/quiz/variations`, payload);
            pollJobStatus(response.data.job_id, 'variation_generation'); // Start polling.
        } catch (error) {
            console.error("Variation error:", error);
            addMessageToChat('Failed to start variation generation.', 'assistant', { isError: true });
            setIsProcessing(false);
        }
    };

    /**
     * Handles navigation to View or Edit quiz pages. Stores data in session storage for the target page.
     * @param {string} command - 'view' or 'edit'.
     * @param {'base' | 'variations'} type - Type of questions being viewed/edited.
     * @param {Array<object>} data - The questions data to pass.
     */
    const handleViewOrEdit = (command, type, data) => {
        const pageKey = command.includes('view') ? 'quizToView' : 'quizToEdit';
        sessionStorage.setItem(pageKey, JSON.stringify({
            type, questions: data, title: `${pageKey === 'quizToView' ? 'Viewing' : 'Editing'} ${type} Questions`
        }));
        navigate(pageKey === 'quizToView' ? '/teacher/view-quiz' : '/teacher/edit-quiz');
    };

    // --- Finalization & UI ---
    /**
     * Finalizes the quiz, calculates tag weightages, generates a CSV,
     * and provides options to return to the Add Question form or download the CSV.
     * @param {boolean} includeVariations - Whether to include generated variations in the final CSV.
     */
    const handleFinalConfirm = (includeVariations) => {
        if (questions.length === 0) { addMessageToChat("There are no questions to confirm.", 'assistant', { isError: true }); return; }

        // Calculate tag weightages based on base questions.
        const tagCounts = {};
        questions.forEach(q => { tagCounts[q.tags] = (tagCounts[q.tags] || 0) + 1; });
        const totalQuestions = questions.length;
        const calculatedTags = Object.keys(tagCounts).map(tag => ({ tag, weightage: (Math.round((tagCounts[tag] / totalQuestions) * 1000) / 10).toString() }));

        // Define CSV headers.
        const headers = ['question', 'option1', 'option2', 'option3', 'option4', 'answer', 'mark', 'tags'];

        // Helper to create a CSV row from a question object.
        const createCsvRow = (q) => {
            const opts = [...(q.options || []), '', '', '', '']; // Ensure enough options, fill with empty strings.
            return [`"${(q.question || '').replace(/"/g, '""')}"`, `"${(opts[0] || '').replace(/"/g, '""')}"`, `"${(opts[1] || '').replace(/"/g, '""')}"`, `"${(opts[2] || '').replace(/"/g, '""')}"`, `"${(opts[3] || '').replace(/"/g, '""')}"`, `"${(q.answer || '').replace(/"/g, '""')}"`, q.mark || 1, `"${(q.tags || '').replace(/"/g, '""')}"`].join(',');
        };

        let rows = questions.map(createCsvRow); // Rows from base questions.
        let finalFileName = 'ai-generated-quiz.csv';

        // Add variations if requested.
        if (includeVariations && Object.keys(variations).length > 0) {
            rows = [...rows, ...Object.values(variations).flat().map(createCsvRow)];
            finalFileName = 'ai-generated-quiz-with-variations.csv';
        }

        const csvContent = [headers.join(','), ...rows].join('\n'); // Full CSV content.
        const quizDataForParent = { fileName: finalFileName, csvContent, tags: calculatedTags };

        // Add final message to chat with navigation and download options.
        addMessageToChat('Quiz finalized! Click "Return to Form" to populate your assessment.', 'assistant', { isNavigable: true, navigationData: quizDataForParent, isDownloadable: true, csvContent, fileName: finalFileName });
        setConversationContext('done'); // Set conversation as done.
    };

    /**
     * Triggers the download of a CSV file.
     * @param {string} csvContent - The content of the CSV file.
     * @param {string} fileName - The desired file name.
     */
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

    // --- UI Rendering Components ---
    /**
     * Message component for displaying individual chat messages.
     * @param {object} props - Component props.
     * @param {object} props.msg - The message object.
     * @returns {JSX.Element} A single chat message bubble.
     */
    const Message = ({ msg }) => {
        const isBot = msg.sender === 'assistant';
        return (
            <div className={`flex items-end gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
                {isBot && <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"><Bot className="w-5 h-5 text-slate-500 dark:text-gray-400"/></div>}
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
                    ${isBot ? 'bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-gray-100 rounded-bl-none' : 'bg-blue-600 text-white rounded-br-none'}
                    ${msg.isError ? 'bg-red-200 dark:bg-red-900/20 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-700' : ''}`}>
                    <p>{msg.text}</p>
                    {/* Conditional buttons for navigation or download based on message data */}
                    {msg.isNavigable && <button onClick={() => navigate('/add-question', { state: { aiQuizData: msg.navigationData } })} className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-md font-semibold text-xs hover:bg-blue-600 dark:hover:bg-blue-400">Return to Form & Populate</button>}
                    {msg.isDownloadable && <button onClick={() => downloadCSV(msg.csvContent, msg.fileName)} className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-md font-semibold text-xs hover:bg-blue-600 dark:hover:bg-blue-400"><Download size={14}/> Download CSV</button>}
                </div>
                {!isBot && <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-slate-600 dark:text-gray-300"/></div>}
            </div>
        );
    };

    /**
     * RecommendationChips component displays action buttons relevant to the current conversation context.
     * @returns {JSX.Element|null} A row of recommendation chips or null.
     */
    const RecommendationChips = () => {
        let chips = [];
        switch (conversationContext) {
            case 'awaiting_view_or_edit_base':
                chips = [{ label: 'View Questions', command: 'view', icon: <Eye size={16}/> }, { label: 'Edit Questions', command: 'edit', icon: <Edit size={16}/> }, { label: 'Confirm & Proceed', command: 'confirm', icon: <Check size={16}/> }]; break;
            case 'awaiting_generate_variations':
                return (
                    <div className="p-3 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-700 space-y-3">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-slate-700 dark:text-gray-200">Variations:</label>
                            <input type="number" value={numVariations} onChange={(e) => setNumVariations(parseInt(e.target.value))} min="1" max="5" className="w-16 px-2 py-1 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white"/>
                            <button onClick={() => handleRecommendationClick('generate_variations', { numToGenerate: numVariations })} className="flex-1 px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500">Generate Variations</button>
                        </div>
                        <button onClick={() => handleRecommendationClick('finalize_base')} className="w-full px-3 py-1.5 text-sm font-semibold bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 rounded-md hover:bg-slate-100 dark:hover:bg-gray-700/50">Finalize (Base Only)</button>
                    </div>
                );
            case 'awaiting_view_or_edit_variations':
                chips = [{ label: 'View Variations', command: 'view', icon: <Eye size={16}/> }, { label: 'Edit Variations', command: 'edit', icon: <Edit size={16}/> }, { label: 'Confirm Variations', command: 'confirm', icon: <Check size={16}/> }]; break;
            case 'finalizable':
                chips = [{ label: 'Confirm & Save', command: 'confirm_and_save', icon: <Save size={16}/> }]; break;
            default:
                return null; // No chips for other contexts.
        }
        return chips.length > 0 ? <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700">{chips.map(c => <button key={c.command} onClick={() => handleRecommendationClick(c.command)} className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 rounded-md hover:bg-slate-100 dark:hover:bg-gray-700/50">{c.icon}{c.label}</button>)}</div> : null;
    };

    return (
        <div className="flex items-center justify-center bg-slate-100 dark:bg-gray-900 p-4">
            <div className="w-full max-w-3xl h-[80vh] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-slate-200 dark:border-gray-700">
                {/* Chat Header */}
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"><Bot className="w-6 h-6 text-blue-600 dark:text-blue-300" /></div>
                        <div>
                            <h2 className="font-bold text-slate-800 dark:text-white">AI Quiz Factory</h2>
                            <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Online</p>
                        </div>
                    </div>
                    {/* Button to go back to the Add Question form */}
                    <button onClick={() => navigate('/add-question')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 rounded-md hover:bg-slate-200 dark:hover:bg-gray-600"><ArrowLeft size={16}/> Back to Form</button>
                </header>

                {/* Main Chat Messages Area */}
                <main className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => <Message key={index} msg={msg} />)}
                    {/* Loading indicator (typing animation) */}
                    {isProcessing && <div className="flex items-end gap-2.5 justify-start"><div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"><Bot className="w-5 h-5 text-slate-500 dark:text-gray-400"/></div><div className="p-3 rounded-2xl bg-slate-100 dark:bg-gray-700 rounded-bl-none flex items-center gap-2"><span className="h-2 w-2 bg-slate-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span><span className="h-2 w-2 bg-slate-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span><span className="h-2 w-2 bg-slate-400 dark:bg-gray-500 rounded-full animate-bounce"></span></div></div>}
                    <div ref={chatEndRef} /> {/* For auto-scrolling to bottom */}
                </main>

                {/* Recommendation Chips / Action Buttons */}
                <RecommendationChips />

                {/* Chat Input / File Upload Area */}
                <footer className="p-4 border-t border-slate-200 dark:border-gray-700 flex-shrink-0">
                    {conversationContext === 'awaiting_upload' ? (
                        <label htmlFor="pdf-upload" className="flex flex-col items-center justify-center w-full p-6 border-2 border-slate-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50">
                            <FileUp className="w-10 h-10 mx-auto text-slate-400 dark:text-gray-500" />
                            <p className="mt-2 text-sm text-slate-500 dark:text-gray-400"><span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload PDF</span></p>
                            <input type="file" id="pdf-upload" accept=".pdf" onChange={(e) => handleFileUpload(e.target.files[0])} className="hidden"/>
                        </label>
                    ) : (
                        <div className="relative">
                            <input type="text" className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-gray-700 border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500" placeholder={conversationContext === 'awaiting_prompt' ? "e.g., generate 10 questions..." : "Type 'reset' to start over..."} value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleUserInput()} disabled={isProcessing} />
                            <button onClick={handleUserInput} disabled={isProcessing || !userInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-full transition-colors hover:bg-blue-700 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-gray-600"><Send size={18} /></button>
                        </div>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default AIQuizFactory;
