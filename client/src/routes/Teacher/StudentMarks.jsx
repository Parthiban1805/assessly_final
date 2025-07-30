import axios from 'axios';
import { BarChart4, CheckCircle, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IoArrowBack } from "react-icons/io5";
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';

// Assuming you have an API_BASE_URL defined globally or within a config file
const API_BASE_URL = 'http://localhost:5000/api/v1'; // Add this if not already present

const StudentMarks = ({ assessment, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [marks, setMarks] = useState([]); // This will store the individual { studentId, marks, status }
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        completed: 0,
        notStarted: 0,
        averageMark: 0,
        highestMark: 0,
        lowestMark: 0,
        possible: 0 // Total possible marks for the assessment
    });

    const navigate = useNavigate();

    useEffect(() => {
        const fetchStudentMarks = async () => {
            if (!assessment || !assessment._id) {
                setError('Assessment details are missing.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null); // Clear previous errors

                const token = sessionStorage.getItem("token");
                if (!token) {
                    // This scenario should be caught by ProtectedRoute, but good fallback
                    setError("Authentication token not found. Please log in.");
                    setLoading(false);
                    return;
                }

                // Fetch student marks for this assessment
                const response = await axios.get(`${API_BASE_URL}/analytics/assessment/${assessment._id}/marks`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const fetchedMarks = response.data; // This is an array of { studentId, marks, status }
                setMarks(fetchedMarks);

                // --- STATS CALCULATION ---
                const completedStudents = fetchedMarks.filter(m => m.status === 'completed');
                
                // Extract only the numeric marks from completed students
                const completedNumericMarks = completedStudents.map(m => m.marks); 

                // FIX: Use assessment.marks directly as total possible marks for the exam.
                // This is passed via the 'assessment' prop from AssessmentDisplay.jsx.
                const totalPossibleMarks = assessment.marks || 0; 
                if (totalPossibleMarks === 0) {
                    console.warn("Assessment has 0 total possible marks defined.");
                    // You might want to throw an error or handle this case specifically
                }

                const calculatedStats = {
                    completed: completedStudents.length,
                    // To get an accurate 'notStarted' count, you need total registered students for this assessment's cohort.
                    // For now, if your service only returns students who have a Marks record,
                    // 'notStarted' will represent those who have a record but status is not 'completed'.
                    // If you need total registered students, you'd need another API call.
                    notStarted: fetchedMarks.length - completedStudents.length, // Students with a record but not completed
                    averageMark: completedNumericMarks.length ? 
                                (completedNumericMarks.reduce((sum, current) => sum + current, 0) / completedNumericMarks.length).toFixed(2) : 0,
                    highestMark: completedNumericMarks.length ? Math.max(...completedNumericMarks) : 0,
                    lowestMark:  completedNumericMarks.length ? Math.min(...completedNumericMarks) : 0,
                    possible:    totalPossibleMarks // Set the total possible marks here
                };
                
                setStats(calculatedStats);

            } catch (err) {
                console.error('Error fetching student marks:', err.response?.data || err.message);
                setError(err.response?.data?.message || 'Failed to fetch student marks. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        // Only fetch if assessment prop and its ID are available
        if (assessment && assessment._id) {
            fetchStudentMarks();
        }
    }, [assessment, navigate]); // Add navigate to dependencies if it's used within useEffect for redirection


    // Helper for Stat Cards
    const StatCard = ({ icon, title, value, unit, colorClass }) => (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-slate-500">{title}</p>
                    <p className="text-md font-medium text-slate-800">{value} {unit}</p>
                </div>
            </div>
        </div>
    );

    if (loading) return <Loader />; // Use the Loader component you have in your project
    if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

    // Use stats.possible for displaying total possible marks consistently
    const displayTotalPossibleMarks = stats.possible;

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            <div className="flex flex-col mb-4 space-x-4 pb-3 border-b border-slate-200">
                <h2 className="text-2xl font-semibold">{assessment.name}</h2>
            </div>

            {/* Assessment Details Cards (using Lucide icons if available) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-slate-600 text-sm">Subject</h4>
                    <p className="font-medium text-slate-800">{assessment.subjectName}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-slate-600 text-sm">Department</h4>
                    <p className="font-medium text-slate-800">{assessment.department}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-slate-600 text-sm">Total Marks</h4>
                    <p className="font-medium text-slate-800">{displayTotalPossibleMarks}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-slate-600 text-sm">Duration</h4>
                    <p className="font-medium text-slate-800">{assessment.examDurationMinutes} minutes</p>
                </div>
            </div>

            {/* Statistics Section (using StatCard component and Lucide icons) */}
            <div className="mb-6">
                <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3">Key Statistics</h3>
                {loading ? (
                    <Skeleton count={1} height={100} className="rounded-xl" />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <StatCard icon={<CheckCircle size={20} className="text-green-600"/>} title="Completed" value={stats.completed} unit="students" colorClass="bg-green-100"/>
                        <StatCard icon={<Clock size={20} className="text-amber-600"/>} title="Not Started" value={stats.notStarted} unit="students" colorClass="bg-amber-100"/>
                        <StatCard icon={<BarChart4 size={20} className="text-blue-600"/>} title="Average Mark" value={stats.averageMark} unit={`/ ${displayTotalPossibleMarks}`} colorClass="bg-blue-100"/>
                        <StatCard icon={<TrendingUp size={20} className="text-teal-600"/>} title="Highest Mark" value={stats.highestMark} unit={`/ ${displayTotalPossibleMarks}`} colorClass="bg-teal-100"/>
                        <StatCard icon={<TrendingDown size={20} className="text-rose-600"/>} title="Lowest Mark" value={stats.lowestMark} unit={`/ ${displayTotalPossibleMarks}`} colorClass="bg-rose-100"/>
                    </div>
                )}
            </div>

            {/* Student Results Table */}
            <div>
                {error && <p className="text-red-600 mb-4">{error}</p>}
                {loading ? (
                    <Skeleton count={5} height={40} className="rounded-xl" />
                ) : marks.length ? (
                    <div className="overflow-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider px-6 py-4">Student Results</h3>
                        <table className="min-w-full table-auto">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-sm text-left font-medium text-slate-600 uppercase">Student ID</th>
                                    <th className="px-6 py-3 text-sm text-center font-medium text-slate-600 uppercase">Status</th>
                                    <th className="px-6 py-3 text-sm text-center font-medium text-slate-600 uppercase">Marks Obtained</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {marks.map((record, idx) => {
                                    const obtained = record.marks ?? 0; // Use record.marks directly
                                    const possible = displayTotalPossibleMarks;
                                    const markText = record.status === 'completed' ? `${obtained} / ${possible}` : '-';
                                    return (
                                        <tr
                                            key={record.studentId || idx}
                                            onClick={() => navigate(`/teacher-dashboard/students/${record.studentId}/${assessment._id}`)}
                                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-medium text-slate-800">{record.studentId}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                    record.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-slate-100 text-slate-600' // Use a neutral color for 'Not Started' if they have a record
                                                }`}>
                                                    {record.status === 'completed' ? 'Completed' : 'Not Started'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-blue-600">{markText}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-10 bg-white rounded-xl border border-slate-200 shadow-sm">No student results available for this assessment.</p>
                )}
            </div>
        </div>
    );
};

export default StudentMarks;