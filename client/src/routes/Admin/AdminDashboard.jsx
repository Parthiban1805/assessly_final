import axios from 'axios';
import { Bell, Book, ChevronLeft, ChevronRight, Mail, MessageCircleMore, Phone, School, Search, User, UserPlus, Users, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import placeholder from '../../assets/placeholder.png'; // Placeholder image for user avatars
import AdminChatbot from '../../components/AdminChatbot'; // Admin-specific chatbot component
import Loader from '../../components/Loader'; // Global loading spinner component
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * AdminDashboard component provides an overview and management interface for administrators.
 * It displays quick stats, allows management of students and teachers, and integrates an AI chatbot.
 *
 * @returns {JSX.Element} The Admin Dashboard UI.
 */
const AdminDashboard = () => {
    // State to hold the main dashboard data, including lists of students and teachers.
    const [pageData, setPageData] = useState({ students: [], teachers: [] });
    // State to manage overall loading status of the dashboard data.
    const [loading, setLoading] = useState(true);
    // State to store any error messages during data fetching.
    const [error, setError] = useState('');
    // State to control which tab is active: 'students' or 'teachers'.
    const [activeView, setActiveView] = useState('students');
    // State to hold details of the currently selected student for the detail panel.
    const [selectedStudent, setSelectedStudent] = useState(null);
    // State to hold details of the currently selected teacher for the detail panel.
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    // State for search input in the student list.
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    // State for search input in the teacher list.
    const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
    // Cache for storing fetched user details to avoid re-fetching.
    const [detailsCache, setDetailsCache] = useState({ students: {}, teachers: {} });
    // State to control the visibility of the Admin Chatbot.
    const [isChatOpen, setIsChatOpen] = useState(false);
    const navigate = useNavigate(); // Hook for programmatic navigation.

    // Pagination states for students list.
    const [studentCurrentPage, setStudentCurrentPage] = useState(1);
    const [studentItemsPerPage, setStudentItemsPerPage] = useState(10);
    // Pagination states for teachers list.
    const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
    const [teacherItemsPerPage, setTeacherItemsPerPage] = useState(10);

    /**
     * Effect hook to fetch initial dashboard data on component mount.
     * Redirects to login if no authentication token is found.
     */
    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = sessionStorage.getItem("token");
            if (!token) {
                navigate('/login'); // Redirect to login if not authenticated.
                return;
            }
            try {
                setLoading(true); // Start loading state.
                setError(''); // Clear any previous errors.
                // Fetch combined dashboard data for students and teachers.
                const response = await axios.get(`${API_BASE_URL}/admin/dashboard-data`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });
                setPageData(response.data); // Set fetched data to state.
            } catch (err) {
                // Set error message from API response or a generic one.
                setError(err.response?.data?.message || 'Failed to load records.');
            } finally {
                setLoading(false); // End loading state.
            }
        };
        fetchDashboardData();
    }, [navigate]); // Dependency: navigate function.

    /**
     * Effect hook to reset student pagination to page 1 whenever search term or items per page changes.
     */
    useEffect(() => {
        setStudentCurrentPage(1);
    }, [studentSearchTerm, studentItemsPerPage]);

    /**
     * Effect hook to reset teacher pagination to page 1 whenever search term or items per page changes.
     */
    useEffect(() => {
        setTeacherCurrentPage(1);
    }, [teacherSearchTerm, teacherItemsPerPage]);

    /**
     * Fetches and displays detailed information for a selected student.
     * Uses a cache to avoid re-fetching details for already viewed students.
     * Uses useCallback for memoization to prevent unnecessary re-creation.
     *
     * @param {string} studentId - The ID of the student to fetch details for.
     */
    const handleStudentClick = useCallback(async (studentId) => {
        // Check if student details are already in cache.
        if (detailsCache.students[studentId]) {
            setSelectedStudent(detailsCache.students[studentId]);
            return;
        }
        try {
            const token = sessionStorage.getItem("token");
            // Fetch student details from the API.
            const response = await axios.get(`${API_BASE_URL}/users/${studentId}?type=student`, { headers: { 'Authorization': `Bearer ${token}` } });
            const studentDetails = response.data;
            // Update cache and selected student state.
            setDetailsCache(prev => ({ ...prev, students: { ...prev.students, [studentId]: studentDetails } }));
            setSelectedStudent(studentDetails);
        } catch (err) {
            setError('Failed to load student details.');
        }
    }, [detailsCache]); // Dependency: detailsCache state.

    /**
     * Fetches and displays detailed information for a selected teacher.
     * Uses a cache to avoid re-fetching details for already viewed teachers.
     * Uses useCallback for memoization.
     *
     * @param {string} teacherId - The ID of the teacher to fetch details for.
     */
    const handleTeacherClick = useCallback(async (teacherId) => {
        // Check if teacher details are already in cache.
        if (detailsCache.teachers[teacherId]) {
            setSelectedTeacher(detailsCache.teachers[teacherId]);
            return;
        }
        try {
            const token = sessionStorage.getItem("token");
            // Fetch teacher details from the API.
            const response = await axios.get(`${API_BASE_URL}/users/${teacherId}?type=teacher`, { headers: { 'Authorization': `Bearer ${token}` } });
            const teacherDetails = response.data;
            // Update cache and selected teacher state.
            setDetailsCache(prev => ({ ...prev, teachers: { ...prev.teachers, [teacherId]: teacherDetails } }));
            setSelectedTeacher(teacherDetails);
        } catch (err) {
            setError('Failed to load teacher details.');
        }
    }, [detailsCache]); // Dependency: detailsCache state.

    /**
     * Toggles the active view between 'students' and 'teachers' tabs.
     * Uses useCallback for memoization.
     *
     * @param {string} view - The view to activate ('students' or 'teachers').
     */
    const handleToggleView = useCallback((view) => { setActiveView(view); }, []);

    // Memoized filtered lists for students and teachers based on search terms.
    const filteredStudents = useMemo(() => pageData.students.filter(s => (s.name?.toLowerCase() || '').includes(studentSearchTerm.toLowerCase()) || (String(s.student_id || '').toLowerCase()).includes(studentSearchTerm.toLowerCase())), [pageData.students, studentSearchTerm]);
    const filteredTeachers = useMemo(() => pageData.teachers.filter(t => (t.name?.toLowerCase() || '').includes(teacherSearchTerm.toLowerCase()) || (String(t.teacher_id || '').toLowerCase()).includes(teacherSearchTerm.toLowerCase())), [pageData.teachers, teacherSearchTerm]);

    // Pagination calculations for students.
    const studentTotalPages = Math.ceil(filteredStudents.length / studentItemsPerPage);
    const studentIndexOfLastItem = studentCurrentPage * studentItemsPerPage;
    const studentIndexOfFirstItem = studentIndexOfLastItem - studentItemsPerPage;
    const currentStudents = filteredStudents.slice(studentIndexOfFirstItem, studentIndexOfLastItem);

    // Pagination calculations for teachers.
    const teacherTotalPages = Math.ceil(filteredTeachers.length / teacherItemsPerPage);
    const teacherIndexOfLastItem = teacherCurrentPage * teacherItemsPerPage;
    const teacherIndexOfFirstItem = teacherIndexOfLastItem - teacherItemsPerPage;
    const currentTeachers = filteredTeachers.slice(teacherIndexOfFirstItem, teacherIndexOfLastItem);

    // Display loading spinner if data is being fetched.
    if (loading) return <Loader />;
    // Display error message if data fetching failed.
    if (error) return <div className="p-6 text-center text-red-600 dark:text-red-400">Error: {error}</div>;

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            {/* Quick Stats / Action Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Admin User Card */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm flex items-center gap-5">
                    <img src={placeholder} alt="Admin" className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 dark:border-gray-700" />
                    <div>
                        <h3 className="text-lg font-medium text-slate-800 dark:text-white">Admin User</h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400">Administrator</p>
                    </div>
                </div>
                {/* Add New User Card (clickable to navigate) */}
                <div onClick={() => navigate('/add-user')} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm flex items-center gap-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"><UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-300" /></div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-white">Add New User</h4>
                        <p className="text-sm text-slate-500 dark:text-gray-400">Onboard new students or teachers.</p>
                    </div>
                </div>
                {/* Manage Notifications Card (clickable to navigate) */}
                <div onClick={() => navigate('/all-notification')} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm flex items-center gap-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"><Bell className="w-6 h-6 text-blue-600 dark:text-blue-300" /></div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-white">Manage Notifications</h4>
                        <p className="text-sm text-slate-500 dark:text-gray-400">Create and view announcements.</p>
                    </div>
                </div>
            </div>

            {/* Students/Teachers List and Details Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                {/* View Toggle Buttons */}
                <div className="p-3 border-b border-slate-200 dark:border-gray-700">
                    <div className="flex bg-slate-100 dark:bg-gray-700 p-1 rounded-lg w-full sm:w-auto sm:inline-flex">
                        <button onClick={() => handleToggleView('students')} className={`w-1/2 sm:w-auto px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'students' ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-800 dark:hover:text-white'}`}>Students</button>
                        <button onClick={() => handleToggleView('teachers')} className={`w-1/2 sm:w-auto px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'teachers' ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-gray-300 hover:text-slate-800 dark:hover:text-white'}`}>Teachers</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[60vh]">
                    {/* User List Panel */}
                    <div className="lg:col-span-1 lg:border-r border-slate-200 dark:border-gray-700 flex flex-col">
                        {/* Search Input */}
                        <div className="p-4 border-b border-slate-200 dark:border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-500 pointer-events-none" />
                                <input type="text" placeholder={`Search ${activeView}...`}
                                    value={activeView === 'students' ? studentSearchTerm : teacherSearchTerm}
                                    onChange={(e) => activeView === 'students' ? setStudentSearchTerm(e.target.value) : setTeacherSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"
                                />
                            </div>
                        </div>
                        {/* Scrollable User List */}
                        <div className="overflow-y-auto flex-grow">
                            {activeView === 'students' ? (
                                currentStudents.length > 0 ?
                                    currentStudents.map(student => <UserListItem key={student.student_id} user={student} onClick={handleStudentClick} idField="student_id" isSelected={selectedStudent?.student_id === student.student_id} />) :
                                    <div className="p-6 text-center text-slate-500 dark:text-gray-400">No students found.</div>
                            ) : (
                                currentTeachers.length > 0 ?
                                    currentTeachers.map(teacher => <UserListItem key={teacher.teacher_id} user={teacher} onClick={handleTeacherClick} idField="teacher_id" isSelected={selectedTeacher?.teacher_id === teacher.teacher_id} />) :
                                    <div className="p-6 text-center text-slate-500 dark:text-gray-400">No teachers found.</div>
                            )}
                        </div>
                        {/* Pagination Controls for User Lists */}
                        {activeView === 'students' && studentTotalPages > 1 && (
                            <PaginationControls
                                currentPage={studentCurrentPage}
                                totalPages={studentTotalPages}
                                setCurrentPage={setStudentCurrentPage}
                                itemsPerPage={studentItemsPerPage}
                                setItemsPerPage={setStudentItemsPerPage}
                            />
                        )}
                        {activeView === 'teachers' && teacherTotalPages > 1 && (
                             <PaginationControls
                                currentPage={teacherCurrentPage}
                                totalPages={teacherTotalPages}
                                setCurrentPage={setTeacherCurrentPage}
                                itemsPerPage={teacherItemsPerPage}
                                setItemsPerPage={setTeacherItemsPerPage}
                            />
                        )}
                    </div>
                    {/* User Details Panel */}
                    <div className="lg:col-span-2 p-6 bg-slate-50/50 dark:bg-gray-900/50">
                        {activeView === 'students' ? (
                            selectedStudent ? <StudentDetails student={selectedStudent} /> : <EmptyState message="Select a student to view their details" icon={<Users />} />
                        ) : (
                            selectedTeacher ? <TeacherDetails teacher={selectedTeacher} /> : <EmptyState message="Select a teacher to view their details" icon={<User />} />
                        )}
                    </div>
                </div>
            </div>
            {/* Floating Chatbot Button */}
            {!isChatOpen && (
                <button
                    className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-all duration-300 hover:scale-110"
                    onClick={() => setIsChatOpen(true)}
                    title="Open Admin Assistant"
                    aria-label="Open admin assistant chatbot"
                >
                    <MessageCircleMore size={28} />
                </button>
            )}

            {/* Admin Chatbot Component */}
            {isChatOpen && <AdminChatbot closeChat={() => setIsChatOpen(false)} />}
        </div>
    );
};

