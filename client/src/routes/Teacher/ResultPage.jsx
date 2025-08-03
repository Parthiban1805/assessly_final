import axios from 'axios';
import html2canvas from 'html2canvas'; // HTML to canvas rendering library
import jsPDF from 'jspdf'; // PDF generation library
import { ArrowLeft, Download } from 'lucide-react'; // Icons for navigation and download
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../components/Loader'; // Global loading spinner
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext'; // Breadcrumb context hook
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * InlineSpinner component for displaying a small, animated loading spinner within a button.
 * @returns {JSX.Element} The inline spinner UI.
 */
const InlineSpinner = () => (
    <div className="w-4 h-4 border-2 border-white border-solid rounded-full border-t-transparent animate-spin"></div>
);

/**
 * ResultPage component for teachers to view a specific student's assessment results.
 * It displays performance summary, detailed answer breakdown, and AI-generated feedback.
 * Teachers can also download the results as a PDF.
 *
 * @returns {JSX.Element} The teacher's view of student assessment results.
 */
const ResultPage = () => {
    const { studentId, assessmentId } = useParams(); // Get student ID and assessment ID from URL parameters.
    const navigate = useNavigate(); // Hook for programmatic navigation.

    // State to store the fetched result data (summary, stats, answer breakdown).
    const [resultData, setResultData] = useState(null);
    // State to manage overall loading status.
    const [isLoading, setIsLoading] = useState(true);
    // State to indicate if PDF download is in progress.
    const [isDownloading, setIsDownloading] = useState(false);
    // State to store any error messages during data fetching.
    const [error, setError] = useState(null);
    // State to store assessment details.
    const [assessmentDetails, setAssessmentDetails] = useState(null);
    // State to store AI-generated feedback.
    const [feedback, setFeedback] = useState('');
    // State to indicate if feedback generation is in progress.
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const pdfContentRef = useRef(null); // Ref to target the content area for PDF generation.
    const { setCrumbs } = useBreadcrumbContext(); // Context hook to set breadcrumbs.

    /**
     * Effect hook to fetch assessment result data and assessment details on component mount.
     * Also triggers AI feedback generation. Handles authentication and data fetching errors.
     */
    useEffect(() => {
        const fetchResultAndAssessmentData = async () => {
            try {
                setIsLoading(true); // Start loading state.
                setError(null); // Clear previous errors.

                const token = sessionStorage.getItem('token');
                if (!token) {
                    setError("Authentication token not found. Please log in.");
                    setIsLoading(false);
                    navigate('/login'); // Redirect on authentication failure.
                    return;
                }

                // Determine the correct API URL: it always needs both studentId and assessmentId for teacher's view.
                const fetchUrl = `${API_BASE_URL}/results/${studentId}/${assessmentId}`;

                console.log("[ResultPage] Fetching results from URL:", fetchUrl);

                // Fetch result data (containing result, assessment, and stats objects).
                const response = await axios.get(fetchUrl, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });

                // The backend `results.service.js` returns an object like { result: {...}, assessment: {...}, stats: {...} }.
                setResultData(response.data); // Set the entire response data to resultData state.

                // Directly use the assessment details from the response for the assessmentDetails state.
                setAssessmentDetails(response.data.assessment);

                // Set breadcrumbs dynamically after data is loaded.
                setCrumbs([
                    { name: 'Assessment & Results', path: '/assessment-results' },
                    { name: `${response.data.assessment.name}`, path: `/teacher-dashboard/students/${studentId}/${assessmentId}` }
                ]);

                setIsLoading(false); // End loading state.

                // Call generateFeedback ONLY if result and its results array are valid.
                if (response.data.result && Array.isArray(response.data.result.results)) {
                    await generateFeedback(response.data.result); // Pass the 'result' object directly.
                } else {
                    console.warn("Result data or results array is not valid for feedback generation:", response.data);
                    setFeedback("Could not generate feedback due to invalid result data.");
                }

            } catch (err) {
                console.error('Error fetching data for ResultPage:', err.response?.data || err.message);
                setError(
                    err.response?.data?.message ||
                    'Failed to fetch the result. Please ensure it was submitted and try again later.'
                );
                setIsLoading(false);
            }
        };

        fetchResultAndAssessmentData();

    }, [studentId, assessmentId, navigate, setCrumbs]); // Dependencies: IDs, navigate, and setCrumbs.

    /**
     * Generates personalized feedback for the student's assessment performance using an AI service.
     * @param {object} studentResult - The student's result object containing `results` (question-level data).
     */
    const generateFeedback = async (studentResult) => {
        try {
            setFeedbackLoading(true); // Indicate feedback generation is in progress.

            const token = sessionStorage.getItem('token');
            if (!token) {
                console.error("[Feedback Gen] No token found for feedback request. Skipping AI feedback.");
                setFeedback('Unable to generate personalized feedback: authentication missing.');
                setFeedbackLoading(false);
                return;
            }

            // Ensure studentResult.results is an array before mapping.
            if (!studentResult || !Array.isArray(studentResult.results)) {
                console.error("[Feedback Gen] Invalid studentResult received for feedback generation.");
                setFeedback('Unable to generate personalized feedback: invalid result data.');
                setFeedbackLoading(false);
                return;
            }

            // Map relevant question stats for the AI feedback request.
            const questionStats = studentResult.results.map(item => ({
                question: item.question,
                selectedAnswer: item.selectedAnswer || '(No answer)', // Default for consistency.
                correctAnswer: item.correctAnswer,
                timeTakenSec: item.timeTakenSec || 0, // Assume 0 if time taken is missing.
                topic: item.topic || 'General' // Assume 'General' topic if missing.
            }));

            // Make the API call to the backend's feedback endpoint.
            const feedbackResponse = await axios.post(
                `${API_BASE_URL}/feedback`, // Use the common API_BASE_URL.
                {
                    studentId: studentResult.studentId, // Pass student ID.
                    questionStats: questionStats // Pass detailed question performance.
                },
                {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                }
            );

            setFeedback(feedbackResponse.data.feedback); // Set the AI-generated feedback.
        } catch (err) {
            console.error('Error generating feedback (AI call):', err.response?.data || err.message);
            setFeedback('Unable to generate personalized feedback at this time.'); // Generic error message.
        } finally {
            setFeedbackLoading(false); // End feedback loading state.
        }
    };

    /**
     * Handles the PDF download process.
     * Captures the content of the `pdfContentRef` div and converts it to a PDF.
     */
    const handleDownloadPdf = () => {
        const input = pdfContentRef.current;
        if (!input) return; // Ensure the target element exists.

        setIsDownloading(true); // Set downloading state.
        // Use html2canvas to render the HTML content to a canvas.
        // Scale is increased for better quality in the PDF.
        html2canvas(input, { scale: 2, useCORS: true })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/png'); // Get image data from canvas.

                // Initialize jsPDF with A4 dimensions.
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const canvasAspectRatio = canvasWidth / canvasHeight;

                // Calculate image dimensions to fit PDF page while maintaining aspect ratio.
                let imgWidth = pdfWidth;
                let imgHeight = pdfWidth / canvasAspectRatio;

                let heightLeft = imgHeight; // Track remaining content height.
                let position = 0; // Vertical position on the PDF page.

                // Add the first page.
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;

                // Add subsequent pages if content exceeds one page.
                while (heightLeft > 0) {
                    position = heightLeft - imgHeight; // Calculate position for next page.
                    pdf.addPage(); // Add a new PDF page.
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }

                // Generate a safe file name for the PDF.
                const assessmentName = resultData?.assessment?.name || 'assessment';
                const safeFileName = assessmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

                pdf.save(`results-${safeFileName}.pdf`); // Save the PDF.
            })
            .catch(err => {
                console.error("Could not generate PDF", err);
                // Optionally display an error message to the user here.
            })
            .finally(() => {
                setIsDownloading(false); // Reset downloading state.
            });
    };

    // Display global loading spinner.
    if (isLoading) return <Loader/>;

    // Display error message if data fetching failed.
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
                    <p className="text-gray-700 dark:text-gray-200 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Safely access properties from `resultData`.
    const result = resultData?.result;
    const stats = resultData?.stats;

    // Calculate statistics based on fetched data, safely handling null/undefined.
    const totalQuestions = result?.results?.length || 0;
    const correctAnswers = result?.results?.filter(item => item.isCorrect).length || 0;
    const percentageScore = stats?.percentageScore ?? 0; // Use stats.percentageScore if available.

    return (
        <div className="max-w-7xl mx-auto min-h-screen">
            {/* Content to be included in the PDF download, wrapped by the ref. */}
            <div ref={pdfContentRef} className="max-w-6xl mx-auto px-4 sm:px-4 lg:px-8">
                {/* Header Section */}
                <div className="border-b border-slate-200 dark:border-gray-700 pb-3 mb-4">
                    <p className="text-slate-700 dark:text-gray-200 font-semibold text-xl mt-1">{assessmentDetails.name}</p>
                </div>

                {/* Summary Cards - Conditionally rendered if resultData and stats are available */}
                {resultData && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Student ID Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-4 flex flex-col">
                            <h4 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Student ID</h4>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.studentId}</p>
                        </div>

                        {/* Total Score Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-4 flex flex-col">
                            <h4 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Total Score</h4>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.totalMarks}/{stats.totalPossibleMarks} <span className="text-sm text-gray-600 dark:text-gray-300">({percentageScore}%)</span></p>
                        </div>

                        {/* Status Card */}
                        <div className='bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-4 flex flex-col'>
                            <h4 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Status</h4>
                            <p className={`text-lg font-semibold ${result.status_com === 'Pass' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {result.status_com}
                            </p>
                        </div>
                    </div>
                )}

                {/* Detailed Results Table - Conditionally rendered if results array is valid and not empty */}
                {result && Array.isArray(result.results) && result.results.length > 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 mb-8">
                        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Detailed Results</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Question</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Correct Answer</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Answer</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mark</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {result.results.map((item) => (
                                        <tr key={item.questionId} className={`hover:bg-opacity-75 transition-colors hover:bg-slate-50 dark:hover:bg-gray-700/50`}>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.question}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">{item.correctAnswer}</td>
                                            <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${item.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {item.selectedAnswer || '(No answer)'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    item.isCorrect
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                }`}>
                                                    {item.isCorrect ? 'Correct' : 'Incorrect'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {item.isCorrect ? item.mark : '0'}/{item.mark}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    resultData && !isLoading && !error && <p className="text-gray-500 dark:text-gray-400 text-center py-4">No detailed results to display.</p>
                )}

                {/* AI-Generated Feedback Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 mb-8">
                    <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Personalized Feedback</h3>
                    </div>
                    <div className="px-4 py-4">
                        {feedbackLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mr-3"></div>
                                <p className="text-gray-600 dark:text-gray-300">Generating personalized feedback...</p>
                            </div>
                        ) : (
                            <div className="text-gray-700 dark:text-gray-200 leading-relaxed">
                                <p>{feedback || 'No feedback available.'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="w-full sm:w-44 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isDownloading ? (
                            <>
                                <InlineSpinner />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                <span>Download PDF</span>
                            </>
                        )}
                    </button>
                    <button onClick={() => navigate('/teacher-dashboard')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResultPage;
