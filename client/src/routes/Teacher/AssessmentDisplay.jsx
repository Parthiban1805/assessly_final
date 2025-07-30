import axios from 'axios';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import StudentMarks from './StudentMarks';

const API_BASE_URL = 'http://localhost:5000/api/v1'; // Add this if not already present

const AssessmentDisplay = () => {
    const navigate = useNavigate();
    const [view, setView] = useState('assessments');
    const [selectedAssessment, setSelectedAssessment] = useState(null);

    // Data states
    const [assessments, setAssessments] = useState([]);
    const [studentResults, setStudentResults] = useState([]);
    const [userDetails, setUserDetails] = useState(null);
    
    // Loading and Error states
    const [assessmentsLoading, setAssessmentsLoading] = useState(true);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Fetch initial teacher and assessment data
    useEffect(() => {
        const fetchInitialData = async () => {
            setAssessmentsLoading(true);
            try {
                const token = sessionStorage.getItem("token");
                if (!token) { navigate('/login'); return; }
                
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userData = payload.userDetails;
                setUserDetails(userData);
                
                const subjectsParam = Array.isArray(userData.subjects) ? userData.subjects.join(',') : userData.subjects;
                const response = await axios.get(`${API_BASE_URL}/analytics/assessments`, {
                    params: { department: userData.department, subjects: subjectsParam },
                    // FIX: Add the Authorization header
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setAssessments(response.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch initial data. Please try again.');
            } finally {
                setAssessmentsLoading(false);
            }
        };
        fetchInitialData();
    }, [navigate]);

    // Fetch student results only when the results tab is clicked
    useEffect(() => {
        if (view !== 'results' || studentResults.length > 0) return; // Fetch only once
        
        const fetchStudentResults = async () => {
            if (!userDetails?._id) return;
            setResultsLoading(true);
            try {
                const token = sessionStorage.getItem("token"); // Get token for this request too
                const response = await axios.get(`${API_BASE_URL}/analytics/${userDetails._id}/results`, {
                    // FIX: Add the Authorization header for this request as well
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setStudentResults(response.data);
            } catch (err) {
                setError('Failed to fetch student results.');
            } finally {
                setResultsLoading(false);
            }
        };
        fetchStudentResults();
    }, [view, userDetails, studentResults.length]);

    const handleAssessmentClick = (assessment) => {
        setSelectedAssessment(assessment);
        setView('studentMarks');
    };
    
    const handleBackToAssessments = () => {
        setSelectedAssessment(null);
        setView('assessments');
    };
    
    const getStatusInfo = (assessment) => {
        const now = new Date();
        const openDateTime = new Date(`${assessment.openDate}T${assessment.openTime}`);
        const closeDateTime = new Date(`${assessment.closeDate}T${assessment.closeTime}`);
        if (now < openDateTime) return { text: 'Upcoming', color: 'bg-indigo-100 text-indigo-800', icon: <Clock size={16} /> };
        if (now > closeDateTime) return { text: 'Closed', color: 'bg-red-100 text-red-800', icon: <XCircle size={16} /> };
        return { text: 'Active', color: 'bg-green-100 text-green-800', icon: <CheckCircle size={16} /> };
    };
    
    if (view === 'studentMarks') {
        return <StudentMarks assessment={selectedAssessment} onBack={handleBackToAssessments} />;
    }

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            <div>
                <h1 className="text-xl font-medium text-slate-800">Assessment & Results</h1>
                <p className="text-slate-500 mt-1">View your created assessments or check overall student results.</p>
            </div>
            
            <div className="border-b border-slate-200">
                <nav className="flex gap-4 -mb-px">
                    <button onClick={() => setView('assessments')} className={`px-1 py-3 border-b-2 text-sm font-semibold ${view === 'assessments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>My Assessments</button>
                    <button onClick={() => setView('results')} className={`px-1 py-3 border-b-2 text-sm font-semibold ${view === 'results' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Student Results</button>
                </nav>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

            {view === 'assessments' && (
                assessmentsLoading ? <Loader /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assessments.length > 0 ? assessments.map(assessment => {
                            const status = getStatusInfo(assessment);
                            return (
                                <div key={assessment._id} onClick={() => handleAssessmentClick(assessment)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800 pr-4">{assessment.name}</h3>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${status.color}`}>{status.icon}{status.text}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-2">{assessment.subjectName}</p>
                                    <div className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100 space-y-2">
                                        <p><strong>Open:</strong> {new Date(assessment.openDate).toLocaleDateString()} at {assessment.openTime}</p>
                                        <p><strong>Close:</strong> {new Date(assessment.closeDate).toLocaleDateString()} at {assessment.closeTime}</p>
                                        <p><strong>Marks:</strong> {assessment.marks}</p>
                                    </div>
                                </div>
                            )
                        }) : <p className="col-span-full text-center py-10 text-slate-500">No assessments found.</p>}
                    </div>
                )
            )}

            {view === 'results' && (
                resultsLoading ? <Loader /> : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase">Assessment</th>
                                        <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase">Student ID</th>
                                        <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase">Score</th>
                                        <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase">Percentage</th>
                                        <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {studentResults.length > 0 ? studentResults.map(result => (
                                        <tr key={result._id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-slate-800">{result.assessmentTitle}</td>
                                            <td className="px-6 py-4 text-slate-600">{result.studentId}</td>
                                            <td className="px-6 py-4 text-center font-bold text-blue-600">{result.totalMarks}/{result.totalPossibleMarks}</td>
                                            <td className="px-6 py-4 text-center text-slate-600">{result.percentage}%</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${result.status_com === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{result.status_com}</span>
                                            </td>
                                        </tr>
                                    )) : <td colSpan="5" className="text-center py-10 text-slate-500">No student results available.</td>}
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