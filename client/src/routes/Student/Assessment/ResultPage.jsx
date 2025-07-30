import axios from 'axios';
import jsPDF from 'jspdf'; // Step 1: Import jspdf
import html2canvas from 'html2canvas'; // Step 1: Import html2canvas
import {
    AlertTriangle, ArrowLeft,
    Printer, Download // Step 2: Import Download icon for better UX
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react'; // Step 3: Import useRef
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../../components/Loader';
import AnswerBreakdown from '../../../components/AnswerBreakdown';
import { useBreadcrumbContext } from '../../../contexts/BreadcrumbContext';

const InlineSpinner = () => (
    <div className="w-4 h-4 border-2 border-white border-solid rounded-full border-t-transparent animate-spin"></div>
);

const ResultPage = () => {
    const { assessmentId } = useParams();
    const navigate = useNavigate();

    const [resultData, setResultData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false); // Step 4: Add state for download
    const [error, setError] = useState(null);
    const { setCrumbs } = useBreadcrumbContext();
    const pdfContentRef = useRef(null); // Step 5: Create a ref to target the content

    useEffect(() => {
        const fetchResultPageData = async () => {
            setIsLoading(true);
            try {
                const token = sessionStorage.getItem("token");
                const response = await axios.get(`http://localhost:5000/api/v1/results/${assessmentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setResultData(response.data);
                setCrumbs([
                    { name: 'Assessments', path: '/assessments' },
                    { name: 'Results', path: `/results/${assessmentId}` }
                ]);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load results.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchResultPageData();
        
        return () => {
            setCrumbs([]);
        };
    }, [assessmentId, navigate, setCrumbs]);

    // Step 6: Create the PDF download handler
    const handleDownloadPdf = () => {
        const input = pdfContentRef.current;
        if (!input) return;

        setIsDownloading(true);
        // Use html2canvas to capture the content. We increase the scale for better quality.
        html2canvas(input, { scale: 2, useCORS: true })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                
                // A4 page dimensions in mm: 210 x 297
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const canvasAspectRatio = canvasWidth / canvasHeight;

                const pdfAspectRatio = pdfWidth / pdfHeight;

                let imgWidth = pdfWidth;
                let imgHeight = pdfWidth / canvasAspectRatio;

                // Handle content that might be longer than one page
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }

                const assessmentName = resultData?.assessment?.name || 'assessment';
                const safeFileName = assessmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

                pdf.save(`results-${safeFileName}.pdf`);
            })
            .catch(err => {
                console.error("Could not generate PDF", err);
                // Optionally show an error message to the user
            })
            .finally(() => {
                setIsDownloading(false);
            });
    };

    if (isLoading) return <Loader />;

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-md text-center p-6 bg-white rounded-lg shadow-md border border-red-200">
                    <AlertTriangle className="mx-auto w-12 h-12 text-red-500 mb-4" />
                    <h2 className="text-lg font-semibold text-red-800">Error Loading Results</h2>
                    <p className="text-red-600 mt-2">{error}</p>
                    <button onClick={() => navigate(-1)} className="mt-6 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">Go Back</button>
                </div>
            </div>
        );
    }

    if (!resultData) return <div className="p-6 text-center">No result data found.</div>;

    const { result, assessment, stats } = resultData;
    const { totalPossibleMarks, percentageScore } = stats;
    const isPass = percentageScore >= 40;
    const incorrectAnswers = stats.totalQuestions - stats.correctAnswers;

    const StatItem = ({ label, value, valueClass = 'text-slate-800', children }) => (
        <div className="text-center px-4">
            <p className="text-sm text-slate-500 uppercase">{label}</p>
            <div className={`text-xl font-semibold ${valueClass}`}>
                {children || value}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Step 7: Attach the ref to the main content wrapper */}
            <div ref={pdfContentRef}>
                {/* Header */}
                <div className="border-b border-slate-200 pb-4">
                    <p className="text-slate-700 font-semibold text-xl mt-1">{assessment.name}</p>
                </div>

                {/* Main container for stats and summary cards */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8">
                    <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-6">
                        Performance Summary
                    </h3>
                    
                    <div className="flex flex-wrap items-center justify-center lg:justify-between gap-y-6 gap-x-4">
                        <StatItem label="Total Score"><p>{result.totalMarks} / {totalPossibleMarks}</p></StatItem>
                        <div className="h-10 w-px bg-slate-200 hidden lg:block"></div>
                        <StatItem label="Percentage"><p className="text-blue-600">{percentageScore}%</p></StatItem>
                        <div className="h-10 w-px bg-slate-200 hidden lg:block"></div>
                        <StatItem label="Status">
                            <div className={`inline-flex items-center gap-2 ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                                <span>{isPass ? 'Pass' : 'Fail'}</span>
                            </div>
                        </StatItem>
                        <div className="h-10 w-px bg-slate-200 hidden lg:block"></div>
                        <StatItem label="Correct" value={stats.correctAnswers} valueClass="text-green-600" />
                        <div className="h-10 w-px bg-slate-200 hidden lg:block"></div>
                        <StatItem label="Incorrect" value={incorrectAnswers} valueClass="text-red-600" />
                        <div className="h-10 w-px bg-slate-200 hidden lg:block"></div>
                        <StatItem label="Total Qs" value={stats.totalQuestions} valueClass="text-slate-700" />
                    </div>
                </div>

                <div className="mt-8">
                    <AnswerBreakdown results={result.results} />
                </div>
            </div>
            
            {/* Action Buttons (outside the ref so they don't appear in the PDF) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <button onClick={() => navigate('/dashboard')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-semibold hover:bg-slate-300 transition-colors">
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </button>
                {/* Step 8: Update the button to call the new handler */}
                <button 
                    onClick={handleDownloadPdf} 
                    disabled={isDownloading}
                    className="w-full sm:w-44 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 disabled:opacity-70 disabled:cursor-wait"
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