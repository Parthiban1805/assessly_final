import axios from 'axios';
import { BookText, BookX, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import { useAuth } from '../../contexts/AuthContext';

const Studymaterial = () => {
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth(); // 2. Get user details directly from the context

    // This mapping can be moved to a utility file if used elsewhere
    const departmentMapping = {
        "B.Sc Cyber Security": "Cyber Security",
        "B.Sc IT": "IT",
        "B.Sc CSE": "Computer Science",
        "B.Sc AIML": "AIML",
        "B.Sc AIDS": "AIDS",
        "B.Sc CA": "CA",
    };

    const extractYearFromEmail = (email) => {
        const regex = /(\d{2})[a-zA-Z]+@/;
        const match = email?.match(regex);
        if (match) {
            const yearCode = match[1];
            const yearMapping = { '24': 1, '23': 2, '22': 3 };
            return yearMapping[yearCode] || null;
        }
        return null;
    };

    useEffect(() => {
        const fetchStudyMaterials = async () => {
            // 3. The entire useEffect is now clean and simple
            if (!user) {
                setError('User not found. Please log in again.');
                setIsLoading(false);
                return;
            }

            const { email, department } = user;
            const normalizedDepartment = departmentMapping[department] || department;
            const year = extractYearFromEmail(email);

            if (!year || !normalizedDepartment) {
                setError('Could not determine your year or department from your profile.');
                setIsLoading(false);
                return;
            }

            try {
                const response = await axios.get('http://localhost:5000/api/study-material', {
                    params: { year, department: normalizedDepartment },
                });
                setSubjects(response.data);
            } catch (err) {
                console.error('Error fetching study materials:', err);
                setError(err.response?.data?.message || 'Failed to fetch study materials.');
            } finally {
                setIsLoading(false);
            }
        };

        // We only fetch if the user object from context is available
        if (user) {
            fetchStudyMaterials();
        } else {
            // If user is null after initial context load, stop loading.
            // AuthContext should handle redirection if there's no token.
            setIsLoading(false); 
        }

    }, [user]); // 4. The effect now depends on the user object from context

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-red-700">An Error Occurred</h3>
                <p className="text-red-600 mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Study Materials</h1>
                <p className="text-slate-500 mt-1">Download resources and notes for your subjects.</p>
            </div>

            {/* Materials List */}
            <div className="space-y-4">
                {subjects.length > 0 ? (
                    subjects.map((subject, index) => (
                        <div 
                            key={index} 
                            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 flex-shrink-0">
                                    <BookText className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">{subject.subjectName}</h2>
                                    {/* You could add a description here if available */}
                                    {/* <p className="text-sm text-slate-500">Last updated: {subject.lastUpdated}</p> */}
                                </div>
                            </div>
                            <a 
                                href={subject.filePath} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors w-full sm:w-auto flex-shrink-0"
                            >
                                <Download size={16} />
                                <span>Download</span>
                            </a>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-lg border border-slate-200">
                        <BookX className="w-16 h-16 text-slate-400 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700">No Study Materials Found</h3>
                        <p className="text-slate-500 mt-2 max-w-sm">
                            There are no materials available for your current year and department.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Studymaterial;