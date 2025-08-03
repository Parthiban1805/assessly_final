import axios from 'axios';
import {
    CheckCircle as CheckIcon,
    AlertCircle as AlertIcon
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth hook
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * AddNotification component allows administrators to create and publish new notifications.
 * Notifications can be targeted to specific departments and academic years.
 *
 * @returns {JSX.Element} The notification creation form.
 */
const AddNotification = () => {
    const { user } = useAuth(); // Get current user details from context for personalization
    const navigate = useNavigate(); // Hook for programmatic navigation

    // State for form input fields.
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        department: '',
        year: 'All', // Default to 'All' years
        openDate: '',
        openTime: '',
        closeDate: '',
        closeTime: '',
    });
    // State to manage the submission process, preventing multiple submissions.
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for modal visibility and content (success/error messages).
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'success' or 'error'
    const [modalMessage, setModalMessage] = useState('');

    /**
     * Closes the modal.
     */
    const closeModal = () => setShowModal(false);

    /**
     * Displays a success modal with a given message.
     * @param {string} msg - The success message to display.
     */
    const showSuccess = (msg) => {
        setModalType('success');
        setModalMessage(msg);
        setShowModal(true);
    };

    /**
     * Displays an error modal with a given message.
     * @param {string} msg - The error message to display.
     */
    const showError = (msg) => {
        setModalType('error');
        setModalMessage(msg);
        setShowModal(true);
    };

    /**
     * Handles changes to form input fields, updating the formData state.
     * @param {Event} e - The change event from the input element.
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    /**
     * Handles the form submission. Sends notification data to the backend API.
     * Displays success or error messages via a modal.
     *
     * @param {Event} event - The form submission event.
     */
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true); // Disable submit button to prevent double clicks

        const token = sessionStorage.getItem("token");
        if (!token) {
            // If no token, user is not authenticated or session expired.
            showError('Authentication session has expired. Please log in again.');
            navigate('/login'); // Redirect to login
            setIsSubmitting(false);
            return;
        }

        try {
            // Send a POST request to create a new notification.
            await axios.post(`${API_BASE_URL}/notifications`, formData, {
                headers: { 'Authorization': `Bearer ${token}` } // Include authorization token
            });

            showSuccess('Notification created successfully!');
            // Reset form fields to their initial empty state.
            setFormData({
                name: '', description: '', department: '', year: 'All',
                openDate: '', openTime: '', closeDate: '', closeTime: '',
            });

        } catch (error) {
            console.error('Error creating notification:', error);
            // Display error message from backend or a generic fallback.
            showError(error.response?.data?.message || 'Failed to add notification.');
        } finally {
            setIsSubmitting(false); // Re-enable submit button.
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto grid gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-6">
                <header className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-gray-700">
                    <h1 className="text-md text-slate-600 dark:text-gray-300">You are creating this notification as <strong className="font-medium text-slate-700 dark:text-white">{user?.name || 'Admin'}</strong></h1>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Notification Title Input */}
                        <div className="flex flex-col gap-1 md:col-span-2">
                            <label htmlFor="name" className="text-sm font-medium text-slate-600 dark:text-gray-300">Notification Title</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g., Holiday Announcement" className="w-full border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500" />
                        </div>

                        {/* Description Textarea */}
                        <div className="flex flex-col gap-1 md:col-span-2">
                            <label htmlFor="description" className="text-sm font-medium text-slate-600 dark:text-gray-300">Description</label>
                            <textarea id="description" name="description" value={formData.description} onChange={handleChange} required placeholder="Full details of the notification..." rows="4" className="w-full border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"></textarea>
                        </div>

                        {/* Target Department Input */}
                        <div className="flex flex-col gap-1">
                            <label htmlFor="department" className="text-sm font-medium text-slate-600 dark:text-gray-300">Target Department</label>
                            <input type="text" id="department" name="department" value={formData.department} onChange={handleChange} required placeholder="e.g., Computer Science or 'All'" className="w-full border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500" />
                        </div>

                        {/* Target Year Select */}
                        <div className="flex flex-col gap-1">
                            <label htmlFor="year" className="text-sm font-medium text-slate-600 dark:text-gray-300">Target Year</label>
                            <select id="year" name="year" value={formData.year} onChange={handleChange} required className="w-full border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                                <option value="All">All Years</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </div>

                        {/* Visibility Schedule Inputs (Date and Time) */}
                        {[
                            { field: 'openDate', label: 'Visible From Date', type: 'date' },
                            { field: 'openTime', label: 'Visible From Time', type: 'time' },
                            { field: 'closeDate', label: 'Visible Until Date', type: 'date' },
                            { field: 'closeTime', label: 'Visible Until Time', type: 'time' },
                        ].map(({ field, label, type }) => (
                            <div key={field} className="flex flex-col gap-1">
                                <label htmlFor={field} className="text-sm font-medium text-slate-600 dark:text-gray-300">{label}</label>
                                <input type={type} id={field} name={field} value={formData[field]} onChange={handleChange} required className="w-full border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white" />
                            </div>
                        ))}
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition disabled:opacity-60 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Submitting…' : 'Submit Notification'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal for Success/Error Messages */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-gray-950/70 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        <div className="flex items-center gap-2">
                            {/* Icon changes based on modal type */}
                            {modalType === 'success' ? <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" /> : <AlertIcon className="w-5 h-5 text-red-600 dark:text-red-400" />}
                            <h3 id="modal-title" className="text-base font-semibold text-slate-800 dark:text-white">{modalType === 'success' ? 'Success' : 'Error'}</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-gray-300">{modalMessage}</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={closeModal} className="bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-200 dark:hover:bg-gray-600 transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddNotification;
