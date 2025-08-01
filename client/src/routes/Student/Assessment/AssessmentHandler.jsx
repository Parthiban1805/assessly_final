import axios from 'axios';
import { Calendar, CheckCircle, Clock, XCircle } from 'lucide-react'; // Icons for status and date/time
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../../components/Loader'; // Global loading spinner component
import { API_BASE_URL } from '../../../config/constants'; // Import the common API base URL

/**
 * AssessmentHandler component displays an overview of a specific assessment
 * (name, open/close times, and current status) and provides a button to proceed
 * to instructions or view results if completed and answers are displayed.
 *
 * @returns {JSX.Element} The assessment overview and action UI.
 */
const AssessmentHandler = () => {
    const { assessmentId } = useParams(); // Get assessment ID from URL parameters
    const navigate = useNavigate(); // Hook for programmatic navigation

    // State to hold fetched assessment data (details, status, settings).
    const [pageData, setPageData] = useState(null);
    // State to manage overall loading status.
    const [isLoading, setIsLoading] = useState(true);
    // State to store any error messages during data fetching.
    const [error, setError] = useState(null);

    /**
     * Effect hook to fetch assessment handler data on component mount.
     * This includes assessment details, the student's current status for it, and display settings.
     */
    useEffect(() => {
        const fetchHandlerData = async () => {
            setIsLoading(true); // Start loading state.
            try {
                const token = sessionStorage.getItem("token");
                // Fetch data for the assessment handler from the API.
                const response = await axios.get(`${API_BASE_URL}/assessments/${assessmentId}/handler-data`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });
                setPageData(response.data); // Set fetched data.
            } catch (err) {
                // Set error message from API response or a generic one.
                setError(err.response?.data?.message || 'Failed to load assessment data.');
            } finally {
                setIsLoading(false); // End loading state.
            }
        };
        fetchHandlerData();
    }, [assessmentId, navigate]); // Dependencies: assessmentId (from URL) and navigate (if used in fallback).

    /**
     * Handles the action button click.
     * Navigates to the results page if assessment is completed and results are visible,
     * otherwise navigates to the instructions page.
     */
    const handleButtonClick = () => {
        if (pageData?.status === 'completed' && pageData?.settings?.displayAnswers) {
            navigate(`/results/${assessmentId}`);
        } else {
            navigate(`/instructions/${assessmentId}`);
        }
    };

    /**
     * Formats a time string (HH:MM) into a user-friendly 12-hour format with AM/PM.
     * @param {string} timeString - The time string in HH:MM format.
     * @returns {string} Formatted time string (e.g., "10:30 AM") or 'N/A'.
     */
    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        const [hours, minutes] = timeString.split(':');
        const date = new Date(); // Create a dummy date object to use Date.prototype.toLocaleTimeString
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    /**
     * Formats a date string into a user-friendly locale-specific format.
     * @param {string} dateString - The date string.
     * @returns {string} Formatted date string (e.g., "27 Oct 2023") or 'N/A'.
     */
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Configuration for different assessment status types, including text, icon, and color.
    const statusInfo = {
        completed: { text: "Completed", icon: <CheckCircle className="text-green-500 dark:text-green-400" size={18}/>, color: "text-green-600 dark:text-green-400" },
        'in-progress': { text: "In Progress", icon: <Clock className="text-amber-500 dark:text-amber-400" size={18}/>, color: "text-amber-600 dark:text-amber-400" },
        'not-found': { text: "Not Found", icon: <XCircle className="text-red-500 dark:text-red-400" size={18}/>, color: "text-red-600 dark:text-red-400" },
        default: { text: "Ready to Start", icon: <Clock className="text-blue-500 dark:text-blue-400" size={18}/>, color: "text-blue-600 dark:text-blue-400" }, // Using Clock for "Ready to Start"
    };

    // Determine the current status info based on pageData.status, fallback to 'default'.
    const currentStatus = statusInfo[pageData?.status] || statusInfo.default;

    // Display loading spinner while data is being fetched.
    if (isLoading) return <Loader />;

    // Display error message if data fetching failed.
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-md text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-red-200 dark:border-red-700">
                    <XCircle className="mx-auto w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
                    <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">An Error Occurred</h2>
                    <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>
                    <button onClick={() => navigate(-1)} className="mt-6 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 dark:hover:bg-red-500">Go Back</button>
                </div>
            </div>
        );
    }

    // If no pageData or assessmentDetails are found after loading, display a message.
    if (!pageData || !pageData.assessmentDetails) {
        return <div className="flex items-center justify-center min-h-screen text-slate-500 dark:text-gray-400">No assessment data found.</div>;
    }

    const { assessmentDetails } = pageData;

    return (
        <div className='flex items-center justify-center h-screen bg-slate-50 dark:bg-gray-900 p-4'>
            <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="py-4 px-6 border-b border-slate-200 dark:border-gray-700">
                    <h2 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider flex-shrink-0">Assessment Confirmation</h2>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Assessment Name</p>
                        <p className="text-lg font-semibold text-slate-800 dark:text-white">{assessmentDetails.name}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-gray-700">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><Calendar size={14} className="text-slate-400 dark:text-gray-500" /> Open Date & Time</p>
                            <p className="font-semibold text-slate-700 dark:text-gray-200">{formatDate(assessmentDetails.openDate)}, {formatTime(assessmentDetails.openTime)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><Calendar size={14} className="text-slate-400 dark:text-gray-500" /> Close Date & Time</p>
                            <p className="font-semibold text-slate-700 dark:text-gray-200">{formatDate(assessmentDetails.closeDate)}, {formatTime(assessmentDetails.closeTime)}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Status</p>
                        <div className={`flex items-center gap-2 font-medium ${currentStatus.color}`}>
                            {currentStatus.icon}
                            <span>{currentStatus.text}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-700">
                    <button
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors disabled:bg-slate-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                        onClick={handleButtonClick}
                        // Disable button if assessment is completed and answers are NOT set to display.
                        disabled={pageData.status === 'completed' && !pageData.settings.displayAnswers}
                    >
                        <span>{pageData.status === 'completed' ? 'View Result' : 'Proceed to Instructions'}</span>
                    </button>
                    {pageData.status === 'completed' && !pageData.settings.displayAnswers && (
                        <p className="text-xs text-center text-slate-500 dark:text-gray-400 mt-2">Results are not yet published for this assessment.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssessmentHandler;
