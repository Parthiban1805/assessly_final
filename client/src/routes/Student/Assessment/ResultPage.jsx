// File: src/pages/student/Results/ResultPage.jsx
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
    AlertTriangle, ArrowLeft,
    Download, Lock
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../../components/Loader';
import AnswerBreakdown from '../../../components/AnswerBreakdown';
import { useBreadcrumbContext } from '../../../contexts/BreadcrumbContext';
import { API_BASE_URL } from '../../../config/constants';

const InlineSpinner = () => (
    <div className="w-4 h-4 border-2 border-white border-solid rounded-full border-t-transparent animate-spin"></div>
);

const ResultPage = () => {
    const { assessmentId } = useParams();
    const navigate = useNavigate();

    const [resultData, setResultData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);
    const { setCrumbs } = useBreadcrumbContext();
    const pdfContentRef = useRef(null);

    useEffect(() => {
        const fetchResultPageData = async () => {
            setIsLoading(true);
            try {
                const token = sessionStorage.getItem("token");
                if (!token) {
                    navigate('/login');
                    return;
                }
                const response = await axios.get(`${API_BASE_URL}/results/${assessmentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setResultData(response.data);

                setCrumbs([
                    { name: 'Assessments', path: '/assessments' },
                    { name: `Results (${response.data.assessment.name})`, path: `/results/${assessmentId}` }
                ]);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load results.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchResultPageData();

        return () => setCrumbs([]);
    }, [assessmentId, navigate, setCrumbs]);
    
    // handleDownloadPdf function remains unchanged...
    const handleDownloadPdf = () => { /* ... */ };

    if (isLoading) return <Loader />;

    if (error) {
        // Error display remains unchanged...
        return ( <div className="text-center text-red-500">{error}</div> );
    }

    if (!resultData) return <div className="p-6 text-center text-slate-500">No result data found.</div>;

    const { result, assessment, stats, displayIsEnabled } = resultData;

    // --- NEW LOGIC: Main conditional rendering based on the setting ---
    if (!displayIsEnabled) {
        // If display is OFF, show this minimal UI
        return (
            <div className="space-y-8">
                {/* Header with assessment name */}
                <div className="border-b border-slate-200 dark:border-gray-700 pb-4">
                    <p className="text-slate-700 dark:text-gray-200 font-semibold text-xl mt-1">{assessment.name}</p>
                </div>

                {/* The "Results Hidden" message card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm p-8 text-center">
                    <Lock className="mx-auto w-10 h-10 text-slate-400 dark:text-gray-500 mb-4" />
                    <h3 className="font-semibold text-slate-800 dark:text-white">Results Are Hidden</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        The administrator has currently disabled access to performance results.
                    </p>
                </div>

                {/* Only show the "Back to Dashboard" button */}
                <div className="flex items-center justify-center pt-6">
                    <button onClick={() => navigate('/dashboard')} className="flex items-center justify-center gap-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }
    
    // --- This part of the code will ONLY run if displayIsEnabled is TRUE ---
    const totalPossibleMarks = stats?.totalPossibleMarks ?? 0;
    const percentageScore = stats?.percentageScore ?? 0;
    const isPass = percentageScore >= 40;
    const incorrectAnswers = (stats?.totalQuestions ?? 0) - (stats?.correctAnswers ?? 0);

    const StatItem = ({ label, value, valueClass = 'text-slate-800 dark:text-white', children }) => (
        <div className="text-center px-4">
            <p className="text-sm text-slate-500 dark:text-gray-400 uppercase">{label}</p>
            <div className={`text-xl font-semibold ${valueClass}`}>{children || value}</div>
        </div>
    );
    
    return (
        <div className="space-y-8">
            <div ref={pdfContentRef}>
                <div className="border-b border-slate-200 dark:border-gray-700 pb-4">
                    <p className="text-slate-700 dark:text-gray-200 font-semibold text-xl mt-1">{assessment.name}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm mt-8">
                    <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-6">Performance Summary</h3>
                    <div className="flex flex-wrap items-center justify-center lg:justify-between gap-y-6 gap-x-4">
                        <StatItem label="Total Score"><p>{stats.totalScore} / {totalPossibleMarks}</p></StatItem>
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700 hidden lg:block"></div>
                        <StatItem label="Percentage"><p className="text-blue-600 dark:text-blue-400">{percentageScore}%</p></StatItem>
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700 hidden lg:block"></div>
                        <StatItem label="Status"><div className={`inline-flex items-center gap-2 ${isPass ? 'text-green-600' : 'text-red-600'}`}><span>{isPass ? 'Pass' : 'Fail'}</span></div></StatItem>
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700 hidden lg:block"></div>
                        <StatItem label="Correct" value={stats.correctAnswers} valueClass="text-green-600" />
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700 hidden lg:block"></div>
                        <StatItem label="Incorrect" value={incorrectAnswers} valueClass="text-red-600" />
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700 hidden lg:block"></div>
                        <StatItem label="Total Qs" value={stats.totalQuestions} />
                    </div>
                </div>
                <div className="mt-8">
                    <AnswerBreakdown results={result.results} />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <button onClick={() => navigate('/dashboard')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors">
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
                <button onClick={handleDownloadPdf} disabled={isDownloading} className="w-full sm:w-44 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-wait">
                    {isDownloading ? (<><InlineSpinner /><span>Generating...</span></>) : (<><Download size={16} /><span>Download PDF</span></>)}
                </button>
            </div>
        </div>
    );
};

export default ResultPage;