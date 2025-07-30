import axios from 'axios';
import { ArrowRight, Calendar, CheckCircle, Circle, Clock, FileText, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../../components/Loader';

const AssessmentHandler = () => {
    const { assessmentId } = useParams();
    const navigate = useNavigate();
    const [pageData, setPageData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHandlerData = async () => {
            setIsLoading(true);
            try {
                const token = sessionStorage.getItem("token");
                const response = await axios.get(`http://localhost:5000/api/v1/assessments/${assessmentId}/handler-data`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPageData(response.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load assessment data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchHandlerData();
    }, [assessmentId, navigate]);

    const handleButtonClick = () => {
        if (pageData?.status === 'completed' && pageData?.settings?.displayAnswers) {
            navigate(`/results/${assessmentId}`);
        } else {
            navigate(`/instructions/${assessmentId}`);
        }
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Define status styles for better readability
    const statusInfo = {
        completed: { text: "Completed", icon: <CheckCircle className="text-green-500" size={18}/>, color: "text-green-600" },
        'in-progress': { text: "In Progress", icon: <Clock className="text-amber-500" size={18}/>, color: "text-amber-600" },
        'not-found': { text: "Not Found", icon: <XCircle className="text-red-500" size={18}/>, color: "text-red-600" },
        default: { text: "Ready to Start", icon: <Circle className="text-blue-500" size={18}/>, color: "text-blue-600" },
    };
    
    const currentStatus = statusInfo[pageData?.status] || statusInfo.default;

    if (isLoading) return <Loader />;

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-md text-center p-6 bg-white rounded-lg shadow-md border border-red-200">
                    <XCircle className="mx-auto w-12 h-12 text-red-500 mb-4" />
                    <h2 className="text-lg font-semibold text-red-800">An Error Occurred</h2>
                    <p className="text-red-600 mt-2">{error}</p>
                    <button onClick={() => navigate(-1)} className="mt-6 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">Go Back</button>
                </div>
            </div>
        );
    }
    
    if (!pageData || !pageData.assessmentDetails) {
        return <div className="flex items-center justify-center min-h-screen">No assessment data found.</div>;
    }

    const { assessmentDetails } = pageData;

    return (
        <div className='flex items-center justify-center h-screen bg-slate-50 p-4'>
            <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="py-4 px-6 border-b border-slate-200">
                    <h2 className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex-shrink-0">Assessment Confirmation</h2>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Assessment Name</p>
                        <p className="text-lg font-semibold text-slate-800">{assessmentDetails.name}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div>
                            <p className="text-sm font-medium text-slate-500 flex items-center gap-2"><Calendar size={14} /> Open Date & Time</p>
                            <p className="font-semibold text-slate-700">{formatDate(assessmentDetails.openDate)}, {formatTime(assessmentDetails.openTime)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 flex items-center gap-2"><Calendar size={14} /> Close Date & Time</p>
                            <p className="font-semibold text-slate-700">{formatDate(assessmentDetails.closeDate)}, {formatTime(assessmentDetails.closeTime)}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-sm font-medium text-slate-500">Status</p>
                        <div className={`flex items-center gap-2 font-medium ${currentStatus.color}`}>
                            {currentStatus.icon}
                            <span>{currentStatus.text}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <button 
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-slate-400"
                        onClick={handleButtonClick}
                        disabled={pageData.status === 'completed' && !pageData.settings.displayAnswers}
                    >
                        <span>{pageData.status === 'completed' ? 'View Result' : 'Proceed to Instructions'}</span>
                    </button>
                    {pageData.status === 'completed' && !pageData.settings.displayAnswers && (
                        <p className="text-xs text-center text-slate-500 mt-2">Results are not yet published for this assessment.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssessmentHandler;