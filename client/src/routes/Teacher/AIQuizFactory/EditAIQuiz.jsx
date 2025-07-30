
import { ArrowLeft, Save, Tag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreadcrumbContext } from '../../../contexts/BreadcrumbContext';

const EditAIQuiz = () => {
    // --- All existing state and logic is preserved ---
    const [questions, setQuestions] = useState([]);
    const [pageTitle, setPageTitle] = useState('Edit Quiz');
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbContext();

    useEffect(() => {
        try {
            const dataString = sessionStorage.getItem('quizToEdit');
            if (dataString) {
                const data = JSON.parse(dataString);
                setQuestions(data.questions || []);
                setPageTitle(data.title || 'Edit Quiz');
            } else {
                navigate('/teacher/ai-quiz-factory');
            }
        } catch (error) {
            console.error("Failed to parse quiz data from sessionStorage", error);
            navigate('/teacher/ai-quiz-factory');
        }
        setCrumbs([
            { name: 'Add Questions', path: '/add-question' },
            { name: 'AI Quiz Factory', path: `/teacher/ai-quiz-factory` },
            { name: 'Edit Ai Generated Questions', path: `/teacher/edit-quiz` }
        ]);
    }, [navigate, setCrumbs]);

    const handleQuestionChange = (index, field, value) => {
        setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
    };
    
    const handleOptionChange = (qIndex, optIndex, newValue) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i === qIndex) {
                const newOptions = [...q.options];
                const oldVal = newOptions[optIndex];
                newOptions[optIndex] = newValue;
                const newAnswer = q.answer === oldVal ? newValue : q.answer;
                return { ...q, options: newOptions, answer: newAnswer };
            }
            return q;
        }));
    };

    const handleDeleteQuestion = (index) => {
        if (window.confirm("Are you sure you want to delete this question?")) {
            setQuestions(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSaveChanges = () => {
        const currentDataString = sessionStorage.getItem('quizToEdit');
        if (currentDataString) {
            const currentData = JSON.parse(currentDataString);
            sessionStorage.setItem('quizToEdit', JSON.stringify({ ...currentData, questions }));
        }
        navigate('/teacher/ai-quiz-factory');
    };


    // --- UI ONLY CHANGES BELOW THIS LINE ---

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <button onClick={() => navigate('/teacher/ai-quiz-factory')} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition mb-2">
                        <ArrowLeft size={16} />
                        Back to AI Factory
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
                    <p className="text-slate-500 mt-1">Modify the generated questions, options, and correct answers before saving.</p>
                </div>
                <button 
                    onClick={handleSaveChanges} 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Save size={18} />
                    Save Changes
                </button>
            </header>

            {/* Questions List */}
            <div className="space-y-6">
                {questions.map((q, i) => (
                    <div key={`q-edit-${i}`} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 pt-1">
                                Question {i + 1}
                            </h3>
                            <button onClick={() => handleDeleteQuestion(i)} className="p-2 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors" title="Delete Question">
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        {/* Form fields for a single question */}
                        <div className="space-y-5">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor={`question-text-${i}`} className="text-sm font-medium text-slate-600">Question Text</label>
                                <textarea 
                                    id={`question-text-${i}`}
                                    value={q.question || ''} 
                                    onChange={(e) => handleQuestionChange(i, 'question', e.target.value)}
                                    rows="3"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-600">Options</label>
                                <p className="text-xs text-slate-500 -mt-1">Select the radio button to mark the correct answer.</p>
                                <div className="space-y-2 mt-1">
                                    {(q.options || []).map((option, j) => (
                                        <div key={`opt-edit-${i}-${j}`} className="flex items-center gap-3 p-2 border-2 border-transparent rounded-lg bg-slate-50 focus-within:border-blue-400 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-400">
                                            <input 
                                                type="radio" 
                                                name={`answer-group-${i}`} 
                                                id={`radio-${i}-${j}`}
                                                checked={q.answer === option} 
                                                onChange={() => handleQuestionChange(i, 'answer', option)} 
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                            />
                                            <input 
                                                type="text" 
                                                value={option || ''} 
                                                onChange={(e) => handleOptionChange(i, j, e.target.value)} 
                                                className="w-full bg-transparent px-3 py-2 border-none rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                                aria-label={`Option ${j + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor={`tags-${i}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                        <Tag size={14} /> Tags
                                    </label>
                                    <input 
                                        type="text" 
                                        id={`tags-${i}`}
                                        value={q.tags || ''} 
                                        onChange={(e) => handleQuestionChange(i, 'tags', e.target.value)} 
                                        placeholder="e.g., easy, pointers"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                    />
                                </div>
                                {/* <div className="flex flex-col gap-1.5">
                                    <label htmlFor={`mark-${i}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                        <Star size={14} /> Mark
                                    </label>
                                    <input 
                                        type="number" 
                                        id={`mark-${i}`}
                                        value={q.mark || '1'} 
                                        onChange={(e) => handleQuestionChange(i, 'mark', e.target.value)} 
                                        min="1"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                    />
                                </div> */}
                            </div>
                        </div>
                    </div>
                ))}
                {questions.length === 0 && (
                    <div className="text-center py-20 text-slate-500 bg-white rounded-lg border border-slate-200">
                        <h3 className="text-xl font-semibold">No Questions to Edit</h3>
                        <p className="mt-2">Please return to the AI Factory to generate questions first.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditAIQuiz;