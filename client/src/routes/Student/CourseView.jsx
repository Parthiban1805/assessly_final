import axios from 'axios';
import { BookOpenCheck, CalendarClock, ChevronLeft, ChevronRight, Frown, Search } from 'lucide-react'; // Added Search icon
import { useEffect, useState, useMemo } from 'react'; // Added useMemo
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../components/Loader';
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext';
import { API_BASE_URL } from '../../config/constants';

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
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const [hours, minutes] = timeStr.split(':');
        const tempDate = new Date();
        tempDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        const formattedTime = tempDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        return `${formattedDate}, ${formattedTime}`;
    } catch (e) {
        console.error("Error formatting date/time:", e);
        return "Invalid Date";
    }
};

/**
 * Helper function to return Tailwind CSS classes based on assessment status.
 * Adjusted to statuses that can be determined from AssessmentResult model.
 * @param {string} status - The assessment status string.
 * @returns {string} Tailwind CSS classes for background and text color.
 */
const getStatusStyles = (status) => {
    switch (status) {
        case 'Upcoming':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case 'Not Started':
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        case 'Completed':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case 'Missed':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        default:
            return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
};


const CourseView = () => {
    const { subjectId } = useParams();
    const navigate = useNavigate();

    const [courseDetails, setCourseDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { setCrumbs } = useBreadcrumbContext();

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Upcoming', 'Not Started', 'Completed', 'Missed'
    const [sortOrder, setSortOrder] = useState('default'); // 'default', 'name_asc', 'name_desc', 'openDate_asc', 'openDate_desc'

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    /**
     * Effect hook to fetch course details and its assessments on component mount.
     */
    useEffect(() => {
        if (!subjectId) {
            setError('Invalid subject ID provided.');
            setLoading(false);
            return;
        }

        const fetchCourseDetails = async () => {
            setLoading(true);
            try {
                const token = sessionStorage.getItem("token");
                const response = await axios.get(`${API_BASE_URL}/subjects/${subjectId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setCourseDetails(response.data);
                setCurrentPage(1); // Reset pagination on new course load
                setCrumbs([
                    { name: 'Courses', path: '/courses' },
                    { name: `${response.data?.name}`, path: `/courses/${subjectId}` }
                ]);
            } catch (err) {
                console.error('Error fetching course details:', err);
                setError(err.response?.data?.message || 'Failed to fetch course details.');
            } finally {
                setLoading(false);
            }
        };

        fetchCourseDetails();
    }, [subjectId, navigate, setCrumbs]);

    /**
     * Effect hook to reset pagination to page 1 whenever filters or itemsPerPage change.
     */
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage, searchTerm, filterStatus, sortOrder]);


    /**
     * Applies filtering and sorting to the assessments.
     * Use useMemo to re-calculate only when courseDetails or filter/sort states change.
     */
    const filteredAndSortedAssessments = useMemo(() => {
        if (!courseDetails?.assessments) {
            return [];
        }

        let assessments = [...courseDetails.assessments]; // Create a mutable copy

        // 1. Apply Status Filter
        if (filterStatus !== 'All') {
            assessments = assessments.filter(assessment => assessment.status === filterStatus);
        }

        // 2. Apply Search Term Filter
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            assessments = assessments.filter(assessment =>
                assessment.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (assessment.description && assessment.description.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        // 3. Apply Sorting
        assessments.sort((a, b) => {
            if (sortOrder === 'default') {
                // Default sort: Not Completed first, then by open date (ascending)
                const isANotCompleted = a.status !== 'Completed' && a.status !== 'Missed';
                const isBNotCompleted = b.status !== 'Completed' && b.status !== 'Missed';

                if (isANotCompleted && !isBNotCompleted) return -1; // A comes before B
                if (!isANotCompleted && isBNotCompleted) return 1;  // B comes before A

                // If both have same completion status, sort by open date
                const dateA = new Date(`${a.openDate}T${a.openTime}`).getTime();
                const dateB = new Date(`${b.openDate}T${b.openTime}`).getTime();
                return dateA - dateB; // Ascending by date
            } else if (sortOrder === 'name_asc') {
                return a.name.localeCompare(b.name);
            } else if (sortOrder === 'name_desc') {
                return b.name.localeCompare(a.name);
            } else if (sortOrder === 'openDate_asc') {
                const dateA = new Date(`${a.openDate}T${a.openTime}`).getTime();
                const dateB = new Date(`${b.openDate}T${b.openTime}`).getTime();
                return dateA - dateB;
            } else if (sortOrder === 'openDate_desc') {
                const dateA = new Date(`${a.openDate}T${a.openTime}`).getTime();
                const dateB = new Date(`${b.openDate}T${b.openTime}`).getTime();
                return dateB - dateA;
            }
            return 0; // Should not happen
        });

        return assessments;
    }, [courseDetails?.assessments, searchTerm, filterStatus, sortOrder]);


    // Pagination logic
    const totalAssessments = filteredAndSortedAssessments.length;
    const totalPages = Math.ceil(totalAssessments / itemsPerPage);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    const currentAssessments = filteredAndSortedAssessments.slice(indexOfFirstItem, indexOfLastItem);

    const handleAssessmentClick = (assessmentId) => navigate(`/assessments/${assessmentId}`);
    const handleNavigateBack = () => navigate(-1);

    if (loading) {
        return <Loader />;
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">An Error Occurred</h3>
                <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
                <button onClick={handleNavigateBack} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-500">Go Back</button>
            </div>
        );
    }

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

            {/* Filter and Sort Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm p-4 space-y-4">
                <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider flex-shrink-0">Filter & Sort Assessments</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search by Name */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by name or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-500" />
                    </div>

                    {/* Filter by Status */}
                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Not Started">Not Started</option>
                            <option value="Completed">Completed</option>
                            <option value="Missed">Missed</option>
                        </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="default">Default (Not Completed First, then Date)</option>
                            <option value="name_asc">Name (A-Z)</option>
                            <option value="name_desc">Name (Z-A)</option>
                            <option value="openDate_asc">Open Date (Earliest First)</option>
                            <option value="openDate_desc">Open Date (Latest First)</option>
                        </select>
                    </div>
                </div>
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
                                            <h4 className="text-base font-medium text-slate-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                                {assessment.name}
                                                {assessment.status && (
                                                    <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(assessment.status)}`}>
                                                        {assessment.status}
                                                    </span>
                                                )}
                                            </h4>
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
                        <div className="flex flex-col items-center justify-center text-center py-16">
                            <Frown className="w-16 h-16 text-slate-400 dark:text-gray-500 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-gray-200">No Assessments Match Your Criteria</h3>
                            <p className="text-slate-500 dark:text-gray-400 mt-2 max-w-sm">
                                Adjust your filters or search terms to find assessments.
                            </p>
                        </div>
                    )}
                </div>

                {totalPages > 0 && ( // Only show pagination if there are items
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
                {totalPages === 0 && ( // Display message if no results after filters
                    <div className="p-4 text-center text-slate-500 dark:text-gray-400">No assessments found with the selected criteria.</div>
                )}
            </div>
        </div>
    );
};

export default CourseView;