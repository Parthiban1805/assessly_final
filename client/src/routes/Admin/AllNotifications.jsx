import axios from 'axios';
import { ChevronLeft, ChevronRight, Edit, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // Using SweetAlert2 for user confirmations and alerts
import Loader from '../../components/Loader'; // Global loading spinner component
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * AllNotifications component allows administrators to view, edit, and delete
 * system-wide notifications. It includes pagination and a modal for editing.
 *
 * @returns {JSX.Element} The notifications management interface.
 */
const AllNotifications = () => {
    // State to store the list of all notifications fetched from the API.
    const [allNotifications, setAllNotifications] = useState([]);
    // State to manage the overall loading status of the notifications data.
    const [loading, setLoading] = useState(true);
    // State to hold the notification currently being edited (triggers modal visibility).
    const [editNotification, setEditNotification] = useState(null);
    // State for the form data within the edit modal.
    const [formData, setFormData] = useState({
        name: '', description: '', semester: '', year: '', department: '',
        openDate: '', openTime: '', closeDate: '', closeTime: '',
    });
    const navigate = useNavigate(); // Hook for programmatic navigation.

    // Pagination states.
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Number of notifications to display per page.

    /**
     * Effect hook to fetch all notifications on component mount.
     * Redirects to login if no authentication token is found.
     */
    useEffect(() => {
        const fetchAllNotifications = async () => {
            setLoading(true); // Start loading state.
            try {
                const token = sessionStorage.getItem("token");
                if (!token) {
                    navigate('/login'); // Redirect to login if not authenticated.
                    return;
                }
                // Fetch notifications from the API.
                const response = await axios.get(`${API_BASE_URL}/notifications`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });
                setAllNotifications(response.data); // Set fetched notifications to state.
            } catch (error) {
                console.error('Error fetching notifications', error);
                Swal.fire('Error', 'Could not fetch notifications.', 'error'); // Display error using SweetAlert2.
            } finally {
                setLoading(false); // End loading state.
            }
        };
        fetchAllNotifications();
    }, [navigate]); // Dependency: navigate function.

    /**
     * Effect hook to reset pagination to page 1 whenever `itemsPerPage` changes.
     */
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    /**
     * Handles the deletion of a notification after user confirmation.
     * @param {string} id - The ID of the notification to delete.
     */
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
                // Send DELETE request to the API.
                await axios.delete(`${API_BASE_URL}/notifications/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                // Update state by filtering out the deleted notification.
                setAllNotifications(prev => prev.filter(n => n._id !== id));
                Swal.fire('Deleted!', 'The notification has been deleted.', 'success');
            } catch (error) {
                console.error('Error deleting notification:', error);
                Swal.fire('Error!', 'Failed to delete the notification.', 'error');
            }
        }
    };

    /**
     * Prepares the form for editing a notification and opens the edit modal.
     * @param {object} notification - The notification object to be edited.
     */
    const handleEditClick = (notification) => {
        setEditNotification(notification); // Set the notification to be edited.
        // Populate form data with existing notification details, formatting dates for input.
        setFormData({
            name: notification.name,
            description: notification.description,
            semester: notification.semester || '', // Handle potential missing semester
            year: notification.year || '',         // Handle potential missing year
            department: notification.department,
            openDate: notification.openDate?.split('T')[0] || '', // Extract date part
            openTime: notification.openTime || '',
            closeDate: notification.closeDate?.split('T')[0] || '', // Extract date part
            closeTime: notification.closeTime || '',
        });
    };

    /**
     * Handles changes to input fields within the edit modal form.
     * @param {Event} e - The change event from the input element.
     */
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    /**
     * Closes the edit modal without saving changes.
     */
    const handleCancelEdit = () => setEditNotification(null);

    /**
     * Handles the submission of the edited notification form.
     * Sends PUT request to update the notification and closes the modal on success.
     * @param {Event} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem("token");
            // Send PUT request to update the notification.
            const response = await axios.put(`${API_BASE_URL}/notifications/${editNotification._id}`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Update the specific notification in the state array.
            setAllNotifications(allNotifications.map(n => n._id === editNotification._id ? response.data.notification : n));
            setEditNotification(null); // Close the modal.
            Swal.fire('Success!', 'Notification updated successfully.', 'success');
        } catch (error) {
            console.error('Error updating notification:', error);
            Swal.fire('Error!', 'Failed to update notification.', 'error');
        }
    };

    // Pagination logic: calculate total pages and current items to display.
    const totalPages = Math.ceil(allNotifications.length / itemsPerPage);
    const currentItems = useMemo(() => {
        const firstItemIndex = (currentPage - 1) * itemsPerPage;
        const lastItemIndex = firstItemIndex + itemsPerPage;
        return allNotifications.slice(firstItemIndex, lastItemIndex);
    }, [currentPage, itemsPerPage, allNotifications]); // Dependencies for memoization.

    // Display loading spinner while data is being fetched.
    if (loading) return <Loader />;

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-slate-800 dark:text-white">Manage Notifications</h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-1">View, edit, or delete all system notifications.</p>
                </div>
            </div>

            {/* Notifications Table and Pagination */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="p-4 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Description</th>
                                <th className="p-4 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Audience</th>
                                <th className="p-4 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Visible From</th>
                                <th className="p-4 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Visible Until</th>
                                <th className="p-4 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                            {currentItems.length > 0 ? currentItems.map(n => (
                                <tr key={n._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                    <td className="p-4 font-medium text-slate-800 dark:text-white">{n.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-gray-300 max-w-xs truncate" title={n.description}>{n.description}</td>
                                    <td className="p-4 text-slate-600 dark:text-gray-300">{n.department} - Year {n.year}</td>
                                    <td className="p-4 text-slate-600 dark:text-gray-300 whitespace-nowrap">{new Date(n.openDate).toLocaleDateString()} {n.openTime}</td>
                                    <td className="p-4 text-slate-600 dark:text-gray-300 whitespace-nowrap">{new Date(n.closeDate).toLocaleDateString()} {n.closeTime}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEditClick(n)} className="p-2 text-slate-500 dark:text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900 dark:hover:text-blue-300 rounded-md" title="Edit" aria-label={`Edit ${n.name}`}><Edit size={16} /></button>
                                            <button onClick={() => deleteNotification(n._id)} className="p-2 text-slate-500 dark:text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300 rounded-md" title="Delete" aria-label={`Delete ${n.name}`}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="text-center py-10 text-slate-500 dark:text-gray-400">No notifications found.</td></tr>
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

            {/* Edit Notification Modal */}
            {editNotification && (
                <div className="fixed inset-0 bg-black/50 dark:bg-gray-950/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
                        <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 id="edit-modal-title" className="text-lg font-medium text-slate-800 dark:text-white">Edit Notification</h2>
                            <button onClick={handleCancelEdit} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700" aria-label="Close edit modal"><X size={20} className="text-slate-500 dark:text-gray-400"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Notification Name */}
                                <div className="md:col-span-2">
                                    <label htmlFor="edit-name" className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Name</label>
                                    <input type="text" id="edit-name" name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                                {/* Description */}
                                <div className="md:col-span-2">
                                    <label htmlFor="edit-description" className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Description</label>
                                    <textarea id="edit-description" name="description" value={formData.description} onChange={handleChange} required rows="3" className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"></textarea>
                                </div>
                                {/* Department */}
                                <div>
                                    <label htmlFor="edit-department" className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Department</label>
                                    <input type="text" id="edit-department" name="department" value={formData.department} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                                {/* Year */}
                                <div>
                                    <label htmlFor="edit-year" className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Year</label>
                                    <select id="edit-year" name="year" value={formData.year} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                                        <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="All">All</option>
                                    </select>
                                </div>
                                {/* Open Date */}
                                <div>
                                    <label htmlFor="edit-openDate" className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Open Date</label>
                                    <input type="date" id="edit-openDate" name="openDate" value={formData.openDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                                {/* Open Time */}
                                <div>
                                    <label htmlFor="edit-openTime" className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Open Time</label>
                                    <input type="time" id="edit-openTime" name="openTime" value={formData.openTime} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                                {/* Close Date */}
                                <div>
                                    <label htmlFor="edit-closeDate" className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Close Date</label>
                                    <input type="date" id="edit-closeDate" name="closeDate" value={formData.closeDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                                {/* Close Time */}
                                <div>
                                    <label htmlFor="edit-closeTime" className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Close Time</label>
                                    <input type="time" id="edit-closeTime" name="closeTime" value={formData.closeTime} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                            </div>
                        </form>
                        <div className="p-6 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-700 flex justify-end gap-3">
                            <button type="button" onClick={handleCancelEdit} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-500 transition">Cancel</button>
                            <button type="submit" onClick={handleSubmit} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllNotifications;
