import axios from 'axios';
import { BookOpenCheck, CalendarClock, ChevronLeft, ChevronRight, Frown } from 'lucide-react'; // Icons for assessment, time, and empty state
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../components/Loader'; // Global loading spinner component
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext'; // Breadcrumb context hook
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * Helper function to format dates and times into a user-friendly string.
 * @param {string} dateStr - The date string.
 * @param {string} timeStr - The time string (e.g., HH:MM).
 * @returns {string} Formatted date and time string (e.g., "Oct 27, 2023, 10:30 AM") or "Not specified".
 */
const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return "Not specified";
    try {
        const date = new Date(dateStr);
        // Format date (e.g., "Oct 27, 2023").
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        // Format time (assuming it's HH:MM, will convert to 12-hour format with AM/PM).
        const [hours, minutes] = timeStr.split(':');
        const tempDate = new Date(); // Use a temp date to get correct time formatting.
        tempDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        const formattedTime = tempDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        return `${formattedDate}, ${formattedTime}`;
    } catch (e) {
        console.error("Error formatting date/time:", e);
        return "Invalid Date";
    }
};

/**
 * CourseView component displays detailed information about a specific course module,
 * including a list of its associated assessments.
 * It also handles navigation back and pagination for assessments.
 *
 * @returns {JSX.Element} The course details and assessments UI.
 */
const CourseView = () => {
    const { subjectId } = useParams(); // Get subject ID from URL parameters.
    const navigate = useNavigate(); // Hook for programmatic navigation.

    // State to store fetched course details.
    const [courseDetails, setCourseDetails] = useState(null);
    // State to manage overall loading status.
    const [loading, setLoading] = useState(true);
    // State to store any error messages during data fetching.
    const [error, setError] = useState(null);
    const { setCrumbs } = useBreadcrumbContext(); // Context hook to set breadcrumbs.

    // Pagination states for assessments within this course.
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5); // Number of assessments to display per page.

    /**
     * Effect hook to fetch course details and its assessments on component mount.
     * Sets breadcrumbs dynamically based on the course name.
     */
    useEffect(() => {
        // If no subject ID is provided in URL, set error and stop loading.
        if (!subjectId) {
            setError('Invalid subject ID provided.');
            setLoading(false);
            return;
        }

        const fetchCourseDetails = async () => {
            setLoading(true); // Start loading state.
            try {
                const token = sessionStorage.getItem("token");
                // Fetch course details from the API.
                const response = await axios.get(`${API_BASE_URL}/subjects/${subjectId}`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });
                setCourseDetails(response.data); // Set fetched course details.
                setCurrentPage(1); // Reset pagination to first page when new course details load.
                // Set breadcrumbs dynamically based on course name.
                setCrumbs([
                    { name: 'Courses', path: '/courses' },
                    { name: `${response.data?.name}`, path: `/courses/${subjectId}` }
                ]);
            } catch (err) {
                console.error('Error fetching course details:', err);
                // Set error message from API response or a generic one.
                setError(err.response?.data?.message || 'Failed to fetch course details.');
            } finally {
                setLoading(false); // End loading state.
            }
        };

        fetchCourseDetails();
    }, [subjectId, navigate, setCrumbs]); // Dependencies: subjectId, navigate, setCrumbs.

    /**
     * Effect hook to reset pagination to page 1 whenever `itemsPerPage` changes.
     */
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    /**
     * Handles navigation to a specific assessment's handler page.
     * @param {string} assessmentId - The ID of the assessment to navigate to.
     */
    const handleAssessmentClick = (assessmentId) => navigate(`/assessments/${assessmentId}`);

    /**
     * Handles navigation back to the previous page in history.
     */
    const handleNavigateBack = () => navigate(-1);

    // Pagination logic: calculate total pages and current assessments to display.
    const totalAssessments = courseDetails?.assessments?.length || 0;
    const totalPages = Math.ceil(totalAssessments / itemsPerPage);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    const currentAssessments = courseDetails?.assessments?.slice(indexOfFirstItem, indexOfLastItem) || [];

    // Display global loading spinner.
    if (loading) {
        return <Loader />;
    }

    // Display error message if data fetching failed.
    if (error) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">An Error Occurred</h3>
                <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
                <button onClick={handleNavigateBack} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-500">Go Back</button>
            </div>
        );
    }

    // If no course details are found after loading, display a message.
    if (!courseDetails) {
        return <div className="p-6 text-center text-slate-500 dark:text-gray-400">No course details found.</div>
    }

    return (
        <div className='space-y-6'>
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-medium text-slate-800 dark:text-white">{courseDetails.name}</h1>
                <p className="text-slate-500 dark:text-gray-400 mt-1">{courseDetails.description || 'Welcome to the course module.'}</p>
            </div>

            {/* Main Content Card: Available Assessments */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="p-5 border-b border-slate-200 dark:border-gray-700">
                    <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider flex-shrink-0">Available Assessments</h3>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-gray-700">
                    {currentAssessments.length > 0 ? (
                        currentAssessments.map((assessment) => (
                            <div
                                key={assessment._id}
                                className="p-5 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                onClick={() => handleAssessmentClick(assessment._id)}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex-shrink-0">
                                            <BookOpenCheck className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-medium text-slate-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">{assessment.name}</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400 font-medium pl-0 sm:pl-16">
                                        <CalendarClock size={16} className="text-slate-400 dark:text-gray-500" />
                                        <div>
                                            <p><strong>Opens:</strong> {formatDateTime(assessment.openDate, assessment.openTime)}</p>
                                            <p><strong>Closes:</strong> {formatDateTime(assessment.closeDate, assessment.closeTime)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        // Empty state when no assessments are available for this course.
                        <div className="flex flex-col items-center justify-center text-center py-16">
                            <Frown className="w-16 h-16 text-slate-400 dark:text-gray-500 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-gray-200">No Assessments Available</h3>
                            <p className="text-slate-500 dark:text-gray-400 mt-2 max-w-sm">
                                There are no assessments scheduled for this course at the moment. Please check back later.
                            </p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                  <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
                      <span>Show</span>
                      <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                      <span>entries</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 disabled:opacity-50 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md" aria-label="Previous page"><ChevronLeft size={20}/></button>
                      <span className="text-sm text-slate-600 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 disabled:opacity-50 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md" aria-label="Next page"><ChevronRight size={20}/></button>
                    </div>
                  </div>
                )}
            </div>
        </div>
    );
};

export default CourseView;
