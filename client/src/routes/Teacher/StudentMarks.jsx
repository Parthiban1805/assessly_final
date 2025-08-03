import axios from 'axios';
import { BarChart4, CheckCircle, Clock, TrendingDown, TrendingUp } from 'lucide-react'; // Icons for stats and charts
import { useEffect, useState } from 'react';
import { IoArrowBack } from "react-icons/io5"; // Back arrow icon
// import Skeleton from 'react-loading-skeleton'; // Commented out as react-loading-skeleton might not be fully installed or configured
// import 'react-loading-skeleton/dist/skeleton.css'; // Styling for react-loading-skeleton (if used)
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader'; // Global loading spinner
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * StudentMarks component displays a detailed breakdown of student performance
 * for a specific assessment. It includes key statistics and a table of individual
 * student marks.
 *
 * @param {object} props - The component props.
 * @param {object} props.assessment - The assessment object for which to display marks.
 * @param {function} props.onBack - Callback function to navigate back to the assessment list.
 * @returns {JSX.Element} The student marks overview UI.
 */
const StudentMarks = ({ assessment, onBack }) => {
    // State to manage overall loading status.
    const [loading, setLoading] = useState(true);
    // State to store individual student marks for the assessment.
    const [marks, setMarks] = useState([]); // Array of { studentId, marks, status }
    // State to store any error messages during data fetching.
    const [error, setError] = useState(null);
    // State to store calculated statistics about the assessment's performance.
    const [stats, setStats] = useState({
        completed: 0,       // Number of students who completed.
        notStarted: 0,      // Number of students who have a record but didn't complete.
        averageMark: 0,     // Average mark of completed students.
        highestMark: 0,     // Highest mark achieved.
        lowestMark: 0,      // Lowest mark achieved.
        possible: 0         // Total possible marks for the assessment.
    });

    const navigate = useNavigate(); // Hook for programmatic navigation.

    /**
     * Effect hook to fetch student marks for the given assessment on component mount.
     * Calculates and sets performance statistics based on fetched marks.
     */
    useEffect(() => {
        const fetchStudentMarks = async () => {
            // If assessment details are missing, set error and stop loading.
            if (!assessment || !assessment._id) {
                setError('Assessment details are missing.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true); // Start loading state.
                setError(null); // Clear previous errors.

                const token = sessionStorage.getItem("token");
                // If no token, set error (ProtectedRoute should ideally handle this first).
                if (!token) {
                    setError("Authentication token not found. Please log in.");
                    setLoading(false);
                    return;
                }

                // Fetch student marks for this specific assessment.
                const response = await axios.get(`${API_BASE_URL}/analytics/assessment/${assessment._id}/marks`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });

                const fetchedMarks = response.data; // This is an array of { studentId, marks, status }.
                setMarks(fetchedMarks); // Set fetched marks.

                // --- STATS CALCULATION ---
                const completedStudents = fetchedMarks.filter(m => m.status === 'completed');
                const completedNumericMarks = completedStudents.map(m => m.marks);

                // Use `assessment.marks` (from props) as the total possible marks for the exam.
                const totalPossibleMarks = assessment.marks || 0;
                if (totalPossibleMarks === 0) {
                    console.warn("Assessment has 0 total possible marks defined in its metadata.");
                    // Consider displaying a warning or handling this case in the UI.
                }

                const calculatedStats = {
                    completed: completedStudents.length,
                    // 'notStarted' currently refers to students with a record but not 'completed'.
                    // For a true 'not started' count (out of all eligible students),
                    // you would need another API endpoint providing the total count of eligible students.
                    notStarted: fetchedMarks.length - completedStudents.length,
                    averageMark: completedNumericMarks.length ?
                                (completedNumericMarks.reduce((sum, current) => sum + current, 0) / completedNumericMarks.length).toFixed(2) : 0,
                    highestMark: completedNumericMarks.length ? Math.max(...completedNumericMarks) : 0,
                    lowestMark:  completedNumericMarks.length ? Math.min(...completedNumericMarks) : 0,
                    possible:    totalPossibleMarks // Store total possible marks.
                };

                setStats(calculatedStats);

            } catch (err) {
                console.error('Error fetching student marks:', err.response?.data || err.message);
                setError(err.response?.data?.message || 'Failed to fetch student marks. Please try again later.');
            } finally {
                setLoading(false); // End loading state.
            }
        };

        // Only fetch if `assessment` prop and its `_id` are available.
        if (assessment && assessment._id) {
            fetchStudentMarks();
        }
    }, [assessment, navigate]); // Dependencies: assessment (for its ID) and navigate (if used for redirection within).

    // Helper component for consistent stat card styling.
    const StatCard = ({ icon, title, value, unit, colorClass }) => (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-slate-500 dark:text-gray-400">{title}</p>
                    <p className="text-md font-medium text-slate-800 dark:text-white">{value} {unit}</p>
                </div>
            </div>
        </div>
    );

    // Display global loading spinner.
    if (loading) return <Loader />;
    // Display error message if data fetching failed.
    if (error) return <div className="p-6 text-center text-red-600 dark:text-red-400">{error}</div>;

    // Use `stats.possible` for consistent display of total possible marks.
    const displayTotalPossibleMarks = stats.possible;

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            {/* Header Section with Back Button */}
            <div className="flex items-center mb-4 space-x-4 pb-3 border-b border-slate-200 dark:border-gray-700">
                <button onClick={onBack} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors" aria-label="Back to assessments">
                    <IoArrowBack size={20} />
                </button>
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">{assessment.name}</h2>
            </div>

            {/* Assessment Details Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                    <h4 className="text-slate-600 dark:text-gray-300 text-sm">Subject</h4>
                    <p className="font-medium text-slate-800 dark:text-white">{assessment.subjectName}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                    <h4 className="text-slate-600 dark:text-gray-300 text-sm">Department</h4>
                    <p className="font-medium text-slate-800 dark:text-white">{assessment.department}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                    <h4 className="text-slate-600 dark:text-gray-300 text-sm">Total Marks</h4>
                    <p className="font-medium text-slate-800 dark:text-white">{displayTotalPossibleMarks}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                    <h4 className="text-slate-600 dark:text-gray-300 text-sm">Duration</h4>
                    <p className="font-medium text-slate-800 dark:text-white">{assessment.examDurationMinutes} minutes</p>
                </div>
            </div>

            {/* Statistics Section */}
            <div className="mb-6">
                <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3">Key Statistics</h3>
                {loading ? ( // Display skeleton loader if data is still loading (unlikely here due to check above, but good practice).
                    // <Skeleton count={1} height={100} className="rounded-xl" /> // Uncomment if react-loading-skeleton is used.
                    <p className="text-slate-500 dark:text-gray-400">Loading statistics...</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <StatCard icon={<CheckCircle size={20} className="text-green-600 dark:text-green-400"/>} title="Completed" value={stats.completed} unit="students" colorClass="bg-green-100 dark:bg-green-900/20"/>
                        <StatCard icon={<Clock size={20} className="text-amber-600 dark:text-amber-400"/>} title="Not Started" value={stats.notStarted} unit="students" colorClass="bg-amber-100 dark:bg-amber-900/20"/>
                        <StatCard icon={<BarChart4 size={20} className="text-blue-600 dark:text-blue-400"/>} title="Average Mark" value={stats.averageMark} unit={`/ ${displayTotalPossibleMarks}`} colorClass="bg-blue-100 dark:bg-blue-900/20"/>
                        <StatCard icon={<TrendingUp size={20} className="text-teal-600 dark:text-teal-400"/>} title="Highest Mark" value={stats.highestMark} unit={`/ ${displayTotalPossibleMarks}`} colorClass="bg-teal-100 dark:bg-teal-900/20"/>
                        <StatCard icon={<TrendingDown size={20} className="text-rose-600 dark:text-rose-400"/>} title="Lowest Mark" value={stats.lowestMark} unit={`/ ${displayTotalPossibleMarks}`} colorClass="bg-rose-100 dark:bg-rose-900/20"/>
                    </div>
                )}
            </div>

            {/* Student Results Table */}
            <div>
                {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}
                {loading ? ( // Display skeleton loader for table if data is still loading.
                    // <Skeleton count={5} height={40} className="rounded-xl" /> // Uncomment if react-loading-skeleton is used.
                    <p className="text-slate-500 dark:text-gray-400">Loading student results table...</p>
                ) : marks.length ? (
                    <div className="overflow-auto bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider px-6 py-4">Student Results</h3>
                        <table className="min-w-full table-auto">
                            <thead className="bg-slate-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-sm text-left font-medium text-slate-600 dark:text-gray-300 uppercase">Student ID</th>
                                    <th className="px-6 py-3 text-sm text-center font-medium text-slate-600 dark:text-gray-300 uppercase">Status</th>
                                    <th className="px-6 py-3 text-sm text-center font-medium text-slate-600 dark:text-gray-300 uppercase">Marks Obtained</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                                {marks.map((record, idx) => {
                                    const obtained = record.marks ?? 0; // Use record.marks directly.
                                    const possible = displayTotalPossibleMarks;
                                    const markText = record.status === 'completed' ? `${obtained} / ${possible}` : '-';
                                    return (
                                        <tr
                                            key={record.studentId || idx}
                                            onClick={() => navigate(`/teacher-dashboard/students/${record.studentId}/${assessment._id}`)}
                                            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{record.studentId}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                    record.status === 'completed'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-gray-300' // Neutral color for 'Not Started'.
                                                }`}>
                                                    {record.status === 'completed' ? 'Completed' : 'Not Started'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-blue-600 dark:text-blue-400">{markText}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-10 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">No student results available for this assessment.</p>
                )}
            </div>
        </div>
    );
};

export default StudentMarks;
