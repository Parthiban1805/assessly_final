import axios from 'axios';
import { ChevronLeft, ChevronRight, Edit, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Loader from '../../components/Loader';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const AllNotifications = () => {
    const [allNotifications, setAllNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editNotification, setEditNotification] = useState(null);
    const [formData, setFormData] = useState({
        name: '', description: '', semester: '', year: '', department: '',
        openDate: '', openTime: '', closeDate: '', closeTime: '',
    });
    const navigate = useNavigate();

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const fetchAllNotifications = async () => {
            setLoading(true);
            try {
                const token = sessionStorage.getItem("token");
                if (!token) { navigate('/login'); return; }
                const response = await axios.get(`${API_BASE_URL}/notifications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setAllNotifications(response.data);
            } catch (error) {
                console.error('Error fetching notifications', error);
                Swal.fire('Error', 'Could not fetch notifications.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchAllNotifications();
    }, [navigate]);
    
    // Reset to page 1 if items per page changes
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    const deleteNotification = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });
        if (result.isConfirmed) {
            try {
                const token = sessionStorage.getItem("token");
                await axios.delete(`${API_BASE_URL}/notifications/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                setAllNotifications(prev => prev.filter(n => n._id !== id));
                Swal.fire('Deleted!', 'The notification has been deleted.', 'success');
            } catch (error) {
                Swal.fire('Error!', 'Failed to delete the notification.', 'error');
            }
        }
    };

    const handleEditClick = (notification) => {
        setEditNotification(notification);
        setFormData({
            name: notification.name,
            description: notification.description,
            semester: notification.semester || '',
            year: notification.year || '',
            department: notification.department,
            openDate: notification.openDate?.split('T')[0] || '', // Format date for input
            openTime: notification.openTime || '',
            closeDate: notification.closeDate?.split('T')[0] || '', // Format date for input
            closeTime: notification.closeTime || '',
        });
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleCancelEdit = () => setEditNotification(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem("token");
            const response = await axios.put(`${API_BASE_URL}/notifications/${editNotification._id}`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setAllNotifications(allNotifications.map(n => n._id === editNotification._id ? response.data.notification : n));
            setEditNotification(null);
            Swal.fire('Success!', 'Notification updated successfully.', 'success');
        } catch (error) {
            Swal.fire('Error!', 'Failed to update notification.', 'error');
        }
    };

    // --- Pagination Logic ---
    const totalPages = Math.ceil(allNotifications.length / itemsPerPage);
    const currentItems = useMemo(() => {
        const firstItem = (currentPage - 1) * itemsPerPage;
        return allNotifications.slice(firstItem, firstItem + itemsPerPage);
    }, [currentPage, itemsPerPage, allNotifications]);

    if (loading) return <Loader />;

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-slate-800">Manage Notifications</h1>
                    <p className="text-slate-500 mt-1">View, edit, or delete all system notifications.</p>
                </div>
            </div>

            {/* Table and Pagination */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-4 text-left font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                                <th className="p-4 text-left font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                                <th className="p-4 text-left font-semibold text-slate-600 uppercase tracking-wider">Audience</th>
                                <th className="p-4 text-left font-semibold text-slate-600 uppercase tracking-wider">Visible From</th>
                                <th className="p-4 text-left font-semibold text-slate-600 uppercase tracking-wider">Visible Until</th>
                                <th className="p-4 text-center font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {currentItems.length > 0 ? currentItems.map(n => (
                                <tr key={n._id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-800">{n.name}</td>
                                    <td className="p-4 text-slate-600 max-w-xs truncate" title={n.description}>{n.description}</td>
                                    <td className="p-4 text-slate-600">{n.department} - Year {n.year}</td>
                                    <td className="p-4 text-slate-600 whitespace-nowrap">{new Date(n.openDate).toLocaleDateString()} {n.openTime}</td>
                                    <td className="p-4 text-slate-600 whitespace-nowrap">{new Date(n.closeDate).toLocaleDateString()} {n.closeTime}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEditClick(n)} className="p-2 text-slate-500 hover:bg-blue-100 hover:text-blue-600 rounded-md" title="Edit"><Edit size={16} /></button>
                                            <button onClick={() => deleteNotification(n._id)} className="p-2 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-md" title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="text-center py-10 text-slate-500">No notifications found.</td></tr>
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

            {/* Edit Modal */}
            {editNotification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-fadeIn" role="dialog" aria-modal="true">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="text-lg font-medium text-slate-800">Edit Notification</h2>
                            <button onClick={handleCancelEdit} className="p-1 rounded-full hover:bg-slate-100"><X size={20} className="text-slate-500"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label htmlFor="name" className="text-sm font-medium text-slate-600 block mb-1">Name</label>
                                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="description" className="text-sm font-medium text-slate-600 block mb-1">Description</label>
                                    <textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows="3" className="w-full px-3 py-2 border border-slate-300 rounded-lg"></textarea>
                                </div>
                                <div>
                                    <label htmlFor="department" className="text-sm font-medium text-slate-600 block mb-1">Department</label>
                                    <input type="text" id="department" name="department" value={formData.department} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label htmlFor="year" className="text-sm font-medium text-slate-600 block mb-1">Year</label>
                                    <select id="year" name="year" value={formData.year} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                        <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="All">All</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="openDate" className="text-sm font-medium text-slate-600 block mb-1">Open Date</label>
                                    <input type="date" id="openDate" name="openDate" value={formData.openDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label htmlFor="openTime" className="text-sm font-medium text-slate-600 block mb-1">Open Time</label>
                                    <input type="time" id="openTime" name="openTime" value={formData.openTime} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label htmlFor="closeDate" className="text-sm font-medium text-slate-600 block mb-1">Close Date</label>
                                    <input type="date" id="closeDate" name="closeDate" value={formData.closeDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label htmlFor="closeTime" className="text-sm font-medium text-slate-600 block mb-1">Close Time</label>
                                    <input type="time" id="closeTime" name="closeTime" value={formData.closeTime} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                            </div>
                        </form>
                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button type="button" onClick={handleCancelEdit} className="px-4 py-2 text-sm font-semibold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300">Cancel</button>
                            <button type="submit" onClick={handleSubmit} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllNotifications;