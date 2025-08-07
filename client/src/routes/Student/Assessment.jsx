import axios from 'axios';
import {
    Mail,
    MapPin,
    Phone
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullScreenLoader from '../../components/Loader'; // Full screen loading component
import CourseCard from '../../components/CourseCard'; // Card component for courses
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext'; // Breadcrumb context hook
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * Assessment (Student Dashboard) component displays general student information,
 * announcements, course modules, and options to join clubs, send feedback, etc.
 *
 * @returns {JSX.Element} The student assessment dashboard UI.
 */
const Assessment = () => {
    // State to hold all fetched page data.
    const [pageData, setPageData] = useState(null);
    // State to manage overall loading status.
    const [loading, setLoading] = useState(true);
    // State to store any error messages during data fetching.
    const [error, setError] = useState(null);
    // State for the selected club in the dropdown.
    const [selectedClub, setSelectedClub] = useState('');
    // State to indicate if club submission is in progress.
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { setCrumbs } = useBreadcrumbContext(); // Hook to set breadcrumbs.

    const navigate = useNavigate(); // Hook for programmatic navigation.

    // Mock data for clubs (can be fetched from backend if dynamic).
    const clubs = ['Robotics Club', 'AI Club', 'Coding Club', 'Music Club', 'Debate Club', 'E-Sports Club'];

    /**
     * Effect hook to fetch homepage data for the student on component mount.
     * Sets breadcrumbs and populates club selection.
     */
    useEffect(() => {
        setCrumbs([
            { name: 'Assessments', path: '/assessments' } // Set static breadcrumb for this page.
        ]);

        const fetchHomePageData = async () => {
            setLoading(true); // Start loading state.
            try {
                const token = sessionStorage.getItem("token");
                // Fetch homepage data from the API.
                const response = await axios.get(`${API_BASE_URL}/homepage/data`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });
                setPageData(response.data); // Set fetched data.
                setSelectedClub(response.data.club || ''); // Set initial selected club from user data.
            } catch (err) {
                console.error("Error fetching homepage data:", err);
                // Set error message from API response or a generic one.
                setError(err.response?.data?.message || "Failed to load page data.");
            } finally {
                setLoading(false); // End loading state.
            }
        };
        fetchHomePageData();
    }, [navigate, setCrumbs]); // Dependencies: navigate (for potential redirects), setCrumbs (for breadcrumbs).

    /**
     * Handles submission of the selected club for the student.
     * Updates the student's club preference in the backend.
     */
    const handleClubSubmit = async () => {
        const studentId = pageData?.userDetails?.student_id;
        if (!selectedClub || !studentId) {
            alert("Please select a club first.");
            return;
        }
        setIsSubmitting(true); // Disable button during submission.
        try {
            const token = sessionStorage.getItem("token");
            // Send PUT request to update student's club.
            await axios.put(`${API_BASE_URL}/users/${studentId}/club`,
                { club: selectedClub },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setPageData(prevData => ({ ...prevData, club: selectedClub })); // Update local state.
            alert("Club updated successfully!");
        } catch (error) {
            console.error("Error updating club:", error);
            alert(error.response?.data?.message || "Failed to update club.");
        } finally {
            setIsSubmitting(false); // Re-enable button.
        }
    };

    /**
     * Reusable Card component for UI consistency across the dashboard.
     * @param {object} props - Component props.
     * @param {React.ReactNode} props.children - Content of the card.
     * @param {string} [props.className] - Optional additional CSS classes.
     * @returns {JSX.Element} A styled card container.
     */
    const Card = ({ children, className = '' }) => (
        <div className={`bg-white dark:bg-gray-800 p-5 rounded-lg border border-slate-200 dark:border-gray-700 flex flex-col ${className}`}>
          {children}
        </div>
    );

    /**
     * Reusable CardTitle component for consistent card header styling.
     * @param {object} props - Component props.
     * @param {React.ReactNode} props.children - Title text.
     * @returns {JSX.Element} A styled card title.
     */
    const CardTitle = ({ children }) => (
        <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700 flex-shrink-0">
          {children}
        </h3>
    );

    // Display full screen loader while data is loading.
    if (loading) return <FullScreenLoader />;
    // Display error message if data fetching failed.
    if (error) return <div className="p-6 text-center text-red-600 dark:text-red-400">Error: {error}</div>;
    // If no pageData is available after loading, display a message.
    if (!pageData) return <div className="p-6 text-center text-slate-500 dark:text-gray-400">No data found.</div>;

    const { subjects, club: currentClub, userDetails } = pageData; // Destructure necessary data, including userDetails for student_id

    // Construct mailto links dynamically with student ID
    const studentIdForEmail = userDetails?.student_id ? `Student ID: ${userDetails.student_id}` : '';
    const feedbackMailto = `mailto:weacttech@gmail.com?subject=${encodeURIComponent('Feedback from Assessly Student Dashboard')}&body=${encodeURIComponent(`Dear Assessly Team,\n\nI would like to provide the following feedback:\n\n[Your feedback here]\n\n${studentIdForEmail}`)}`;
    const bugReportMailto = `mailto:weacttech@gmail.com?subject=${encodeURIComponent('Bug Report from Assessly Student Dashboard')}&body=${encodeURIComponent(`Dear Assessly Team,\n\nI have encountered a bug:\n\n**Description:** [Describe the bug in detail]\n**Steps to Reproduce:**\n1.\n2.\n3.\n**Expected Behavior:**\n**Actual Behavior:**\n**Browser/Device:** [e.g., Chrome on Windows 10, Safari on iPhone]\n\n${studentIdForEmail}\n\nThank you.`)}`;


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Top Row: Announcement and Rules */}
            <Card>
                <CardTitle>ATTENTION ALL STUDENTS</CardTitle>
                <div className='flex items-start gap-4'>
                <p className="text-slate-600 dark:text-gray-300 text-sm">You’re using an early version of Assessly. Some features may be limited or subject to change.</p>
                </div>
            </Card>

            <Card>
                <CardTitle>Assessment Rules</CardTitle>
                <ul className="space-y-3 text-sm text-slate-600 dark:text-gray-300 list-disc list-inside flex-1">
                    <li>Complete the assessment within the allotted time.</li>
                    <li>Once you submit an answer, it cannot be changed.</li>
                    <li>Work independently without any external help.</li>
                </ul>
            </Card>

            <Card>
                <CardTitle>Join a Club</CardTitle>
                <div className="flex-1 flex flex-col">
                    <p className="text-sm text-slate-600 dark:text-gray-300 mb-4 flex-grow">Your current selection is <span className="font-bold">{currentClub || 'none'}</span>. You can join a club or change your selection here.</p>
                    <div className="space-y-3">
                        <select value={selectedClub} onChange={(e) => setSelectedClub(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                            <option value="">-- Select a Club --</option>
                            {clubs.map((club) => <option key={club} value={club}>{club}</option>)}
                        </select>
                        <button
                            onClick={handleClubSubmit}
                            disabled={isSubmitting || selectedClub === currentClub || !selectedClub}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Saving..." : "Save Selection"}
                        </button>
                    </div>
                </div>
            </Card>

            {/* Middle Row: Courses */}
            <Card className="lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3border-slate-200">My Courses</h2>
                    <a href="/courses" className="flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">
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
                        <p className="sm:col-span-2 xl:col-span-3 text-center py-10 text-slate-500 dark:text-gray-400">No subjects available to display.</p>
                    )}
                </div>
            </Card>

            {/* Bottom Row: Feedback, Contact, Report */}
            <Card>
                <CardTitle>Send Feedback</CardTitle>
                <p className='flex items-center gap-4 text-sm text-slate-600 dark:text-gray-300 mb-4'>Share your thoughts or suggestions. We value your input to help us improve.</p>
                <a
                    href={feedbackMailto}
                    className="w-full text-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors"
                    target="_blank" // Opens in a new tab/email client
                    rel="noopener noreferrer" // Security best practice for target="_blank"
                >
                    Email Feedback
                </a>
            </Card>

            <Card>
                <CardTitle>Report a Bug</CardTitle>
                <p className='flex items-center gap-4 text-sm text-slate-600 dark:text-gray-300 mb-4'>Encountered an issue? Let us know so we can fix it and improve the experience.</p>
                <a
                    href={bugReportMailto}
                    className="w-full text-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors"
                    target="_blank" // Opens in a new tab/email client
                    rel="noopener noreferrer" // Security best practice for target="_blank"
                >
                    Report Bug
                </a>
            </Card>

            <Card>
                <CardTitle>Contact</CardTitle>
                <p className='flex items-center gap-4 text-sm text-slate-600 dark:text-gray-300'><span className="text-sm text-blue-600 dark:text-blue-400"><Phone size={15}/></span>0427 222-0-2224</p>
                <p className='flex items-center gap-4 text-sm text-slate-600 dark:text-gray-300 mt-2'><span className="text-sm text-blue-600 dark:text-blue-400"><Mail size={15}/></span>weacttech@gmail.com</p>
                <p className='flex items-center gap-4 text-sm text-slate-600 dark:text-gray-300 mt-2'><span className="text-sm text-blue-600 dark:text-blue-400"><MapPin size={15}/></span>Erode, TN, IN</p>
            </Card>
        </div>
    );
};

export default Assessment;