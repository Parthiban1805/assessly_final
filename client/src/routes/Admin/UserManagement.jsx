// src/pages/admin/UserManagement.jsx
import axios from 'axios';
import { ChevronLeft, ChevronRight, Edit, Plus, Trash2, User, Users, X, Camera } from 'lucide-react'; // Added Camera icon
import { useEffect, useMemo, useState, useCallback } from 'react'; // Added useCallback
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Loader from '../../components/Loader';
import placeholder from '../../assets/placeholder.png';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const UserManagement = () => {
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('students');
    const navigate = useNavigate();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [currentUser, setCurrentUser] = useState(null); // Holds the user object being edited
    const [formData, setFormData] = useState({});

    // Photo Enrollment State for Modal
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null); // For displaying image preview

    // Pagination State
    const [studentPage, setStudentPage] = useState(1);
    const [teacherPage, setTeacherPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchAllUsers = useCallback(async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            if (!token) { navigate('/login'); return; }
            const response = await axios.get(`${API_BASE_URL}/admin/dashboard-data`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStudents(response.data.students);
            setTeachers(response.data.teachers);
        } catch (error) {
            console.error("Failed to fetch user data:", error);
            Swal.fire('Error', 'Could not fetch user data. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);
    
    // Reset page on view change or items per page change
    useEffect(() => {
        setStudentPage(1);
        setTeacherPage(1);
    }, [itemsPerPage, activeView]);

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
                const endpoint = userType === 'student' ? `/users/students/${user._id}` : `/users/teachers/${user._id}`;
                await axios.delete(`${API_BASE_URL}${endpoint}`, { headers: { 'Authorization': `Bearer ${token}` } });
                
                Swal.fire('Deleted!', `${user.name} has been removed.`, 'success');
                fetchAllUsers(); // Refetch data
            } catch (error) {
                Swal.fire('Error!', error.response?.data?.message || 'Failed to delete user.', 'error');
            }
        }
    };

    const openModal = (mode, userType, user = null) => {
        setModalMode(mode);
        setCurrentUser(user);
        
        const baseForm = userType === 'student'
            ? { name: '', email: '', password: '', student_id: '', department: '', year: '1', semester: 'S1', class_advisor: '', boarding: 'Hosteller', phone: '' }
            : { name: '', email: '', password: '', teacher_id: '', department: '', subjects: '' };

        setFormData(user ? { ...user, password: '' } : baseForm); // Don't show password on edit

        // Initialize photo state for modal
        setPhotoPreviewUrl(user?.photo_url || null);
        setSelectedPhotoFile(null);
        
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentUser(null);
        setFormData({});
        setSelectedPhotoFile(null);
        setPhotoPreviewUrl(null);
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        setSelectedPhotoFile(file);
        if (file) {
            setPhotoPreviewUrl(URL.createObjectURL(file));
        } else {
            // If file input is cleared, revert to existing photo or placeholder
            setPhotoPreviewUrl(currentUser?.photo_url || null); 
        }
    };

    const handleEnrollFaceFromAdmin = async () => {
        if (!selectedPhotoFile) {
            Swal.fire('Warning', 'Please select a photo file first.', 'warning');
            return;
        }
        if (!currentUser || !currentUser.student_id) {
            Swal.fire('Error', 'Student data not available for enrollment.', 'error');
            return;
        }

        const formDataForEnroll = new FormData();
        formDataForEnroll.append('enrollmentPhoto', selectedPhotoFile);
        formDataForEnroll.append('student_id', currentUser.student_id); // Crucial: Send student_id in body

        try {
            const token = sessionStorage.getItem("token");
            Swal.fire({
                title: 'Enrolling Face...',
                text: 'Please wait, this may take a moment.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Call the NEW admin-specific endpoint
            const response = await axios.post(`${API_BASE_URL}/proctoring/admin/enroll-face-for-student`, formDataForEnroll, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
            });
            
            Swal.fire('Success!', response.data.message, 'success');
            // Update the photo_url in formData to reflect the new enrolled photo
            setFormData(prev => ({ ...prev, photo_url: response.data.photoUrl }));
            // Also update the preview
            setPhotoPreviewUrl(response.data.photoUrl);
            setSelectedPhotoFile(null); // Clear selected file after successful upload
            fetchAllUsers(); // Re-fetch to update table data
        } catch (error) {
            console.error("Face enrollment failed:", error);
            Swal.fire('Error!', error.response?.data?.message || 'Failed to enroll face.', 'error');
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        const userType = activeView === 'students' ? 'student' : 'teacher';
        const token = sessionStorage.getItem("token");
        
        // Remove empty password field for updates
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
                    Swal.showLoading();
                }
            });

            let response;
            if (modalMode === 'create') {
                const endpoint = userType === 'student' ? '/users/students' : '/users/teachers';
                response = await axios.post(`${API_BASE_URL}${endpoint}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
            } else {
                const endpoint = userType === 'student' ? `/users/students/${currentUser._id}` : `/users/teachers/${currentUser._id}`;
                response = await axios.put(`${API_BASE_URL}${endpoint}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
            }
            Swal.fire('Success!', response.data.message, 'success');
            closeModal();
            fetchAllUsers();
        } catch (error) {
            console.error("User save failed:", error);
            Swal.fire('Error!', error.response?.data?.message || 'Operation failed.', 'error');
        }
    };

    const paginatedStudents = useMemo(() => {
        const firstItem = (studentPage - 1) * itemsPerPage;
        return students.slice(firstItem, firstItem + itemsPerPage);
    }, [students, studentPage, itemsPerPage]);

    const paginatedTeachers = useMemo(() => {
        const firstItem = (teacherPage - 1) * itemsPerPage;
        return teachers.slice(firstItem, firstItem + itemsPerPage);
    }, [teachers, teacherPage, itemsPerPage]);

    if (loading) return <Loader />;

    const renderTable = (users, userType) => {
        const isStudent = userType === 'student';
        const totalPages = Math.ceil((isStudent ? students.length : teachers.length) / itemsPerPage);
        const currentPage = isStudent ? studentPage : teacherPage;
        const setCurrentPage = isStudent ? setStudentPage : setTeacherPage;

        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 uppercase">
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
                        <tbody className="divide-y divide-slate-200">
                            {users.map(user => (
                                <tr key={user._id} className="hover:bg-slate-50">
                                    <td className='p-4'>
                                        <img src={user.photo_url || placeholder} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                                    </td>
                                    <td className="p-4 font-medium text-slate-800">{user.name}</td>
                                    <td className="p-4 text-slate-600">{isStudent ? user.student_id : user.teacher_id}</td>
                                    <td className="p-4 text-slate-600">{user.email}</td>
                                    <td className="p-4 text-slate-600">{user.department}</td>
                                    {isStudent && <td className="p-4 text-center text-slate-600">{user.year}</td>}
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openModal('edit', userType, user)} className="p-2 text-slate-500 hover:bg-blue-100 hover:text-blue-600 rounded-md" title="Edit"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(user, userType)} className="p-2 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-md" title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                     <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span>Show</span>
                            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 rounded-md">
                                <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
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
        );
    };

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-slate-800">User Management</h1>
                    <p className="text-slate-500 mt-1">Add, view, or edit students and teachers.</p>
                </div>
                <button onClick={() => openModal('create', activeView.slice(0, -1))} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">
                    <Plus size={16} /> Add New {activeView === 'students' ? 'Student' : 'Teacher'}
                </button>
            </div>

            <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveView('students')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${activeView === 'students' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}><Users size={16} /> Students</button>
                <button onClick={() => setActiveView('teachers')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${activeView === 'teachers' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}><User size={16} /> Teachers</button>
            </div>

            {activeView === 'students' ? renderTable(paginatedStudents, 'student') : renderTable(paginatedTeachers, 'teacher')}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-fadeIn">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-lg font-medium text-slate-800">{modalMode === 'create' ? 'Create New' : 'Edit'} {activeView === 'students' ? 'Student' : 'Teacher'}</h2>
                            <button onClick={closeModal} className="p-1 rounded-full hover:bg-slate-100"><X size={20} className="text-slate-500"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="flex flex-col items-center gap-4 mb-4">
                                <img src={photoPreviewUrl || placeholder} alt="Profile Preview" className="w-28 h-28 rounded-full object-cover border-2 border-slate-200 shadow-sm" />
                                {activeView === 'students' && ( // Only show photo upload/enroll for students
                                    <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                                        <label htmlFor="photo-upload" className="block text-sm font-medium text-slate-700">Change Profile Photo (for Face Enrollment)</label>
                                        <input 
                                            id="photo-upload"
                                            type="file" 
                                            accept="image/jpeg,image/png" 
                                            onChange={handlePhotoChange} 
                                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
                                        />
                                        {/* Show enroll button only if a new photo is selected and it's an existing student */}
                                        {selectedPhotoFile && currentUser?.student_id && (
                                            <button 
                                                type="button" 
                                                onClick={handleEnrollFaceFromAdmin} 
                                                className="w-full mt-2 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition text-sm"
                                            >
                                                <Camera size={16} /> Enroll Face Now
                                            </button>
                                        )}
                                        {currentUser?.photo_url && !selectedPhotoFile && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Current photo enrolled. Select new photo to re-enroll.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 block mb-1">Full Name</label>
                                    <input name="name" value={formData.name || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 block mb-1">Email</label>
                                    <input name="email" type="email" value={formData.email || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 block mb-1">Password</label>
                                    <input name="password" type="password" value={formData.password || ''} onChange={handleChange} required={modalMode === 'create'} placeholder={modalMode === 'edit' ? 'Leave blank to keep unchanged' : ''} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 block mb-1">{activeView === 'students' ? 'Student ID' : 'Teacher ID'}</label>
                                    <input name={activeView === 'students' ? 'student_id' : 'teacher_id'} value={formData[activeView === 'students' ? 'student_id' : 'teacher_id'] || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 block mb-1">Department</label>
                                    <input name="department" value={formData.department || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                </div>
                                {activeView === 'students' ? (
                                    <>
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 block mb-1">Year</label>
                                            <select name="year" value={formData.year || '1'} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 block mb-1">Semester</label>
                                            <input name="semester" value={formData.semester || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 block mb-1">Class Advisor</label>
                                            <input name="class_advisor" value={formData.class_advisor || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                        </div>
                                         <div>
                                            <label className="text-sm font-medium text-slate-600 block mb-1">Boarding Status</label>
                                            <select name="boarding" value={formData.boarding || 'Hosteller'} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                                <option>Hosteller</option><option>Day Scholar</option>
                                            </select>
                                        </div>
                                         <div>
                                            <label className="text-sm font-medium text-slate-600 block mb-1">Phone</label>
                                            <input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                        </div>
                                    </>
                                ) : (
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium text-slate-600 block mb-1">Subjects (comma-separated)</label>
                                        <input name="subjects" value={formData.subjects || ''} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                                    </div>
                                )}
                             </div>
                        </form>
                        <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300">Cancel</button>
                            <button type="submit" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;