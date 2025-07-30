import axios from 'axios';
import { 
    CheckCircle as CheckIcon, 
    AlertCircle as AlertIcon 
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const AddNotification = () => {
    const { user } = useAuth(); // Get user from context for personalization
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        department: '',
        year: 'All', // Default to 'All'
        openDate: '',
        openTime: '',
        closeDate: '',
        closeTime: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'success' or 'error'
    const [modalMessage, setModalMessage] = useState('');

    const closeModal = () => setShowModal(false);
    const showSuccess = (msg) => {
        setModalType('success');
        setModalMessage(msg);
        setShowModal(true);
    };
    const showError = (msg) => {
        setModalType('error');
        setModalMessage(msg);
        setShowModal(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        
        const token = sessionStorage.getItem("token");
        if (!token) {
            showError('Authentication session has expired. Please log in again.');
            navigate('/login');
            setIsSubmitting(false);
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/notifications`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            showSuccess('Notification created successfully!');
            // Reset form
            setFormData({
                name: '', description: '', department: '', year: 'All',
                openDate: '', openTime: '', closeDate: '', closeTime: '',
            });

        } catch (error) {
            console.error('Error creating notification:', error);
            showError(error.response?.data?.message || 'Failed to add notification.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto grid gap-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
                <header className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <h1 className="text-md text-slate-600">You are creating this notification as <strong className="font-medium text-slate-700">{user?.name || 'Admin'}</strong></h1>
                </header>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Notification Title */}
                        <div className="flex flex-col gap-1 md:col-span-2">
                            <label htmlFor="name" className="text-sm font-medium text-slate-600">Notification Title</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g., Holiday Announcement" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        
                        {/* Description */}
                        <div className="flex flex-col gap-1 md:col-span-2">
                            <label htmlFor="description" className="text-sm font-medium text-slate-600">Description</label>
                            <textarea id="description" name="description" value={formData.description} onChange={handleChange} required placeholder="Full details of the notification..." rows="4" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
                        </div>
                        
                        {/* Target Department */}
                        <div className="flex flex-col gap-1">
                            <label htmlFor="department" className="text-sm font-medium text-slate-600">Target Department</label>
                            <input type="text" id="department" name="department" value={formData.department} onChange={handleChange} required placeholder="e.g., Computer Science or 'All'" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        </div>

                        {/* Target Year */}
                        <div className="flex flex-col gap-1">
                            <label htmlFor="year" className="text-sm font-medium text-slate-600">Target Year</label>
                            <select id="year" name="year" value={formData.year} onChange={handleChange} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                <option value="All">All Years</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </div>

                        {/* Visibility Schedule using map */}
                        {[
                            { field: 'openDate', label: 'Visible From Date', type: 'date' },
                            { field: 'openTime', label: 'Visible From Time', type: 'time' },
                            { field: 'closeDate', label: 'Visible Until Date', type: 'date' },
                            { field: 'closeTime', label: 'Visible Until Time', type: 'time' },
                        ].map(({ field, label, type }) => (
                            <div key={field} className="flex flex-col gap-1">
                                <label htmlFor={field} className="text-sm font-medium text-slate-600">{label}</label>
                                <input type={type} id={field} name={field} value={formData[field]} onChange={handleChange} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                            {isSubmitting ? 'Submitting…' : 'Submit Notification'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            {modalType === 'success' ? <CheckIcon className="w-5 h-5 text-green-600" /> : <AlertIcon className="w-5 h-5 text-red-600" />}
                            <h3 className="text-base font-semibold text-slate-800">{modalType === 'success' ? 'Success' : 'Error'}</h3>
                        </div>
                        <p className="text-sm text-slate-600">{modalMessage}</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={closeModal} className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-200 transition">
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