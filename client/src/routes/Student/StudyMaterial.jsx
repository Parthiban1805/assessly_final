import axios from 'axios';
import { BookText, BookX, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import { API_BASE_URL } from '../../config/constants';

const Studymaterial = () => {
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStudyMaterials = async () => {
            setIsLoading(true);
            try {
                const token = sessionStorage.getItem("token");
                if (!token) {
                    navigate('/login');
                    return;
                }

                const response = await axios.get(`${API_BASE_URL}/add-study-material/my-materials`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                setSubjects(response.data);

            } catch (err) {
                console.error('Error fetching study materials:', err);
                const errorMessage = err.response?.data?.message || 'Failed to fetch study materials.';
                setError(errorMessage);

                if (err.response?.status === 401 || err.response?.status === 403) {
                    navigate('/login');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudyMaterials();
    }, [navigate]);

    if (isLoading) {
        return <Loader />;
    }

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
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Study Materials</h1>
                <p className="text-slate-500 dark:text-gray-400 mt-1">Download resources and notes for your subjects.</p>
            </div>

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
                                    <p className="text-sm text-slate-500 dark:text-gray-400">{subject.fileName}</p>
                                </div>
                            </div>
                            <a
                                href={subject.filePath}
                                download
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
                    <div className="flex flex-col items-center justify-center text-center py-20 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
        <BookX className="w-16 h-16 text-slate-400 dark:text-gray-500 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 dark:text-gray-200">No Study Materials Found</h3>
        <p className="text-slate-500 dark:text-gray-400 mt-2 max-w-sm">
            It looks like study materials for your course have not been uploaded yet. Please check back later.
        </p>
    </div>
                )}
                
            </div>
        </div>
    );
};

export default Studymaterial;