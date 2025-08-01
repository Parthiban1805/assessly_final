import { ArrowLeft, Save, Tag, Trash2 } from 'lucide-react'; // Icons for navigation, save, tag, delete
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreadcrumbContext } from '../../../contexts/BreadcrumbContext'; // Breadcrumb context hook

/**
 * EditAIQuiz component allows teachers to modify AI-generated quiz questions,
 * including question text, options, correct answers, and tags.
 * Questions data is retrieved from and saved back to session storage.
 *
 * @returns {JSX.Element} The AI-generated quiz editing UI.
 */
const EditAIQuiz = () => {
    // State to store the list of questions being edited.
    const [questions, setQuestions] = useState([]);
    // State to store the title of the editing page.
    const [pageTitle, setPageTitle] = useState('Edit Quiz');
    const navigate = useNavigate(); // Hook for programmatic navigation.
    const { setCrumbs } = useBreadcrumbContext(); // Hook to set breadcrumbs.

    /**
     * Effect hook to load quiz data from session storage on component mount.
     * If no data is found, redirects back to the AI Quiz Factory.
     * Also sets the breadcrumbs.
     */
    useEffect(() => {
        try {
            const dataString = sessionStorage.getItem('quizToEdit');
            if (dataString) {
                const data = JSON.parse(dataString);
                setQuestions(data.questions || []); // Set questions, ensuring it's an array.
                setPageTitle(data.title || 'Edit Quiz'); // Set page title.
            } else {
                // If no data is found, redirect to the AI Quiz Factory.
                navigate('/teacher/ai-quiz-factory');
            }
        } catch (error) {
            console.error("Failed to parse quiz data from sessionStorage", error);
            // On parsing error, also redirect.
            navigate('/teacher/ai-quiz-factory');
        }
        // Set breadcrumbs specific to this view.
        setCrumbs([
            { name: 'Add Questions', path: '/add-question' },
            { name: 'AI Quiz Factory', path: `/teacher/ai-quiz-factory` },
            { name: 'Edit AI Generated Questions', path: `/teacher/edit-quiz` }
        ]);
    }, [navigate, setCrumbs]); // Dependencies: navigate (for redirection), setCrumbs (for breadcrumbs).

    /**
     * Handles changes to a specific field of a question (e.g., question text, tags, mark).
     * @param {number} index - The index of the question in the `questions` array.
     * @param {string} field - The name of the field to update ('question', 'tags', 'mark').
     * @param {string|number} value - The new value for the field.
     */
    const handleQuestionChange = (index, field, value) => {
        setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
    };

    /**
     * Handles changes to a specific option of a question.
     * Also updates the `answer` field if the modified option was the correct one.
     * @param {number} qIndex - The index of the question.
     * @param {number} optIndex - The index of the option within that question.
     * @param {string} newValue - The new text for the option.
     */
    const handleOptionChange = (qIndex, optIndex, newValue) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i === qIndex) {
                const newOptions = [...q.options];
                const oldVal = newOptions[optIndex]; // Store old value to check if it was the correct answer.
                newOptions[optIndex] = newValue; // Update the option text.

                // If the old option was the correct answer, update `answer` to the new value.
                const newAnswer = q.answer === oldVal ? newValue : q.answer;
                return { ...q, options: newOptions, answer: newAnswer };
            }
            return q;
        }));
    };

    /**
     * Handles the deletion of a question after user confirmation.
     * @param {number} index - The index of the question to delete.
     */
    const handleDeleteQuestion = (index) => {
        if (window.confirm("Are you sure you want to delete this question? This action cannot be undone.")) {
            setQuestions(prev => prev.filter((_, i) => i !== index)); // Filter out the deleted question.
        }
    };

    /**
     * Saves the current edited questions back to session storage and navigates to the AI Quiz Factory.
     */
    const handleSaveChanges = () => {
        const currentDataString = sessionStorage.getItem('quizToEdit');
        if (currentDataString) {
            const currentData = JSON.parse(currentDataString);
            // Overwrite the questions with the modified list and save back to session storage.
            sessionStorage.setItem('quizToEdit', JSON.stringify({ ...currentData, questions }));
        }
        navigate('/teacher/ai-quiz-factory'); // Navigate back to the factory.
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    {/* Button to navigate back to the AI Quiz Factory. */}
                    <button onClick={() => navigate('/teacher/ai-quiz-factory')} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-slate-800 dark:hover:text-white transition mb-2">
                        <ArrowLeft size={16} />
                        Back to AI Factory
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{pageTitle}</h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-1">Modify the generated questions, options, and correct answers before saving.</p>
                </div>
                {/* Button to save changes. */}
                <button
                    onClick={handleSaveChanges}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-sm"
                >
                    <Save size={18} />
                    Save Changes
                </button>
            </header>

            {/* Questions List for Editing */}
            <div className="space-y-6">
                {questions.map((q, i) => (
                    <div key={`q-edit-${i}`} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white pt-1">
                                Question {i + 1}
                            </h3>
                            {/* Button to delete the current question. */}
                            <button onClick={() => handleDeleteQuestion(i)} className="p-2 text-slate-500 dark:text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300 rounded-md transition-colors" title="Delete Question">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Form fields for a single question */}
                        <div className="space-y-5">
                            {/* Question Textarea */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor={`question-text-${i}`} className="text-sm font-medium text-slate-600 dark:text-gray-300">Question Text</label>
                                <textarea
                                    id={`question-text-${i}`}
                                    value={q.question || ''}
                                    onChange={(e) => handleQuestionChange(i, 'question', e.target.value)}
                                    rows="3"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
                                />
                            </div>

                            {/* Options Input Fields with Radio Buttons */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-600 dark:text-gray-300">Options</label>
                                <p className="text-xs text-slate-500 dark:text-gray-400 -mt-1">Select the radio button to mark the correct answer.</p>
                                <div className="space-y-2 mt-1">
                                    {(q.options || []).map((option, j) => (
                                        <div key={`opt-edit-${i}-${j}`} className="flex items-center gap-3 p-2 border-2 border-transparent rounded-lg bg-slate-50 dark:bg-gray-700 focus-within:border-blue-400 dark:focus-within:border-blue-500 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900 has-[:checked]:border-blue-400 dark:has-[:checked]:border-blue-500">
                                            <input
                                                type="radio"
                                                name={`answer-group-${i}`} // Group radio buttons by question.
                                                id={`radio-${i}-${j}`}
                                                checked={q.answer === option} // Check if this option is the current correct answer.
                                                onChange={() => handleQuestionChange(i, 'answer', option)} // Update correct answer on radio selection.
                                                className="w-4 h-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 flex-shrink-0 bg-white dark:bg-gray-800"
                                            />
                                            <input
                                                type="text"
                                                value={option || ''}
                                                onChange={(e) => handleOptionChange(i, j, e.target.value)}
                                                className="w-full bg-transparent px-3 py-2 border-none rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-slate-900 dark:text-white"
                                                aria-label={`Option ${j + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tags Input Field */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-gray-700">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor={`tags-${i}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-gray-300">
                                        <Tag size={14} /> Tags
                                    </label>
                                    <input
                                        type="text"
                                        id={`tags-${i}`}
                                        value={q.tags || ''}
                                        onChange={(e) => handleQuestionChange(i, 'tags', e.target.value)}
                                        placeholder="e.g., easy, pointers"
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
                                    />
                                </div>
                                {/* Mark Input (currently commented out in original, keeping it that way) */}
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
                {/* Empty state: Displayed when no questions are available for editing. */}
                {questions.length === 0 && (
                    <div className="text-center py-20 text-slate-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
                        <h3 className="text-xl font-semibold">No Questions to Edit</h3>
                        <p className="mt-2">Please return to the AI Factory to generate questions first.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditAIQuiz;
