import React from 'react';
import { Check, X } from 'lucide-react';

/**
 * AnswerBreakdown component displays a detailed breakdown of a student's answers
 * for an assessment, showing correct answers, selected answers, and status.
 * It also conditionally shows a mark column if mark data is available.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.results - An array of answer objects, each containing:
 *   - {string} questionId - Unique identifier for the question.
 *   - {string} question - The text of the question.
 *   - {string} selectedAnswer - The answer selected by the user.
 *   - {string} correctAnswer - The correct answer for the question.
 *   - {boolean} isCorrect - True if the selected answer is correct, false otherwise.
 *   - {number} [mark] - The maximum possible mark for the question (optional).
 * @returns {JSX.Element|null} The answer breakdown table or a message if no results.
 */
const AnswerBreakdown = ({ results }) => {
  // If no results are provided or the array is empty, display a placeholder message.
    if (!results || results.length === 0) {
        return <p className="text-center text-slate-500 dark:text-gray-400 py-10">No detailed answer breakdown is available.</p>;
    }

    // Determine if the 'Mark' column should be displayed based on data availability.
    // The column is shown if at least one item has a 'mark' property defined and not null.
    const showMarkColumn = results.some(item => item.mark !== undefined && item.mark !== null);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <h3 className="px-6 py-4 text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">
                Answer Breakdown
            </h3>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-gray-700">
                <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Question</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Your Answer</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Correct Answer</th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    {showMarkColumn && (
                        <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Mark</th>
                    )}
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                {results.map((item) => (
                    <tr key={item.questionId} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-slate-700 dark:text-gray-200">{item.question}</td>
                    <td className={`px-6 py-4 font-medium ${item.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {item.selectedAnswer || <span className="italic text-slate-500 dark:text-gray-400">(Not Answered)</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-700 dark:text-blue-400">{item.correctAnswer}</td>
                    <td className="px-6 py-4 text-center">
                        {item.isCorrect ?
                        <Check size={20} className="mx-auto text-green-600 dark:text-green-400"/> :
                        <X size={20} className="mx-auto text-red-600 dark:text-red-400"/>
                        }
                    </td>
                    {showMarkColumn && (
                        <td className="px-6 py-4 text-center font-semibold">
                        <span className={item.isCorrect ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-gray-400'}>
                            {/* Display obtained marks (0 if incorrect) out of total possible marks. */}
                            {item.isCorrect ? item.mark : 0} / {item.mark}
                        </span>
                        </td>
                    )}
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
    );
};

export default AnswerBreakdown;