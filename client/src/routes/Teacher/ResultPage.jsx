import axios from 'axios';
// Using Lucide-React for consistency as seen in other files
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf'; // Step 1: Import jspdf
import { ArrowLeft, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react'; // Ensure React is imported
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../components/Loader';
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext';

const API_BASE_URL = 'http://localhost:5000/api/v1'; // Define API base URL

const InlineSpinner = () => (
    <div className="w-4 h-4 border-2 border-white border-solid rounded-full border-t-transparent animate-spin"></div>
);

const ResultPage = () => {
    const { studentId, assessmentId } = useParams();
    const navigate = useNavigate();

    const [resultData, setResultData] = useState(null); // Renamed from 'result' to 'resultData' to avoid confusion with result.results
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);
    const [assessmentDetails, setAssessmentDetails] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const pdfContentRef = useRef(null);
    const { setCrumbs } = useBreadcrumbContext();

    // This console.log is for debugging only, you can remove it
    // console.log("Frontend useParams - studentId:", studentId, "assessmentId:", assessmentId);

    useEffect(() => {
        const fetchResultAndAssessmentData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const token = sessionStorage.getItem('token');
                if (!token) {
                    setError("Authentication token not found. Please log in.");
                    setIsLoading(false);
                    navigate('/login'); // Redirect on auth failure
                    return;
                }

                // Determine the correct API URL based on whether studentId is present in params
                const fetchUrl = studentId 
                    ? `${API_BASE_URL}/results/${studentId}/${assessmentId}`
                    : `${API_BASE_URL}/results/${assessmentId}`;

                console.log("[ResultPage] Fetching results from URL:", fetchUrl);

                // Fetch result data (containing result, assessment, and stats objects)
                const response = await axios.get(fetchUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                // The backend `results.service.js` returns an object like { result: {...}, assessment: {...}, stats: {...} }
                // So, set the entire response data to resultData state
                setResultData(response.data);
                
                // Directly use the assessment details from the response for the assessmentDetails state
                setAssessmentDetails(response.data.assessment);

                setCrumbs([
                    { name: 'Assessment & Results', path: '/assessment-results' },
                    { name: `${response.data.assessment.name}`, path: `/teacher-dashboard/results/${studentId}/${assessmentId}` }
                ]);
                
                setIsLoading(false);

                // Call generateFeedback ONLY if result and its results array are valid
                if (response.data.result && Array.isArray(response.data.result.results)) {
                    await generateFeedback(response.data.result); // Pass the 'result' object directly
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
        
    }, [studentId, assessmentId, navigate]); // Add navigate to dependencies

    const generateFeedback = async (studentResult) => { // Accept the `result` object directly
        try {
            setFeedbackLoading(true);
            
            const token = sessionStorage.getItem('token');
            if (!token) {
                console.error("[Feedback Gen] No token found for feedback request. Skipping AI feedback.");
                setFeedback('Unable to generate personalized feedback: authentication missing.');
                setFeedbackLoading(false);
                return;
            }

            // Ensure studentResult.results is an array before mapping
            if (!studentResult || !Array.isArray(studentResult.results)) {
                console.error("[Feedback Gen] Invalid studentResult received for feedback generation.");
                setFeedback('Unable to generate personalized feedback: invalid result data.');
                setFeedbackLoading(false);
                return;
            }

            const questionStats = studentResult.results.map(item => ({
                question: item.question,
                selectedAnswer: item.selectedAnswer || '(No answer)', // Default for consistency
                correctAnswer: item.correctAnswer,
                timeTakenSec: item.timeTakenSec || 0, // Assuming timeTakenSec might be missing
                topic: item.topic || 'General' // Assuming topic might be missing
            }));

            // Make the call to your backend's feedback API
            const feedbackResponse = await axios.post(
                `${API_BASE_URL}/feedback`, // Use API_BASE_URL
                {
                    studentId: studentResult.studentId,
                    questionStats: questionStats
                },
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            setFeedback(feedbackResponse.data.feedback);
        } catch (err) {
            console.error('Error generating feedback (AI call):', err.response?.data || err.message);
            setFeedback('Unable to generate personalized feedback at this time.');
        } finally {
            setFeedbackLoading(false);
        }
    };

    const handleDownloadPdf = () => {
        const input = pdfContentRef.current;
        if (!input) return;

        setIsDownloading(true);
        // Use html2canvas to capture the content. We increase the scale for better quality.
        html2canvas(input, { scale: 2, useCORS: true })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                
                // A4 page dimensions in mm: 210 x 297
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const canvasAspectRatio = canvasWidth / canvasHeight;

                const pdfAspectRatio = pdfWidth / pdfHeight;

                let imgWidth = pdfWidth;
                let imgHeight = pdfWidth / canvasAspectRatio;

                // Handle content that might be longer than one page
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }

                const assessmentName = resultData?.assessment?.name || 'assessment';
                const safeFileName = assessmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

                pdf.save(`results-${safeFileName}.pdf`);
            })
            .catch(err => {
                console.error("Could not generate PDF", err);
                // Optionally show an error message to the user
            })
            .finally(() => {
                setIsDownloading(false);
            });
    };

    if (isLoading) return <Loader/>;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-700 mb-6">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Safely access properties from resultData
    const result = resultData?.result;
    const stats = resultData?.stats;

    // Calculate statistics based on fetched data, safely handling null/undefined
    const totalQuestions = result?.results?.length || 0;
    const correctAnswers = result?.results?.filter(item => item.isCorrect).length || 0;
    const percentageScore = stats?.percentageScore ?? 0; // Use stats.percentageScore if available

    return (
        <div className="max-w-7xl mx-auto min-h-screen">
            <div ref={pdfContentRef} className="max-w-6xl mx-auto px-4 sm:px-4 lg:px-8">
                {/* Header */}
                <div className="border-b border-slate-200 pb-3 mb-4">
                    <p className="text-slate-700 font-semibold text-xl mt-1">{assessmentDetails.name}</p>
                </div>

                {/* Summary Cards - Conditionally render if resultData and stats are available */}
                {resultData && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Student ID Card */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col">
                            <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Student ID</h4>
                            <p className="text-lg font-semibold text-gray-900">{result.studentId}</p>
                        </div>
                        
                        {/* Total Score Card */}
                        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col">
                            <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Total Score</h4>
                            <p className="text-lg font-semibold text-gray-900">{result.totalMarks}/{stats.totalPossibleMarks} <span className="text-sm text-gray-600">({percentageScore}%)</span></p> {/* Use stats.totalPossibleMarks */}
                        </div>
                        
                        {/* Status Card */}
                        <div className='bg-white rounded-lg border border-slate-200 p-4 flex flex-col'>
                            <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Status</h4>
                            <p className={`text-lg font-semibold ${result.status_com === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>
                                {result.status_com}
                            </p>
                        </div>
                    </div>
                )}

                {/* Detailed Results - Conditionally render if result and its results array are valid */}
                {result && Array.isArray(result.results) && result.results.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 mb-8">
                        <div className="px-4 py-4 border-b border-gray-200">
                            <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Detailed Results</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct Answer</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Answer</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mark</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {result.results.map((item) => (
                                        <tr key={item.questionId} className={`hover:bg-opacity-75 transition-colors`}>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.question}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">{item.correctAnswer}</td>
                                            <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${item.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.selectedAnswer || '(No answer)'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    item.isCorrect 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {item.isCorrect ? 'Correct' : 'Incorrect'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {item.isCorrect ? item.mark : '0'}/{item.mark}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    resultData && !isLoading && !error && <p className="text-gray-500 text-center py-4">No detailed results to display.</p>
                )}

                {/* AI-Generated Feedback Section */}
                <div className="bg-white rounded-lg border border-slate-200 mb-8">
                    <div className="px-4 py-4 border-b border-gray-200">
                        <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Personalized Feedback</h3>
                    </div>
                    <div className="px-4 py-4">
                        {feedbackLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                                <p className="text-gray-600">Generating personalized feedback...</p>
                            </div>
                        ) : (
                            <div className="text-gray-700 leading-relaxed">
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
                        className="w-full sm:w-44 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 disabled:opacity-70 disabled:cursor-wait"
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
                    <button onClick={() => navigate('/teacher-dashboard')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-semibold hover:bg-slate-300 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResultPage;