import axios from 'axios';
import { BookX, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import CourseCard from '../../components/coursecard';

const CourseModules = () => {
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSubjects = async () => {
            setIsLoading(true);
            try {
                const token = sessionStorage.getItem("token");
                // This check is redundant if using ProtectedRoute, but safe as a fallback.
                if (!token) {
                    navigate('/login');
                    return;
                }
                const response = await axios.get('http://localhost:5000/api/v1/subjects/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setSubjects(response.data);
            } catch (err) {
                console.error("Error fetching subjects:", err);
                setError(err.response?.data?.message || "Failed to fetch subjects.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSubjects();
    }, [navigate]);
    
    // Filter subjects based on search term in real-time
    const filteredSubjects = subjects.filter(subject => 
        subject.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-red-700">Something went wrong</h3>
                <p className="text-red-600 mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div>
                <h1 className="text-2xl font-medium text-slate-800">All Modules</h1>
                <p className="text-slate-500 mt-1">Browse all available course modules for your program.</p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search for a course by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>
          
            {/* Courses Grid Section */}
            <div className='bg-white p-5 rounded-lg border border-slate-200 flex flex-col'>
                {filteredSubjects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {filteredSubjects.map((subject) => (
                            <CourseCard
                                key={subject._id}
                                // Using a dynamic placeholder image for better visuals
                                image={`https://source.unsplash.com/random/400x300?education,${subject.name.split(' ')[0]}`}
                                title={subject.name}
                                description={subject.description || 'No description available for this course.'}
                                staff={subject.staff || 'Staff not assigned'}
                                subjectId={subject._id}
                            />
                        ))}
                    </div>
                ) : (
                    // Empty State: Shown when no results match the search or no subjects exist
                    <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-lg border border-slate-200">
                        <BookX className="w-16 h-16 text-slate-400 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700">No Courses Found</h3>
                        <p className="text-slate-500 mt-2 max-w-sm">
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