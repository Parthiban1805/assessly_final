import React from 'react';
import { Check, X } from 'lucide-react';

const AnswerBreakdown = ({ results }) => {
  // If there are no results, don't render anything.
    if (!results || results.length === 0) {
        return <p className="text-center text-slate-500 py-10">No detailed answer breakdown is available.</p>;
    }

    const showMarkColumn = results.some(item => item.mark !== undefined && item.mark !== null);

    return ( 
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="px-6 py-4 text-xs font-semibold text-blue-500 uppercase tracking-wider">
                Answer Breakdown
            </h3>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-slate-50">
                <tr>
                    <th className="px-6 py-3 text-left font-semibold text- text-slate-600 uppercase tracking-wider">Question</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Your Answer</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Correct Answer</th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    {showMarkColumn && (
                        <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">Mark</th>
                    )}
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                {results.map((item) => (
                    <tr key={item.questionId}>
                    <td className="px-6 py-4 text-slate-700">{item.question}</td>
                    <td className={`px-6 py-4 font-medium ${item.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {item.selectedAnswer || <span className="italic text-slate-500">(Not Answered)</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-700">{item.correctAnswer}</td>
                    <td className="px-6 py-4 text-center">
                        {item.isCorrect ? 
                        <Check size={20} className="mx-auto text-green-600"/> : 
                        <X size={20} className="mx-auto text-red-600"/>
                        }
                    </td>
                    {showMarkColumn && (
                        <td className="px-6 py-4 text-center font-semibold">
                        <span className={item.isCorrect ? 'text-slate-800' : 'text-slate-500'}>
                            {/* If correct, show the full mark. If not, show 0. */}
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