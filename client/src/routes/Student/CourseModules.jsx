import axios from 'axios';
import { BookX, Search } from 'lucide-react'; // Icons for search and empty state
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader'; // Global loading spinner component
import CourseCard from '../../components/CourseCard'; // Card component for courses
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * CourseModules component displays a list of all available course modules.
 * It allows users to search and filter courses and navigate to their details.
 *
 * @returns {JSX.Element} The course modules listing UI.
 */
const CourseModules = () => {
    // State to store the list of subjects (courses).
    const [subjects, setSubjects] = useState([]);
    // State to manage overall loading status.
    const [isLoading, setIsLoading] = useState(true);
    // State to store any error messages during data fetching.
    const [error, setError] = useState(null);
    // State for the search term entered by the user.
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate(); // Hook for programmatic navigation.

    /**
     * Effect hook to fetch all subjects on component mount.
     * Redirects to login if no authentication token is found.
     */
    useEffect(() => {
        const fetchSubjects = async () => {
            setIsLoading(true); // Start loading state.
            try {
                const token = sessionStorage.getItem("token");
                if (!token) {
                    navigate('/login'); // Redirect if not authenticated.
                    return;
                }
                // Fetch all subjects from the API.
                const response = await axios.get(`${API_BASE_URL}/subjects/`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });
                setSubjects(response.data); // Set fetched subjects.
            } catch (err) {
                console.error("Error fetching subjects:", err);
                // Set error message from API response or a generic one.
                setError(err.response?.data?.message || "Failed to fetch subjects.");
            } finally {
                setIsLoading(false); // End loading state.
            }
        };
        fetchSubjects();
    }, [navigate]); // Dependency: navigate function.

    /**
     * Filters subjects based on the current search term (case-insensitive).
     * This re-calculates whenever `subjects` or `searchTerm` changes.
     */
    const filteredSubjects = subjects.filter(subject =>
        subject.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Display global loading spinner.
    if (isLoading) {
        return <Loader />;
    }

    // Display error message if data fetching failed.
    if (error) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Something went wrong</h3>
                <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div>
                <h1 className="text-2xl font-medium text-slate-800 dark:text-white">All Modules</h1>
                <p className="text-slate-500 dark:text-gray-400 mt-1">Browse all available course modules for your program.</p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search for a course by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm pl-10 pr-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"
                />
            </div>

            {/* Courses Grid Section */}
            <div className='bg-white dark:bg-gray-800 p-5 rounded-lg border border-slate-200 dark:border-gray-700 flex flex-col'>
                {filteredSubjects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {filteredSubjects.map((subject) => (
                            <CourseCard
                                key={subject._id}
                                // Dynamic placeholder image based on subject name for variety.
                                image={`https://source.unsplash.com/random/400x300?education,${subject.name.split(' ')[0]}`}
                                title={subject.name}
                                description={subject.description || 'No description available for this course.'}
                                staff={subject.staff || 'Staff not assigned'}
                                subjectId={subject._id}
                            />
                        ))}
                    </div>
                ) : (
                    // Empty State: Shown when no results match the search or no subjects exist.
                    <div className="flex flex-col items-center justify-center text-center py-20 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
                        <BookX className="w-16 h-16 text-slate-400 dark:text-gray-500 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700 dark:text-gray-200">No Courses Found</h3>
                        <p className="text-slate-500 dark:text-gray-400 mt-2 max-w-sm">
                            {searchTerm
                                ? "No courses match your search criteria. Try a different name."
                                : "There are no courses assigned to your program at this time."
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseModules;
