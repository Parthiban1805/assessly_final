import axios from 'axios';
import jsPDF from 'jspdf'; // PDF generation library
import html2canvas from 'html2canvas'; // HTML to canvas rendering library
import {
    AlertTriangle, ArrowLeft,
    Download
} from 'lucide-react'; // Icons for alerts, back, and download
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../../components/Loader'; // Global loading spinner
import AnswerBreakdown from '../../../components/AnswerBreakdown'; // Component to display answer details
import { useBreadcrumbContext } from '../../../contexts/BreadcrumbContext'; // Context for breadcrumbs
import { API_BASE_URL } from '../../../config/constants'; // Import the common API base URL

/**
 * InlineSpinner component for displaying a small, animated loading spinner within a button.
 * @returns {JSX.Element} The inline spinner UI.
 */
const InlineSpinner = () => (
    <div className="w-4 h-4 border-2 border-white border-solid rounded-full border-t-transparent animate-spin"></div>
);

/**
 * ResultPage component displays the detailed results of a student's assessment.
 * It includes performance summary, a breakdown of answers, and the ability to download results as a PDF.
 *
 * @returns {JSX.Element} The assessment results UI.
 */
const ResultPage = () => {
    const { assessmentId } = useParams(); // Get assessment ID from URL parameters
    const navigate = useNavigate(); // Hook for programmatic navigation

    // State to store the fetched result data (summary, stats, answer breakdown).
    const [resultData, setResultData] = useState(null);
    // State to manage overall loading status.
    const [isLoading, setIsLoading] = useState(true);
    // State to indicate if PDF download is in progress.
    const [isDownloading, setIsDownloading] = useState(false);
    // State to store any error messages during data fetching.
    const [error, setError] = useState(null);
    const { setCrumbs } = useBreadcrumbContext(); // Context hook to set breadcrumbs.
    const pdfContentRef = useRef(null); // Ref to target the content area for PDF generation.

    /**
     * Effect hook to fetch assessment result data on component mount.
     * Sets breadcrumbs based on the fetched assessment name.
     */
    useEffect(() => {
        const fetchResultPageData = async () => {
            setIsLoading(true); // Start loading state.
            try {
                const token = sessionStorage.getItem("token");
                // If no token, log error and navigate to login (though ProtectedRoute should handle this).
                if (!token) {
                    console.error("Authentication token not found.");
                    navigate('/login');
                    return;
                }
                // Fetch result data from the API.
                const response = await axios.get(`${API_BASE_URL}/results/${assessmentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });
                setResultData(response.data); // Set fetched result data.

                // Set breadcrumbs dynamically after data is loaded.
                setCrumbs([
                    { name: 'Assessments', path: '/assessments' },
                    { name: `Results (${response.data.assessment.name})`, path: `/results/${assessmentId}` }
                ]);
            } catch (err) {
                // Set error message from API response or a generic one.
                setError(err.response?.data?.message || 'Failed to load results.');
            } finally {
                setIsLoading(false); // End loading state.
            }
        };
        fetchResultPageData();

        // Cleanup function for useEffect: reset breadcrumbs when component unmounts.
        return () => {
            setCrumbs([]);
        };
    }, [assessmentId, navigate, setCrumbs]); // Dependencies: assessmentId, navigate, setCrumbs.

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
    if (isLoading) return <Loader />;

    // Display error message if data fetching failed.
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-md text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-red-200 dark:border-red-700">
                    <AlertTriangle className="mx-auto w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
                    <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">Error Loading Results</h2>
                    <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
                    <button onClick={() => navigate(-1)} className="mt-6 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 dark:hover:bg-red-500">Go Back</button>
                </div>
            </div>
        );
    }

    // If no result data is found after loading, display a message.
    if (!resultData) return <div className="p-6 text-center text-slate-500 dark:text-gray-400">No result data found.</div>;

    // Destructure relevant data from `resultData`.
    const { result, assessment, stats } = resultData;
    // Safely access properties, providing fallbacks.
    const totalPossibleMarks = stats?.totalPossibleMarks ?? 0;
    const percentageScore = stats?.percentageScore ?? 0;
    const isPass = percentageScore >= 40; // Pass/Fail threshold.
    const incorrectAnswers = (stats?.totalQuestions ?? 0) - (stats?.correctAnswers ?? 0);

    /**
     * Helper component for displaying individual statistics items.
     * @param {object} props - Component props.
     * @param {string} props.label - The label for the statistic.
     * @param {string|number} props.value - The value of the statistic.
     * @param {string} [props.valueClass] - Optional Tailwind CSS class for value styling.
     * @param {React.ReactNode} [props.children] - Child elements to render as the value.
     * @returns {JSX.Element} A single statistic item.
     */
    const StatItem = ({ label, value, valueClass = 'text-slate-800 dark:text-white', children }) => (
        <div className="text-center px-4">
            <p className="text-sm text-slate-500 dark:text-gray-400 uppercase">{label}</p>
            <div className={`text-xl font-semibold ${valueClass}`}>
                {children || value}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Content to be included in the PDF download, wrapped by the ref. */}
            <div ref={pdfContentRef}>
                {/* Header Section */}
                <div className="border-b border-slate-200 dark:border-gray-700 pb-4">
                    <p className="text-slate-700 dark:text-gray-200 font-semibold text-xl mt-1">{assessment.name}</p>
                </div>

                {/* Performance Summary Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm mt-8">
                    <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-6">
                        Performance Summary
                    </h3>

                    <div className="flex flex-wrap items-center justify-center lg:justify-between gap-y-6 gap-x-4">
                        {/* Total Score */}
                        <StatItem label="Total Score"><p>{result.totalMarks} / {totalPossibleMarks}</p></StatItem>
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700 hidden lg:block"></div>
                        {/* Percentage Score */}
                        <StatItem label="Percentage"><p className="text-blue-600 dark:text-blue-400">{percentageScore}%</p></StatItem>
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700 hidden lg:block"></div>
                        {/* Pass/Fail Status */}
                        <StatItem label="Status">
                            <div className={`inline-flex items-center gap-2 ${isPass ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                <span>{isPass ? 'Pass' : 'Fail'}</span>
                            </div>
                        </StatItem>
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700 hidden lg:block"></div>
                        {/* Correct Answers Count */}
                        <StatItem label="Correct" value={stats.correctAnswers} valueClass="text-green-600 dark:text-green-400" />
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700 hidden lg:block"></div>
                        {/* Incorrect Answers Count */}
                        <StatItem label="Incorrect" value={incorrectAnswers} valueClass="text-red-600 dark:text-red-400" />
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700 hidden lg:block"></div>
                        {/* Total Questions Count */}
                        <StatItem label="Total Qs" value={stats.totalQuestions} valueClass="text-slate-700 dark:text-gray-200" />
                    </div>
                </div>

                {/* Answer Breakdown Component */}
                <div className="mt-8">
                    <AnswerBreakdown results={result.results} />
                </div>
            </div>

            {/* Action Buttons (placed outside the ref so they are not included in the PDF) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                {/* Back to Dashboard Button */}
                <button onClick={() => navigate('/dashboard')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors">
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </button>
                {/* Download PDF Button */}
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
            </div>
        </div>
    );
};

export default ResultPage;