/**
 * UserListItem component displays a single user (student or teacher) in a list.
 * It's memoized for performance optimization.
 *
 * @param {object} props - Component props.
 * @param {object} props.user - The user object to display.
 * @param {function} props.onClick - Callback function when the item is clicked.
 * @param {string} props.idField - The field name containing the unique ID (e.g., 'student_id' or 'teacher_id').
 * @param {boolean} props.isSelected - True if this item is currently selected.
 * @returns {JSX.Element} A list item for a user.
 */
const UserListItem = React.memo(({ user, onClick, idField, isSelected }) => (
    <div onClick={() => onClick(user[idField])} className={`flex items-center gap-4 p-4 cursor-pointer border-b border-slate-100 dark:border-gray-700 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900' : 'hover:bg-slate-50 dark:hover:bg-gray-700/50'}`}>
        <img src={user.photo_url || placeholder} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-grow">
            <p className={`font-semibold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-white'}`}>{user.name}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400">{user[idField]}</p>
        </div>
    </div>
));

/**
 * PaginationControls component provides controls for navigating through paginated lists.
 *
 * @param {object} props - Component props.
 * @param {number} props.currentPage - The current page number.
 * @param {number} props.totalPages - The total number of pages available.
 * @param {function} props.setCurrentPage - Callback to set the current page.
 * @param {number} props.itemsPerPage - The current number of items displayed per page.
 * @param {function} props.setItemsPerPage - Callback to set the number of items per page.
 * @returns {JSX.Element} Pagination navigation controls.
 */
const PaginationControls = ({ currentPage, totalPages, setCurrentPage, itemsPerPage, setItemsPerPage }) => (
    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
            <span>Show</span>
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                <option value={5}>5</option>
                <option value={10}>10</option>
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
);

/**
 * StudentDetails component displays comprehensive details about a selected student.
 *
 * @param {object} props - Component props.
 * @param {object} props.student - The student object to display details for.
 * @returns {JSX.Element} Student details UI.
 */
const StudentDetails = ({ student }) => (
    <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm">
                <img src={student.photo_url || placeholder} alt={student.name} className="w-24 h-24 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md" />
                <div>
                    <h2 className="text-2xl font-medium text-slate-800 dark:text-white">{student.name}</h2>
                    <p className="text-slate-500 dark:text-gray-400">{student.student_id}</p>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">{student.department} | Year: {student.year}</p>
                </div>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase">Contact & Mentor</h3>
                <div className="space-y-2 text-sm text-slate-700 dark:text-gray-200">
                    <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400 dark:text-gray-500" /><span>{student.email || '-'}</span></p>
                    <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400 dark:text-gray-500" /><span>{student.phone || '-'}</span></p>
                    <p className="flex items-center gap-2"><User size={14} className="text-slate-400 dark:text-gray-500" /><span>Mentor: {student.class_advisor || '-'}</span></p>
                    <p className="flex items-center gap-2"><School size={14} className="text-slate-400 dark:text-gray-500" /><span>Boarding: {student.boarding || '-'}</span></p>
                </div>
            </div>
        </div>
        <div className="p-5 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase">Academic Performance</h3>
            {student.subjects?.length > 0 ? (
                <table className="w-full text-sm text-slate-700 dark:text-gray-200">
                    <thead className="text-left">
                        <tr className="border-b border-slate-200 dark:border-gray-700">
                            <th className="pb-1 font-medium text-slate-500 dark:text-gray-400">Subject</th>
                            <th className="pb-1 font-medium text-slate-500 dark:text-gray-400 text-center">Total Assessments</th>
                            <th className="pb-1 font-medium text-slate-500 dark:text-gray-400 text-center">Present Assessments</th>
                            <th className="pb-1 font-medium text-slate-500 dark:text-gray-400 text-center">Marks</th>
                        </tr>
                    </thead>
                    <tbody>{student.subjects.map((sub, i) =>
                        <tr key={i} className="border-b border-slate-100 dark:border-gray-700/50 last:border-b-0">
                            <td className="py-1.5">{sub.name}</td>
                            <td className="py-1.5 text-center font-semibold">{sub.totalAssessments || 0}</td>
                            <td className="py-1.5 text-center font-semibold">{sub.attendedAssessments || 0}</td>
                            <td className="py-1.5 text-center font-semibold">{sub.totalMarks || 0}</td>
                        </tr>)}</tbody>
                </table>
            ) : <p className="text-sm text-slate-500 dark:text-gray-400 text-center py-4">No performance data available.</p>}
        </div>
    </div>
);

