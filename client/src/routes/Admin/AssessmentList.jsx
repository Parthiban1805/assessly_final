import axios from 'axios';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Settings, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader'; // Global loading spinner component
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * AssessmentList component provides an interface for administrators to view,
 * filter, delete, and configure settings for all assessments in the system.
 *
 * @returns {JSX.Element} The assessment management UI for admins.
 */
const AssessmentList = () => {
    // State to store the list of all assessments.
    const [assessments, setAssessments] = useState([]);
    // State to manage search and filter criteria.
    const [searchFilters, setSearchFilters] = useState({ teacher_id: '', name: '', subjectName: '', department: '', year: '' });
    // State to control the visibility of the settings popup (modal).
    const [showSettingsPopup, setShowSettingsPopup] = useState(false);
    // State to store the global setting for displaying answers to students.
    const [displayAnswers, setDisplayAnswers] = useState(false);
    // State to indicate if the settings update is in progress.
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    // State to manage overall data loading.
    const [loading, setLoading] = useState(true);
    // State to store any error messages during data fetching.
    const [error, setError] = useState('');
    const navigate = useNavigate(); // Hook for programmatic navigation.

    // Pagination states.
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Number of items per page.

    /**
     * Effect hook to fetch all assessments and the 'display answers' setting on component mount.
     * Redirects to login if no authentication token is found.
     */
    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true); // Start loading state.
            const token = sessionStorage.getItem("token");
            if (!token) {
                navigate('/login'); // Redirect to login if not authenticated.
                return;
            }
            try {
                // Fetch assessments and settings concurrently.
                const [assessmentsRes, settingsRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/assessments/admin/all`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/settings/displayanswers`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                setAssessments(assessmentsRes.data); // Set fetched assessments.
                setDisplayAnswers(settingsRes.data.isEnabled); // Set 'display answers' setting.
            } catch (err) {
                // Set error message from API response or a generic one.
                setError(err.response?.data?.message || 'Failed to load page data.');
            } finally {
                setLoading(false); // End loading state.
            }
        };
        fetchPageData();
    }, [navigate]); // Dependency: navigate function.

    /**
     * Effect hook to reset pagination to page 1 whenever search filters or items per page change.
     */
    useEffect(() => {
        setCurrentPage(1);
    }, [searchFilters, itemsPerPage]);

    /**
     * Handles changes to search filter input fields.
     * @param {string} field - The name of the filter field (e.g., 'teacher_id', 'name').
     * @param {string} value - The new value of the filter field.
     */
    const handleSearchChange = (field, value) => setSearchFilters(prev => ({ ...prev, [field]: value }));

    /**
     * Clears all applied search filters and resets pagination.
     */
    const clearFilters = () => {
        setSearchFilters({ teacher_id: '', name: '', subjectName: '', department: '', year: '' });
        setCurrentPage(1);
    };

    /**
     * Handles the deletion of an assessment after user confirmation.
     * @param {string} id - The ID of the assessment to delete.
     */
    const deleteAssessment = async (id) => {
        // Confirm deletion with the user.
        if (!window.confirm('Are you sure you want to delete this assessment permanently? This action cannot be undone.')) return;
        try {
            const token = sessionStorage.getItem("token");
            // Send DELETE request to the API.
            await axios.delete(`${API_BASE_URL}/assessments/admin/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            // Update state by filtering out the deleted assessment.
            setAssessments(prev => prev.filter(a => a._id !== id));
        } catch (error) {
            console.error('Error deleting assessment:', error);
            alert('Failed to delete assessment.');
        }
    };

    /**
     * Updates the global setting for displaying answers to students.
     * @param {boolean} newValue - The new value for the 'displayAnswers' setting.
     */
    const updateDisplayAnswersSetting = async (newValue) => {
        setIsLoadingSettings(true); // Indicate setting update is in progress.
        try {
            const token = sessionStorage.getItem("token");
            // Send PUT request to update the setting.
            await axios.put(`${API_BASE_URL}/settings/displayanswers`, { isEnabled: newValue }, { headers: { 'Authorization': `Bearer ${token}` } });
            setDisplayAnswers(newValue); // Update local state on success.
        } catch (error) {
            console.error('Error updating setting:', error);
            alert('Failed to update setting.');
        } finally {
            setIsLoadingSettings(false); // End setting update process.
        }
    };

    /**
     * Memoized filtered list of assessments based on current search filters.
     */
    const filteredAssessments = useMemo(() => {
        return assessments.filter(assessment =>
            Object.keys(searchFilters).every(key =>
                // Check if filter is empty OR if assessment property matches the filter (case-insensitive).
                !searchFilters[key] || assessment[key]?.toString().toLowerCase().includes(searchFilters[key].toLowerCase())
            )
        );
    }, [assessments, searchFilters]); // Dependencies for memoization.

    // Pagination calculations for the filtered assessments.
    const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);
    const currentItems = useMemo(() => {
        const firstItemIndex = (currentPage - 1) * itemsPerPage;
        const lastItemIndex = firstItemIndex + itemsPerPage;
        return filteredAssessments.slice(firstItemIndex, lastItemIndex);
    }, [currentPage, itemsPerPage, filteredAssessments]); // Dependencies for memoization.

    // Display global loading spinner.
    if (loading) return <Loader />;
    // Display error message if initial data fetch failed.
    if (error) return (
        <div className="p-6 text-center text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="mx-auto w-8 h-8 mb-2 text-red-500 dark:text-red-300"/>
            <h3 className="font-semibold">Error</h3>
            <p>{error}</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-slate-800 dark:text-white">All Assessments</h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-1">View, manage, and configure all assessments in the system.</p>
                </div>
                {/* Button to open settings popup */}
                <button onClick={() => setShowSettingsPopup(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-200 px-4 py-2 rounded-lg border border-slate-300 dark:border-gray-600 font-semibold hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-sm">
                    <Settings size={16} className="text-slate-600 dark:text-gray-300" /> Settings
                </button>
            </div>

            {/* Search Filters Section */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* Input fields for various filters */}
                    <input type="text" placeholder="Teacher ID..." value={searchFilters.teacher_id} onChange={(e) => handleSearchChange('teacher_id', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"/>
                    <input type="text" placeholder="Assessment Name..." value={searchFilters.name} onChange={(e) => handleSearchChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"/>
                    <input type="text" placeholder="Subject..." value={searchFilters.subjectName} onChange={(e) => handleSearchChange('subjectName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"/>
                    <input type="text" placeholder="Department..." value={searchFilters.department} onChange={(e) => handleSearchChange('department', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"/>
                    <input type="text" placeholder="Year..." value={searchFilters.year} onChange={(e) => handleSearchChange('year', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"/>
                    {/* Button to clear all filters */}
                    <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors text-sm">
                        <X size={16}/> Clear
                    </button>
                </div>
            </div>

            {/* Assessments Table and Pagination */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Teacher ID</th>
                                <th className="p-4 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Assessment Name</th>
                                <th className="p-4 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                                <th className="p-4 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Department</th>
                                <th className="p-4 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Year</th>
                                <th className="p-4 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                            {filteredAssessments.length > 0 ? currentItems.map(a => (
                                <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                    <td className="p-4 text-slate-600 dark:text-gray-300">{a.teacher_id}</td>
                                    <td className="p-4 font-medium text-slate-800 dark:text-white">{a.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-gray-300">{a.subjectName}</td>
                                    <td className="p-4 text-slate-600 dark:text-gray-300">{a.department}</td>
                                    <td className="p-4 text-center text-slate-600 dark:text-gray-300">{a.year}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <a href={a.question} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 dark:text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900 dark:hover:text-blue-300 rounded-md" title="Download Questions" aria-label={`Download questions for ${a.name}`}><Download size={16} /></a>
                                            <button onClick={() => deleteAssessment(a._id)} className="p-2 text-slate-500 dark:text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300 rounded-md" title="Delete Assessment" aria-label={`Delete ${a.name}`}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="text-center py-10 text-slate-500 dark:text-gray-400">No matching assessments found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
                            <span>Show</span>
                            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <span>entries</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 disabled:opacity-50 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md" aria-label="Previous page"><ChevronLeft size={20}/></button>
                            <span className="text-sm text-slate-600 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 disabled:opacity-50 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md" aria-label="Next page"><ChevronRight size={20}/></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Settings Modal */}
            {showSettingsPopup && (
                <div className="fixed inset-0 bg-black/50 dark:bg-gray-950/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
                        <div className="flex justify-between items-center mb-4">
                            <h2 id="settings-modal-title" className="text-lg font-medium text-slate-800 dark:text-white">Assessment Settings</h2>
                            <button onClick={() => setShowSettingsPopup(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700" aria-label="Close settings modal"><X size={20} className="text-slate-500 dark:text-gray-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg">
                                <div>
                                    <label htmlFor="displayToggle" className="font-semibold text-slate-700 dark:text-gray-200">Display Answers to Students</label>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Allow students to view results after submission.</p>
                                </div>
                                <label htmlFor="displayToggle" className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="displayToggle" className="sr-only peer" checked={displayAnswers} onChange={() => updateDisplayAnswersSetting(!displayAnswers)} disabled={isLoadingSettings} />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                                </label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setShowSettingsPopup(false)} disabled={isLoadingSettings} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 disabled:bg-blue-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
                                {isLoadingSettings ? 'Saving...' : 'Done'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentList;
