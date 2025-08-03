// src/pages/admin/UserManagement.jsx
import axios from 'axios';
import { ChevronLeft, ChevronRight, Edit, Plus, Trash2, User, Users, X, Camera } from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // For elegant alerts and confirmations
import Loader from '../../components/Loader'; // Global loading spinner component
import placeholder from '../../assets/placeholder.png'; // Placeholder image for user avatars
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * UserManagement component allows administrators to manage (add, view, edit, delete)
 * both student and teacher accounts. It includes a modal for create/edit operations
 * and pagination for large lists. For students, it also allows face enrollment.
 *
 * @returns {JSX.Element} The user management interface.
 */
const UserManagement = () => {
    // State to hold the list of student users.
    const [students, setStudents] = useState([]);
    // State to hold the list of teacher users.
    const [teachers, setTeachers] = useState([]);
    // State to manage overall loading status.
    const [loading, setLoading] = useState(true);
    // State to control which tab is active: 'students' or 'teachers'.
    const [activeView, setActiveView] = useState('students');
    const navigate = useNavigate(); // Hook for programmatic navigation.

    // Modal states for user creation/editing.
    const [isModalOpen, setIsModalOpen] = useState(false); // Controls modal visibility.
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit' mode for the modal.
    const [currentUser, setCurrentUser] = useState(null); // Holds the user object being edited.
    const [formData, setFormData] = useState({}); // Form data for modal inputs.

    // Photo Enrollment states specific to the modal when editing students.
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null); // The actual file object for enrollment.
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null); // URL for displaying image preview in modal.

    // Pagination states for both student and teacher lists.
    const [studentPage, setStudentPage] = useState(1);
    const [teacherPage, setTeacherPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Number of items per page.

    /**
     * Fetches all user data (students and teachers) from the backend.
     * Uses useCallback to memoize the function, preventing unnecessary re-creation.
     */
    const fetchAllUsers = useCallback(async () => {
        setLoading(true); // Start loading state.
        try {
            const token = sessionStorage.getItem("token");
            if (!token) {
                navigate('/login'); // Redirect to login if not authenticated.
                return;
            }
            // Fetch combined dashboard data which includes student and teacher lists.
            const response = await axios.get(`${API_BASE_URL}/admin/dashboard-data`, {
                headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
            });
            setStudents(response.data.students); // Update students list.
            setTeachers(response.data.teachers); // Update teachers list.
        } catch (error) {
            console.error("Failed to fetch user data:", error);
            Swal.fire('Error', 'Could not fetch user data. Please try again.', 'error'); // Display error using SweetAlert2.
        } finally {
            setLoading(false); // End loading state.
        }
    }, [navigate]); // Dependency: navigate function.

    /**
     * Effect hook to fetch all users on component mount and whenever `fetchAllUsers` changes.
     */
    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

    /**
     * Effect hook to reset pagination to page 1 whenever `itemsPerPage` or `activeView` changes.
     */
    useEffect(() => {
        setStudentPage(1);
        setTeacherPage(1);
    }, [itemsPerPage, activeView]);

    /**
     * Handles the deletion of a user (student or teacher) after confirmation.
     * @param {object} user - The user object to delete.
     * @param {string} userType - 'student' or 'teacher'.
     */
    const handleDelete = async (user, userType) => {
        const result = await Swal.fire({
            title: `Delete ${user.name}?`,
            text: "This action is irreversible.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const token = sessionStorage.getItem("token");
                // Determine the correct API endpoint based on user type.
                const endpoint = userType === 'student' ? `/users/students/${user._id}` : `/users/teachers/${user._id}`;
                // Send DELETE request to the API.
                await axios.delete(`${API_BASE_URL}${endpoint}`, { headers: { 'Authorization': `Bearer ${token}` } });

                Swal.fire('Deleted!', `${user.name} has been removed.`, 'success');
                fetchAllUsers(); // Re-fetch data to update the lists.
            } catch (error) {
                console.error("Error deleting user:", error);
                Swal.fire('Error!', error.response?.data?.message || 'Failed to delete user.', 'error');
            }
        }
    };

    /**
     * Opens the user creation/edit modal, populating form data if in edit mode.
     * @param {string} mode - 'create' or 'edit'.
     * @param {string} userType - 'student' or 'teacher'.
     * @param {object} [user=null] - The user object to edit (only for 'edit' mode).
     */
    const openModal = (mode, userType, user = null) => {
        setModalMode(mode);
        setCurrentUser(user); // Store the user object if in edit mode.

        // Initialize form data based on user type and mode.
        const baseForm = userType === 'student'
            ? { name: '', email: '', password: '', student_id: '', department: '', year: '1', semester: 'S1', class_advisor: '', boarding: 'Hosteller', phone: '' }
            : { name: '', email: '', password: '', teacher_id: '', department: '', subjects: '' };

        // If editing, pre-populate with user data; password field is intentionally left blank for security.
        setFormData(user ? { ...user, password: '' } : baseForm);

        // Initialize photo states for the modal.
        setPhotoPreviewUrl(user?.photo_url || null); // Display existing photo or null.
        setSelectedPhotoFile(null); // Clear any previously selected new photo.

        setIsModalOpen(true); // Open the modal.
    };

    /**
     * Closes the user creation/edit modal and resets its related states.
     */
    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentUser(null);
        setFormData({}); // Clear form data.
        setSelectedPhotoFile(null); // Clear selected photo file.
        setPhotoPreviewUrl(null); // Clear photo preview.
    };

    /**
     * Handles changes to form input fields within the modal.
     * @param {Event} e - The change event from the input element.
     */
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    /**
     * Handles changes to the photo file input within the modal.
     * Sets the selected file and creates a preview URL for display.
     * @param {Event} e - The file input change event.
     */
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        setSelectedPhotoFile(file); // Store the file object.
        if (file) {
            setPhotoPreviewUrl(URL.createObjectURL(file)); // Create and set preview URL.
        } else {
            // If file input is cleared, revert to existing photo or default placeholder.
            setPhotoPreviewUrl(currentUser?.photo_url || null);
        }
    };

    /**
     * Handles the face enrollment process for a student using an uploaded photo.
     * This is an admin-specific action.
     */
    const handleEnrollFaceFromAdmin = async () => {
        if (!selectedPhotoFile) {
            Swal.fire('Warning', 'Please select a photo file first.', 'warning');
            return;
        }
        // Ensure student data is available for enrollment.
        if (!currentUser || !currentUser.student_id) {
            Swal.fire('Error', 'Student data not available for enrollment.', 'error');
            return;
        }

        // Prepare FormData for the enrollment API request.
        const formDataForEnroll = new FormData();
        formDataForEnroll.append('enrollmentPhoto', selectedPhotoFile);
        formDataForEnroll.append('student_id', currentUser.student_id); // Crucial: Send student_id in body.

        try {
            const token = sessionStorage.getItem("token");
            Swal.fire({
                title: 'Enrolling Face...',
                text: 'Please wait, this may take a moment.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading(); // Show loading spinner in SweetAlert modal.
                }
            });

            // Call the admin-specific face enrollment endpoint.
            const response = await axios.post(`${API_BASE_URL}/proctoring/admin/enroll-face-for-student`, formDataForEnroll, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
            });

            Swal.fire('Success!', response.data.message, 'success');
            // Update the photo_url in formData to reflect the new enrolled photo.
            setFormData(prev => ({ ...prev, photo_url: response.data.photoUrl }));
            setPhotoPreviewUrl(response.data.photoUrl); // Also update the preview.
            setSelectedPhotoFile(null); // Clear selected file after successful upload.
            fetchAllUsers(); // Re-fetch all user data to update the main table.
        } catch (error) {
            console.error("Face enrollment failed:", error);
            Swal.fire('Error!', error.response?.data?.message || 'Failed to enroll face.', 'error');
        }
    };

    /**
     * Handles the submission of the create/edit user form.
     * Sends data to the backend API and provides feedback via SweetAlert.
     * @param {Event} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        const userType = activeView === 'students' ? 'student' : 'teacher';
        const token = sessionStorage.getItem("token");

        // Create payload: remove empty password field for updates to avoid changing it unintentionally.
        const payload = { ...formData };
        if (modalMode === 'edit' && !payload.password) {
            delete payload.password;
        }

        try {
            Swal.fire({
                title: 'Saving user...',
                text: 'Please wait.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading(); // Show loading spinner.
                }
            });

            let response;
            if (modalMode === 'create') {
                // Determine creation endpoint based on user type.
                const endpoint = userType === 'student' ? '/users/students' : '/users/teachers';
                response = await axios.post(`${API_BASE_URL}${endpoint}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
            } else { // modalMode === 'edit'
                // Determine update endpoint based on user type and user ID.
                const endpoint = userType === 'student' ? `/users/students/${currentUser._id}` : `/users/teachers/${currentUser._id}`;
                response = await axios.put(`${API_BASE_URL}${endpoint}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
            }
            Swal.fire('Success!', response.data.message, 'success');
            closeModal(); // Close modal on success.
            fetchAllUsers(); // Re-fetch user data.
        } catch (error) {
            console.error("User save failed:", error);
            Swal.fire('Error!', error.response?.data?.message || 'Operation failed.', 'error');
        }
    };

    // Memoized paginated lists for students and teachers.
    const paginatedStudents = useMemo(() => {
        const firstItemIndex = (studentPage - 1) * itemsPerPage;
        const lastItemIndex = firstItemIndex + itemsPerPage;
        return students.slice(firstItemIndex, lastItemIndex);
    }, [students, studentPage, itemsPerPage]);

    const paginatedTeachers = useMemo(() => {
        const firstItemIndex = (teacherPage - 1) * itemsPerPage;
        const lastItemIndex = firstItemIndex + itemsPerPage;
        return teachers.slice(firstItemIndex, lastItemIndex);
    }, [teachers, teacherPage, itemsPerPage]);

    // Display global loading spinner.
    if (loading) return <Loader />;

    /**
     * Renders the user table (students or teachers) based on the active view.
     * Includes pagination controls.
     * @param {Array<object>} users - The list of users to display.
     * @param {string} userType - 'student' or 'teacher'.
     * @returns {JSX.Element} The user table UI.
     */
    const renderTable = (users, userType) => {
        const isStudent = userType === 'student';
        const totalUsers = isStudent ? students.length : teachers.length;
        const totalPages = Math.ceil(totalUsers / itemsPerPage);
        const currentPageForView = isStudent ? studentPage : teacherPage;
        const setCurrentPageForView = isStudent ? setStudentPage : setTeacherPage;

        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-gray-700 text-slate-600 dark:text-gray-300 uppercase">
                            <tr>
                                <th className="p-4 text-left">Profile</th>
                                <th className="p-4 text-left">Name</th>
                                <th className="p-4 text-left">ID</th>
                                <th className="p-4 text-left">Email</th>
                                <th className="p-4 text-left">Department</th>
                                {isStudent && <th className="p-4 text-center">Year</th>}
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                            {users.map(user => (
                                <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                    <td className='p-4'>
                                        <img src={user.photo_url || placeholder} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                                    </td>
                                    <td className="p-4 font-medium text-slate-800 dark:text-white">{user.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-gray-300">{isStudent ? user.student_id : user.teacher_id}</td>
                                    <td className="p-4 text-slate-600 dark:text-gray-300">{user.email}</td>
                                    <td className="p-4 text-slate-600 dark:text-gray-300">{user.department}</td>
                                    {isStudent && <td className="p-4 text-center text-slate-600 dark:text-gray-300">{user.year}</td>}
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openModal('edit', userType, user)} className="p-2 text-slate-500 dark:text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900 dark:hover:text-blue-300 rounded-md" title="Edit" aria-label={`Edit ${user.name}`}><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(user, userType)} className="p-2 text-slate-500 dark:text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300 rounded-md" title="Delete" aria-label={`Delete ${user.name}`}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                     <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
                            <span>Show</span>
                            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                                <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                            </select>
                            <span>entries</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPageForView(p => p - 1)} disabled={currentPageForView === 1} className="p-2 disabled:opacity-50 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md" aria-label="Previous page"><ChevronLeft size={20}/></button>
                            <span className="text-sm text-slate-600 dark:text-gray-300">Page {currentPageForView} of {totalPages}</span>
                            <button onClick={() => setCurrentPageForView(p => p + 1)} disabled={currentPageForView === totalPages} className="p-2 disabled:opacity-50 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md" aria-label="Next page"><ChevronRight size={20}/></button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            {/* Page Header and Add New User Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-slate-800 dark:text-white">User Management</h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-1">Add, view, or edit students and teachers.</p>
                </div>
                <button onClick={() => openModal('create', activeView.slice(0, -1))} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-500 transition text-sm">
                    <Plus size={16} /> Add New {activeView === 'students' ? 'Student' : 'Teacher'}
                </button>
            </div>

            {/* Tab Navigation for Students and Teachers */}
            <div className="flex border-b border-slate-200 dark:border-gray-700">
                <button onClick={() => setActiveView('students')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${activeView === 'students' ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400' : 'text-slate-500 dark:text-gray-400 border-transparent hover:text-slate-800 dark:hover:text-white'}`}><Users size={16} /> Students</button>
                <button onClick={() => setActiveView('teachers')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${activeView === 'teachers' ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400' : 'text-slate-500 dark:text-gray-400 border-transparent hover:text-slate-800 dark:hover:text-white'}`}><User size={16} /> Teachers</button>
            </div>

            {/* Render the appropriate table based on active view */}
            {activeView === 'students' ? renderTable(paginatedStudents, 'student') : renderTable(paginatedTeachers, 'teacher')}

            {/* User Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 dark:bg-gray-950/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 id="modal-title" className="text-lg font-medium text-slate-800 dark:text-white">{modalMode === 'create' ? 'Create New' : 'Edit'} {activeView === 'students' ? 'Student' : 'Teacher'}</h2>
                            <button onClick={closeModal} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700" aria-label="Close modal"><X size={20} className="text-slate-500 dark:text-gray-400"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="flex flex-col items-center gap-4 mb-4">
                                {/* Profile Photo Preview */}
                                <img src={photoPreviewUrl || placeholder} alt="Profile Preview" className="w-28 h-28 rounded-full object-cover border-2 border-slate-200 dark:border-gray-700 shadow-sm" />
                                {activeView === 'students' && ( // Only show photo upload/enroll for students
                                    <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                                        <label htmlFor="photo-upload" className="block text-sm font-medium text-slate-700 dark:text-gray-200">Change Profile Photo (for Face Enrollment)</label>
                                        <input
                                            id="photo-upload"
                                            type="file"
                                            accept="image/jpeg,image/png"
                                            onChange={handlePhotoChange}
                                            className="w-full text-sm text-slate-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800 cursor-pointer"
                                        />
                                        {/* Show enroll button only if a new photo is selected and it's an existing student */}
                                        {selectedPhotoFile && currentUser?.student_id && (
                                            <button
                                                type="button"
                                                onClick={handleEnrollFaceFromAdmin}
                                                className="w-full mt-2 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-500 transition text-sm"
                                            >
                                                <Camera size={16} /> Enroll Face Now
                                            </button>
                                        )}
                                        {currentUser?.photo_url && !selectedPhotoFile && (
                                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                                                Current photo enrolled. Select new photo to re-enroll.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Form fields for user details */}
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Full Name</label>
                                    <input name="name" value={formData.name || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Email</label>
                                    <input name="email" type="email" value={formData.email || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Password</label>
                                    <input name="password" type="password" value={formData.password || ''} onChange={handleChange} required={modalMode === 'create'} placeholder={modalMode === 'edit' ? 'Leave blank to keep unchanged' : ''} className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">{activeView === 'students' ? 'Student ID' : 'Teacher ID'}</label>
                                    <input name={activeView === 'students' ? 'student_id' : 'teacher_id'} value={formData[activeView === 'students' ? 'student_id' : 'teacher_id'] || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Department</label>
                                    <input name="department" value={formData.department || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                </div>
                                {/* Student-specific fields */}
                                {activeView === 'students' ? (
                                    <>
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Year</label>
                                            <select name="year" value={formData.year || '1'} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                                                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Semester</label>
                                            <input name="semester" value={formData.semester || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Class Advisor</label>
                                            <input name="class_advisor" value={formData.class_advisor || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                        </div>
                                         <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Boarding Status</label>
                                            <select name="boarding" value={formData.boarding || 'Hosteller'} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                                                <option>Hosteller</option><option>Day Scholar</option>
                                            </select>
                                        </div>
                                         <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Phone</label>
                                            <input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                        </div>
                                    </>
                                ) : (
                                    /* Teacher-specific fields */
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium text-slate-600 dark:text-gray-300 block mb-1">Subjects (comma-separated)</label>
                                        <input name="subjects" value={formData.subjects || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white"/>
                                    </div>
                                )}
                             </div>
                        </form>
                        {/* Modal Action Buttons */}
                        <div className="p-6 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-700 flex justify-end gap-3">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-500">Cancel</button>
                            <button type="submit" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;