/**
 * TeacherDetails component displays comprehensive details about a selected teacher.
 *
 * @param {object} props - Component props.
 * @param {object} props.teacher - The teacher object to display details for.
 * @returns {JSX.Element} Teacher details UI.
 */
const TeacherDetails = ({ teacher }) => (
    <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm">
            <img src={teacher.photo_url || placeholder} alt={teacher.name} className="w-24 h-24 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md" />
            <div>
                <h2 className="text-2xl font-medium text-slate-800 dark:text-white">{teacher.name}</h2>
                <p className="text-slate-500 dark:text-gray-400">{teacher.teacher_id}</p>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">{teacher.department}</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase">Contact Information</h3>
                <div className="space-y-2 text-sm text-slate-700 dark:text-gray-200">
                    <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400 dark:text-gray-500" /><span>{teacher.email || '-'}</span></p>
                    <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400 dark:text-gray-500" /><span>{teacher.phone || '-'}</span></p>
                </div>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 uppercase">Assigned Subjects</h3>
                {teacher.subjects && teacher.subjects.length > 0 ? (
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-gray-200">
                        {(Array.isArray(teacher.subjects) ? teacher.subjects : [teacher.subjects]).map((s, i) =>
                            <li key={i} className="flex items-center gap-2">
                                <Book size={14} className="text-slate-400 dark:text-gray-500" />{s}
                            </li>
                        )}
                    </ul>
                ) : <p className="text-sm text-slate-500 dark:text-gray-400 text-center py-4">No subjects assigned.</p>}
            </div>
        </div>
    </div>
);

/**
 * EmptyState component displays a friendly message and icon when no data is available for display.
 *
 * @param {object} props - Component props.
 * @param {string} props.message - The message to display.
 * @param {React.ReactElement} props.icon - The icon to display.
 * @returns {JSX.Element} The empty state UI.
 */
const EmptyState = ({ message, icon }) => (
    <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-gray-400 text-center animate-fadeIn">
        <div className="w-16 h-16 text-slate-300 dark:text-gray-600 mb-4">{icon}</div>
        <p className="font-medium">{message}</p>
    </div>
);

export default AdminDashboard;
