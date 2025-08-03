import axios from 'axios';
import { BookText, BookX, Download } from 'lucide-react'; // Icons for study materials and download
import { useEffect, useState } from 'react';
import Loader from '../../components/Loader'; // Global loading spinner
import { useAuth } from '../../contexts/AuthContext'; // Authentication context hook
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * Studymaterial component displays study materials relevant to the authenticated student's
 * department and academic year. It fetches materials from the backend and provides download links.
 *
 * @returns {JSX.Element} The study materials listing UI.
 */
const Studymaterial = () => {
    // State to store the list of subjects with their study materials.
    const [subjects, setSubjects] = useState([]);
    // State to manage overall loading status.
    const [isLoading, setIsLoading] = useState(true);
    // State to store any error messages during data fetching.
    const [error, setError] = useState(null);
    const { user } = useAuth(); // Get authenticated user details directly from the AuthContext.

    // Mapping for department names from backend format to a more human-readable or consistent format if needed.
    // This mapping can be moved to a utility file if used elsewhere.
    const departmentMapping = {
        "B.Sc Cyber Security": "Cyber Security",
        "B.Sc IT": "IT",
        "B.Sc CSE": "Computer Science",
        "B.Sc AIML": "AIML",
        "B.Sc AIDS": "AIDS",
        "B.Sc CA": "CA",
    };

    /**
     * Extracts the academic year from a student's email address.
     * Assumes email format like 'XXYYY@domain.com' where XX is year code (e.g., '24' for 1st year).
     * @param {string} email - The student's email address.
     * @returns {number|null} The academic year (1, 2, 3, etc.) or null if not derivable.
     */
    const extractYearFromEmail = (email) => {
        const regex = /(\d{2})[a-zA-Z]+@/; // Regex to capture two digits followed by letters before '@'.
        const match = email?.match(regex);
        if (match) {
            const yearCode = match[1];
            // Map year codes to academic years.
            const yearMapping = { '24': 1, '23': 2, '22': 3 }; // Adjust this mapping as per your institution's convention.
            return yearMapping[yearCode] || null;
        }
        return null;
    };

    /**
     * Effect hook to fetch study materials based on the authenticated student's
     * department and academic year.
     */
    useEffect(() => {
        const fetchStudyMaterials = async () => {
            // Ensure user object is available from context before proceeding.
            if (!user) {
                setError('User not found. Please log in again.');
                setIsLoading(false);
                return;
            }

            const { email, department } = user;
            // Normalize department name using the mapping.
            const normalizedDepartment = departmentMapping[department] || department;
            const year = extractYearFromEmail(email);

            // If year or department cannot be determined, set an error.
            if (!year || !normalizedDepartment) {
                setError('Could not determine your year or department from your profile.');
                setIsLoading(false);
                return;
            }

            try {
                // Fetch study materials from the API, passing year and department as query parameters.
                const response = await axios.get(`${API_BASE_URL}/study-material`, {
                    params: { year, department: normalizedDepartment },
                    headers: { 'Authorization': `Bearer ${sessionStorage.getItem("token")}` } // Include authorization header.
                });
                setSubjects(response.data); // Set fetched study materials.
            } catch (err) {
                console.error('Error fetching study materials:', err);
                setError(err.response?.data?.message || 'Failed to fetch study materials.');
            } finally {
                setIsLoading(false); // End loading state.
            }
        };

        // Only fetch if the user object from context is available.
        if (user) {
            fetchStudyMaterials();
        } else {
            // If user is null after initial context load, stop loading.
            // AuthContext should handle redirection if there's no token.
            setIsLoading(false);
        }

    }, [user]); // The effect now depends on the user object from AuthContext.

    // Display global loading spinner.
    if (isLoading) {
        return <Loader />;
    }

    // Display error message if data fetching failed.
    if (error) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">An Error Occurred</h3>
                <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Study Materials</h1>
                <p className="text-slate-500 dark:text-gray-400 mt-1">Download resources and notes for your subjects.</p>
            </div>

            {/* Materials List */}
            <div className="space-y-4">
                {subjects.length > 0 ? (
                    subjects.map((subject, index) => (
                        <div
                            key={index}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex-shrink-0">
                                    <BookText className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">{subject.subjectName}</h2>
                                    {/* Optional: Add subject description or last updated timestamp if available in data. */}
                                    {/* <p className="text-sm text-slate-500">Last updated: {subject.lastUpdated}</p> */}
                                </div>
                            </div>
                            {/* Download Button for study material file. */}
                            <a
                                href={subject.filePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors w-full sm:w-auto flex-shrink-0"
                            >
                                <Download size={16} />
                                <span>Download</span>
                            </a>
                        </div>
                    ))
                ) : (
                    // Empty state: Displayed when no study materials are found for the student's criteria.
                    <div className="flex flex-col items-center justify-center text-center py-20 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
                        <BookX className="w-16 h-16 text-slate-400 dark:text-gray-500 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700 dark:text-gray-200">No Study Materials Found</h3>
                        <p className="text-slate-500 dark:text-gray-400 mt-2 max-w-sm">
                            There are no materials available for your current year and department.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Studymaterial;
