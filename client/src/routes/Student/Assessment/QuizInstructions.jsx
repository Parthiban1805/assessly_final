import { Play } from 'lucide-react'; // Icon for play button
import { useNavigate, useParams } from 'react-router-dom';

/**
 * QuizInstructions component displays important instructions for taking an assessment.
 * It guides the user before they proceed to the proctoring verification step.
 *
 * @returns {JSX.Element} The assessment instructions UI.
 */
const QuizInstructions = () => {
    const navigate = useNavigate(); // Hook for programmatic navigation
    const { assessmentId } = useParams(); // Get assessment ID from URL parameters

    /**
     * Navigates the user to the proctoring verification page for the assessment.
     */
    const handleStartQuiz = () => {
        navigate(`/assessment/${assessmentId}/verificationPage`);
    };

    /**
     * Reusable component for displaying individual instruction items.
     * @param {object} props - Component props.
     * @param {number} props.number - The instruction number.
     * @param {string} props.text - The instruction text.
     * @returns {JSX.Element} A single instruction item.
     */
    const InstructionItem = ({ number, text }) => (
        <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold rounded-full">
            {number}
        </div>
        <p className="text-slate-600 dark:text-gray-300 leading-relaxed pt-1">{text}</p>
        </div>
    );

    return (
        <div className="flex items-center justify-center min-h-[90vh] bg-slate-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 sm:p-10">
            <div>
            <h1 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700 flex-shrink-0">Assessment Instructions</h1>
            <p className="text-slate-500 dark:text-gray-400 mt-2">Please read the following instructions carefully before you begin.</p>
            </div>

            {/* List of instructions */}
            <div className="my-8 space-y-5">
            <InstructionItem number="1" text="Once you start the quiz, a timer will begin and cannot be paused." />
            <InstructionItem number="2" text="Answer all questions to the best of your ability. There is no penalty for incorrect answers." />
            <InstructionItem number="3" text="You can navigate between questions using the 'Next' and 'Previous' buttons." />
            <InstructionItem number="4" text="Your answers are automatically saved as you move between questions." />
            <InstructionItem number="5" text="Click the 'Submit' button only when you have completed all questions and are ready to finish." />
            </div>

            {/* Action buttons */}
            <div className="pt-6 border-t border-slate-200 dark:border-gray-700 flex flex-col sm:flex-row-reverse gap-4">
            <button
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleStartQuiz}
            >
                <Play size={18} /> Start Assessment
            </button>
            <button
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300"
                onClick={() => navigate(-1)} // Navigate back to the previous page
            >
                Cancel
            </button>
            </div>
        </div>
        </div>
    );
};

export default QuizInstructions;
