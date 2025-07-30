import axios from 'axios';
import {
    Mail,
    MapPin,
    Phone
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FullScreenLoader from '../../components/Loader';
import CourseCard from '../../components/coursecard';
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext';

const Assessment = () => { // Renamed for clarity, you can keep it as Assessment
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedClub, setSelectedClub] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {setCrumbs} = useBreadcrumbContext();
    
    const navigate = useNavigate();

    const clubs = ['Robotics Club', 'AI Club', 'Coding Club', 'Music Club', 'Debate Club', 'E-Sports Club'];

    useEffect(() => {

        setCrumbs([
            { name: 'Assessments', path: '/assessments' }
        ]);

        const fetchHomePageData = async () => {
            setLoading(true);
            try {
                const token = sessionStorage.getItem("token");
                const response = await axios.get('http://localhost:5000/api/v1/homepage/data', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPageData(response.data);
                setSelectedClub(response.data.club || '');
            } catch (err) {
                console.error("Error fetching homepage data:", err);
                setError(err.response?.data?.message || "Failed to load page data.");
            } finally {
                setLoading(false);
            }
        };
        fetchHomePageData();
    }, [navigate, setCrumbs]);

    const handleClubSubmit = async () => {
        const studentId = pageData?.userDetails?.student_id;
        if (!selectedClub || !studentId) {
            alert("Please select a club first.");
            return;
        }
        setIsSubmitting(true);
        try {
            const token = sessionStorage.getItem("token");
            await axios.put(`http://localhost:5000/api/v1/users/${studentId}/club`, 
                { club: selectedClub },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setPageData(prevData => ({ ...prevData, club: selectedClub }));
            alert("Club updated successfully!");
        } catch (error) {
            console.error("Error updating club:", error);
            alert(error.response?.data?.message || "Failed to update club.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Reusable Card components for UI consistency, same as Dashboard
    const Card = ({ children, className = '' }) => (
        <div className={`bg-white p-5 rounded-lg border border-slate-200 flex flex-col ${className}`}>
          {children}
        </div>
    );
    
    const CardTitle = ({ children }) => (
        <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">
          {children}
        </h3>
    );

    if (loading) return <FullScreenLoader />;
    if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>;
    if (!pageData) return <div className="p-6 text-center">No data found.</div>;

    const { subjects, club: currentClub } = pageData;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Top Row: Announcement and Rules */}
            <Card>
                <CardTitle>ATTENTION ALL STUDENTS</CardTitle>
                <div className='flex items-start gap-4'>
                <p className="text-slate-600 text-sm">The English assessment portal will be temporarily unavailable on August 30th from 10:00 AM to 12:30 PM for scheduled maintenance. Please plan accordingly.</p>
                </div>
            </Card>

            <Card>
                <CardTitle>Assessment Rules</CardTitle>
                <ul className="space-y-3 text-sm text-slate-600 list-disc list-inside flex-1">
                    <li>Complete the assessment within the allotted time.</li>
                    <li>Once you submit an answer, it cannot be changed.</li>
                    <li>Work independently without any external help.</li>
                </ul>
            </Card>

            <Card>
                <CardTitle>Join a Club</CardTitle>
                <div className="flex-1 flex flex-col">
                    <p className="text-sm text-slate-600 mb-4 flex-grow">Your current selection is <span className="font-bold">{currentClub || 'none'}</span>. You can join a club or change your selection here.</p>
                    <div className="space-y-3">
                        <select value={selectedClub} onChange={(e) => setSelectedClub(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            <option value="">-- Select a Club --</option>
                            {clubs.map((club) => <option key={club} value={club}>{club}</option>)}
                        </select>
                        <button 
                            onClick={handleClubSubmit} 
                            disabled={isSubmitting || selectedClub === currentClub || !selectedClub}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Saving..." : "Save Selection"}
                        </button>
                    </div>
                </div>
            </Card>

            {/* Middle Row: Courses and Club Selection */}
            <Card className="lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3border-slate-200">My Courses</h2>
                    <a href="/courses" className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 transition">
                        View all
                    </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {subjects && subjects.length > 0 ? (
                        subjects.slice(0, 3).map((subject) => (
                            <CourseCard
                                key={subject._id}
                                image={`https://source.unsplash.com/random/400x300?course,study,${subject.name.split(' ')[0]}`}
                                title={subject.name}
                                description={subject.description || "No description available."}
                                staff={subject.staff || "Staff not assigned"}
                                subjectId={subject._id}
                            />
                        ))
                    ) : (
                        <p className="sm:col-span-2 xl:col-span-3 text-center py-10 text-slate-500">No subjects available to display.</p>
                    )}
                </div>
            </Card>

            {/* Bottom Row: Feedback, Contact, Report */}
            <Card>
                <CardTitle>Send Feedback</CardTitle>
                <p className='flex items-center gap-4 text-sm text-slate-600'>Share your thoughts or suggestions. We value your input to help us improve.</p>
            </Card>
            
            <Card>
                <CardTitle>Report a Bug</CardTitle>
                    <p className='flex items-center gap-4 text-sm text-slate-600'>Encountered an issue? Let us know so we can fix it and improve the experience.</p>
            </Card>

            <Card>
                <CardTitle>Contact</CardTitle>
                <p className='flex items-center gap-4 text-sm text-slate-600'><span className="text-sm text-blue-600"><Phone size={15}/></span>0427 222-0-2224</p>
                <p className='flex items-center gap-4 text-sm text-slate-600 mt-2'><span className="text-sm text-blue-600"><Mail size={15}/></span>weacttech@gmail.com</p>
                <p className='flex items-center gap-4 text-sm text-slate-600 mt-2'><span className="text-sm text-blue-600"><MapPin size={15}/></span>Erode, TN, IN</p>
            </Card>
        </div>
    );
};

export default Assessment;