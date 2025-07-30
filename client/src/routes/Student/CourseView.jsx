import axios from 'axios';
import { BookOpenCheck, CalendarClock, ChevronLeft, ChevronRight, Frown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../components/Loader';
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext';

// A helper function to format dates and times nicely
const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return "Not specified";
    try {
        const date = new Date(dateStr);
        // Using toLocaleDateString for a user-friendly format (e.g., "Oct 27, 2023")
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        // A simple way to format time if it's in HH:MM format
        return `${formattedDate}, ${timeStr}`;
    } catch (e) {
        return "Invalid Date";
    }
};

const CourseView = () => {
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const [courseDetails, setCourseDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { setCrumbs } = useBreadcrumbContext();

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5); // State for items per page

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
                const response = await axios.get(`http://localhost:5000/api/v1/subjects/${subjectId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setCourseDetails(response.data);
                setCurrentPage(1); 
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

    // Reset to page 1 if itemsPerPage changes
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    const handleAssessmentClick = (assessmentId) => navigate(`/assessments/${assessmentId}`);
    
    const handleNavigateBack = () => navigate(-1);

    // --- Pagination Logic ---
    const totalAssessments = courseDetails?.assessments?.length || 0;
    const totalPages = Math.ceil(totalAssessments / itemsPerPage);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    
    const currentAssessments = courseDetails?.assessments?.slice(indexOfFirstItem, indexOfLastItem) || [];

    if (loading) {
        return <Loader />;
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-red-700">An Error Occurred</h3>
                <p className="text-red-600 mt-2">{error}</p>
                <button onClick={handleNavigateBack} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">Go Back</button>
            </div>
        );
    }

    if (!courseDetails) {
        return <div className="p-6 text-center text-slate-500">No course details found.</div>
    }

    return (
        <div className='space-y-6'>
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-medium text-slate-800">{courseDetails.name}</h1>
                <p className="text-slate-500 mt-1">{courseDetails.description || 'Welcome to the course module.'}</p>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-200">
                    <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex-shrink-0">Available Assessments</h3>
                </div>

                <div className="divide-y divide-slate-200">
                    {currentAssessments.length > 0 ? (
                        currentAssessments.map((assessment) => (
                            <div 
                                key={assessment._id} 
                                className="p-5 hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => handleAssessmentClick(assessment._id)}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 flex-shrink-0">
                                            <BookOpenCheck className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-medium text-slate-800 hover:text-blue-600">{assessment.name}</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium pl-0 sm:pl-16">
                                        <CalendarClock size={16} className="text-slate-400" />
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
                            <Frown className="w-16 h-16 text-slate-400 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700">No Assessments Available</h3>
                            <p className="text-slate-500 mt-2 max-w-sm">
                                There are no assessments scheduled for this course at the moment. Please check back later.
                            </p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                  <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>Show</span>
                      <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 rounded-md">
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                      <span>entries</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 disabled:opacity-50"><ChevronLeft size={20}/></button>
                      <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 disabled:opacity-50"><ChevronRight size={20}/></button>
                    </div>
                  </div>
                )}
            </div>
        </div>
    );
};

export default CourseView;