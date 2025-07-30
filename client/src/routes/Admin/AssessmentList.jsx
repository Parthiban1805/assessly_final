import axios from 'axios';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Settings, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const AssessmentList = () => {
    const [assessments, setAssessments] = useState([]);
    const [searchFilters, setSearchFilters] = useState({ teacher_id: '', name: '', subjectName: '', department: '', year: '' });
    const [showSettingsPopup, setShowSettingsPopup] = useState(false);
    const [displayAnswers, setDisplayAnswers] = useState(false);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    
    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true);
            const token = sessionStorage.getItem("token");
            if (!token) { navigate('/login'); return; }
            try {
                const [assessmentsRes, settingsRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/assessments/admin/all`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/settings/displayanswers`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                setAssessments(assessmentsRes.data);
                setDisplayAnswers(settingsRes.data.isEnabled);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load page data.');
            } finally {
                setLoading(false);
            }
        };
        fetchPageData();
    }, [navigate]);

    // Reset to page 1 if filters or items per page change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchFilters, itemsPerPage]);

    const handleSearchChange = (field, value) => setSearchFilters(prev => ({ ...prev, [field]: value }));
    const clearFilters = () => {
        setSearchFilters({ teacher_id: '', name: '', subjectName: '', department: '', year: '' });
        setCurrentPage(1);
    };

    const deleteAssessment = async (id) => {
        if (!window.confirm('Are you sure you want to delete this assessment permanently?')) return;
        try {
            const token = sessionStorage.getItem("token");
            await axios.delete(`${API_BASE_URL}/assessments/admin/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            setAssessments(prev => prev.filter(a => a._id !== id));
        } catch (error) {
            alert('Failed to delete assessment.');
        }
    };
    
    const updateDisplayAnswersSetting = async (newValue) => {
        setIsLoadingSettings(true);
        try {
            const token = sessionStorage.getItem("token");
            await axios.put(`${API_BASE_URL}/settings/displayanswers`, { isEnabled: newValue }, { headers: { 'Authorization': `Bearer ${token}` } });
            setDisplayAnswers(newValue);
        } catch (error) {
            alert('Failed to update setting.');
        } finally {
            setIsLoadingSettings(false);
        }
    };

    const filteredAssessments = useMemo(() => {
        return assessments.filter(assessment => 
            Object.keys(searchFilters).every(key => 
                !searchFilters[key] || assessment[key]?.toString().toLowerCase().includes(searchFilters[key].toLowerCase())
            )
        );
    }, [assessments, searchFilters]);
    
    // --- Pagination Logic ---
    const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);
    const currentItems = useMemo(() => {
        const firstItem = (currentPage - 1) * itemsPerPage;
        return filteredAssessments.slice(firstItem, firstItem + itemsPerPage);
    }, [currentPage, itemsPerPage, filteredAssessments]);


    if (loading) return <Loader />;
    if (error) return (
        <div className="p-6 text-center text-red-700 bg-red-50 rounded-lg">
            <AlertTriangle className="mx-auto w-8 h-8 mb-2"/>
            <h3 className="font-semibold">Error</h3>
            <p>{error}</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-slate-800">All Assessments</h1>
                    <p className="text-slate-500 mt-1">View, manage, and configure all assessments in the system.</p>
                </div>
                <button onClick={() => setShowSettingsPopup(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-300 font-semibold hover:bg-slate-50 transition-colors text-sm">
                    <Settings size={16} /> Settings
                </button>
            </div>
            
            {/* Search Filters */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <input type="text" placeholder="Teacher ID..." value={searchFilters.teacher_id} onChange={(e) => handleSearchChange('teacher_id', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"/>
                    <input type="text" placeholder="Assessment Name..." value={searchFilters.name} onChange={(e) => handleSearchChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"/>
                    <input type="text" placeholder="Subject..." value={searchFilters.subjectName} onChange={(e) => handleSearchChange('subjectName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"/>
                    <input type="text" placeholder="Department..." value={searchFilters.department} onChange={(e) => handleSearchChange('department', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"/>
                    <input type="text" placeholder="Year..." value={searchFilters.year} onChange={(e) => handleSearchChange('year', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"/>
                    <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 transition-colors text-sm"><X size={16}/> Clear</button>
                </div>
            </div>

            {/* Table and Pagination */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-4 text-left font-semibold text-slate-600 uppercase tracking-wider">Teacher ID</th>
                                <th className="p-4 text-left font-semibold text-slate-600 uppercase tracking-wider">Assessment Name</th>
                                <th className="p-4 text-left font-semibold text-slate-600 uppercase tracking-wider">Subject</th>
                                <th className="p-4 text-left font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                                <th className="p-4 text-center font-semibold text-slate-600 uppercase tracking-wider">Year</th>
                                <th className="p-4 text-center font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredAssessments.length > 0 ? currentItems.map(a => (
                                <tr key={a._id} className="hover:bg-slate-50">
                                    <td className="p-4 text-slate-600">{a.teacher_id}</td>
                                    <td className="p-4 font-medium text-slate-800">{a.name}</td>
                                    <td className="p-4 text-slate-600">{a.subjectName}</td>
                                    <td className="p-4 text-slate-600">{a.department}</td>
                                    <td className="p-4 text-center text-slate-600">{a.year}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <a href={a.question} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 hover:bg-blue-100 hover:text-blue-600 rounded-md" title="Download Questions"><Download size={16} /></a>
                                            <button onClick={() => deleteAssessment(a._id)} className="p-2 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-md" title="Delete Assessment"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="text-center py-10 text-slate-500">No matching assessments found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span>Show</span>
                            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 rounded-md">
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
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
            
            {/* Settings Modal */}
            {showSettingsPopup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" role="dialog" aria-modal="true">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-slate-800">Assessment Settings</h2>
                            <button onClick={() => setShowSettingsPopup(false)} className="p-1 rounded-full hover:bg-slate-100"><X size={20} className="text-slate-500"/></button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <label htmlFor="displayToggle" className="font-semibold text-slate-700">Display Answers to Students</label>
                                    <p className="text-xs text-slate-500 mt-1">Allow students to view results after submission.</p>
                                </div>
                                <label htmlFor="displayToggle" className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="displayToggle" className="sr-only peer" checked={displayAnswers} onChange={() => updateDisplayAnswersSetting(!displayAnswers)} disabled={isLoadingSettings} />
                                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setShowSettingsPopup(false)} disabled={isLoadingSettings} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">
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