import axios from 'axios';
import { CheckCircle, Clock, XCircle } from 'lucide-react'; // Icons for status
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader'; // Global loading spinner
import StudentMarks from './StudentMarks'; // Component to display student marks for a specific assessment
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * AssessmentDisplay component for teachers to view and manage their created assessments
 * and check overall student results across all their assessments.
 *
 * @returns {JSX.Element} The assessment and results overview UI.
 */
const AssessmentDisplay = () => {
    const navigate = useNavigate(); // Hook for programmatic navigation.
    // State to control the current view: 'assessments' (teacher's own assessments)
    // or 'results' (aggregated student results), or 'studentMarks' (details for a specific assessment).
    const [view, setView] = useState('assessments');
    // State to hold the assessment object selected for detailed student marks view.
    const [selectedAssessment, setSelectedAssessment] = useState(null);

    // Data States.
    const [assessments, setAssessments] = useState([]); // List of assessments created by the teacher.
    const [studentResults, setStudentResults] = useState([]); // Aggregated student results across all assessments.
    const [userDetails, setUserDetails] = useState(null); // Authenticated teacher's details.

    // Loading and Error States.
    const [assessmentsLoading, setAssessmentsLoading] = useState(true); // Loading state for assessments list.
    const [resultsLoading, setResultsLoading] = useState(false); // Loading state for aggregated student results.
    const [error, setError] = useState(null); // Any error message during data fetching.

    /**
     * Effect hook to fetch initial teacher details and their created assessments on component mount.
     * Redirects to login if authentication token is missing.
     */
    useEffect(() => {
        const fetchInitialData = async () => {
            setAssessmentsLoading(true); // Start loading state for assessments.
            try {
                const token = sessionStorage.getItem("token");
                if (!token) {
                    navigate('/login'); // Redirect to login if not authenticated.
                    return;
                }

                // Decode JWT token to get user details (specifically teacher's department and subjects).
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userData = payload.userDetails;
                setUserDetails(userData);

                // Prepare subjects parameter for API call (comma-separated if multiple).
                const subjectsParam = Array.isArray(userData.subjects) ? userData.subjects.join(',') : userData.subjects;

                // Fetch assessments created by this teacher based on department and subjects.
                const response = await axios.get(`${API_BASE_URL}/analytics/assessments`, {
                    params: { department: userData.department, subjects: subjectsParam },
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });
                setAssessments(response.data); // Set fetched assessments.
            } catch (err) {
                console.error("Error fetching initial data:", err);
                setError(err.response?.data?.message || 'Failed to fetch initial data. Please try again.');
            } finally {
                setAssessmentsLoading(false); // End loading state.
            }
        };
        fetchInitialData();
    }, [navigate]); // Dependency: navigate function.

    /**
     * Effect hook to fetch aggregated student results.
     * This runs only when the `view` state changes to 'results' and results haven't been fetched yet.
     */
    useEffect(() => {
        // Only fetch if view is 'results' and results are not already loaded (to avoid re-fetching).
        if (view !== 'results' || (studentResults.length > 0 && userDetails?._id)) return;

        const fetchStudentResults = async () => {
            // Ensure user details (specifically _id for filtering) are available.
            if (!userDetails?._id) return;

            setResultsLoading(true); // Start loading state for results.
            try {
                const token = sessionStorage.getItem("token");
                // Fetch aggregated student results for the teacher.
                const response = await axios.get(`${API_BASE_URL}/analytics/${userDetails._id}/results`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });
                setStudentResults(response.data); // Set fetched student results.
            } catch (err) {
                console.error("Error fetching student results:", err);
                setError('Failed to fetch student results.');
            } finally {
                setResultsLoading(false); // End loading state.
            }
        };
        fetchStudentResults();
    }, [view, userDetails, studentResults.length]); // Dependencies: view, userDetails (for _id), studentResults.length (to know if already fetched).

    /**
     * Handles clicking on an assessment card. Sets the selected assessment
     * and switches the view to display student marks for that assessment.
     * @param {object} assessment - The assessment object that was clicked.
     */
    const handleAssessmentClick = (assessment) => {
        setSelectedAssessment(assessment);
        setView('studentMarks'); // Change view to show detailed student marks.
    };

    /**
     * Handles navigating back from the student marks detail view to the assessments list.
     */
    const handleBackToAssessments = () => {
        setSelectedAssessment(null); // Clear selected assessment.
        setView('assessments'); // Change view back to assessments list.
    };

    /**
     * Determines the current status of an assessment (Upcoming, Active, Closed)
     * based on its open and close dates/times, and returns relevant text, color, and icon.
     * @param {object} assessment - The assessment object.
     * @returns {{text: string, color: string, icon: JSX.Element}} Status information.
     */
    const getStatusInfo = (assessment) => {
        const now = new Date();
        const openDateTime = new Date(`${assessment.openDate}T${assessment.openTime}`);
        const closeDateTime = new Date(`${assessment.closeDate}T${assessment.closeTime}`);

        if (now < openDateTime) return { text: 'Upcoming', color: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400', icon: <Clock size={16} /> };
        if (now > closeDateTime) return { text: 'Closed', color: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400', icon: <XCircle size={16} /> };
        return { text: 'Active', color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400', icon: <CheckCircle size={16} /> };
    };

    // If the view is `studentMarks`, render the `StudentMarks` component.
    if (view === 'studentMarks') {
        return <StudentMarks assessment={selectedAssessment} onBack={handleBackToAssessments} />;
    }

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-medium text-slate-800 dark:text-white">Assessment & Results</h1>
                <p className="text-slate-500 dark:text-gray-400 mt-1">View your created assessments or check overall student results.</p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-slate-200 dark:border-gray-700">
                <nav className="flex gap-4 -mb-px">
                    <button onClick={() => setView('assessments')} className={`px-1 py-3 border-b-2 text-sm font-semibold ${view === 'assessments' ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:border-slate-300 dark:hover:border-gray-600'}`}>My Assessments</button>
                    <button onClick={() => setView('results')} className={`px-1 py-3 border-b-2 text-sm font-semibold ${view === 'results' ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:border-slate-300 dark:hover:border-gray-600'}`}>Student Results</button>
                </nav>
            </div>

            {/* Error Message Display */}
            {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">{error}</div>}

            {/* Content for 'My Assessments' Tab */}
            {view === 'assessments' && (
                assessmentsLoading ? <Loader /> : ( // Display loader while assessments are loading.
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assessments.length > 0 ? assessments.map(assessment => {
                            const status = getStatusInfo(assessment);
                            return (
                                <div key={assessment._id} onClick={() => handleAssessmentClick(assessment)} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm cursor-pointer hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800 dark:text-white pr-4">{assessment.name}</h3>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${status.color}`}>{status.icon}{status.text}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">{assessment.subjectName}</p>
                                    <div className="text-xs text-slate-500 dark:text-gray-400 mt-4 pt-4 border-t border-slate-100 dark:border-gray-700 space-y-2">
                                        <p><strong>Open:</strong> {new Date(assessment.openDate).toLocaleDateString()} at {assessment.openTime}</p>
                                        <p><strong>Close:</strong> {new Date(assessment.closeDate).toLocaleDateString()} at {assessment.closeTime}</p>
                                        <p><strong>Marks:</strong> {assessment.marks}</p>
                                    </div>
                                </div>
                            )
                        }) : <p className="col-span-full text-center py-10 text-slate-500 dark:text-gray-400">No assessments found.</p>}
                    </div>
                )
            )}

            {/* Content for 'Student Results' Tab */}
            {view === 'results' && (
                resultsLoading ? <Loader /> : ( // Display loader while results are loading.
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase">Assessment</th>
                                        <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase">Student ID</th>
                                        <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase">Score</th>
                                        <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase">Percentage</th>
                                        <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                                    {studentResults.length > 0 ? studentResults.map(result => (
                                        <tr key={result._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{result.assessmentTitle}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{result.studentId}</td>
                                            <td className="px-6 py-4 text-center font-bold text-blue-600 dark:text-blue-400">{result.totalMarks}/{result.totalPossibleMarks}</td>
                                            <td className="px-6 py-4 text-center text-slate-600 dark:text-gray-300">{result.percentage}%</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${result.status_com === 'Pass' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>{result.status_com}</span>
                                            </td>
                                        </tr>
                                    )) : <td colSpan="5" className="text-center py-10 text-slate-500 dark:text-gray-400">No student results available.</td>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default AssessmentDisplay;
