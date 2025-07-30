import axios from 'axios';
import { Bell, Book, ChevronLeft, ChevronRight, Mail, MessageCircleMore, Phone, School, Search, User, UserPlus, Users } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import placeholder from '../../assets/placeholder.png';
import AdminChatbot from '../../components/AdminChatbot';
import Loader from '../../components/Loader';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const AdminDashboard = () => {
    // --- All existing state and logic is preserved ---
    const [pageData, setPageData] = useState({ students: [], teachers: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeView, setActiveView] = useState('students');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
    const [detailsCache, setDetailsCache] = useState({ students: {}, teachers: {} });
    const [isChatOpen, setIsChatOpen] = useState(false); 
    const navigate = useNavigate();

    // --- Pagination State ---
    const [studentCurrentPage, setStudentCurrentPage] = useState(1);
    const [studentItemsPerPage, setStudentItemsPerPage] = useState(10);
    const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
    const [teacherItemsPerPage, setTeacherItemsPerPage] = useState(10);


    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = sessionStorage.getItem("token");
            if (!token) { navigate('/login'); return; }
            try {
                setLoading(true);
                setError('');
                const response = await axios.get(`${API_BASE_URL}/admin/dashboard-data`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPageData(response.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load records.');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [navigate]);

    // Reset pagination on search or items per page change
    useEffect(() => {
        setStudentCurrentPage(1);
    }, [studentSearchTerm, studentItemsPerPage]);

    useEffect(() => {
        setTeacherCurrentPage(1);
    }, [teacherSearchTerm, teacherItemsPerPage]);


    const handleStudentClick = useCallback(async (studentId) => {
        if (detailsCache.students[studentId]) { setSelectedStudent(detailsCache.students[studentId]); return; }
        try {
            const token = sessionStorage.getItem("token");
            const response = await axios.get(`${API_BASE_URL}/users/${studentId}?type=student`, { headers: { 'Authorization': `Bearer ${token}` } });
            const studentDetails = response.data;
            setDetailsCache(prev => ({ ...prev, students: { ...prev.students, [studentId]: studentDetails } }));
            setSelectedStudent(studentDetails);
        } catch (err) { setError('Failed to load student details.'); }
    }, [detailsCache]);

    const handleTeacherClick = useCallback(async (teacherId) => {
        if (detailsCache.teachers[teacherId]) { setSelectedTeacher(detailsCache.teachers[teacherId]); return; }
        try {
            const token = sessionStorage.getItem("token");
            const response = await axios.get(`${API_BASE_URL}/users/${teacherId}?type=teacher`, { headers: { 'Authorization': `Bearer ${token}` } });
            const teacherDetails = response.data;
            setDetailsCache(prev => ({ ...prev, teachers: { ...prev.teachers, [teacherId]: teacherDetails } }));
            setSelectedTeacher(teacherDetails);
        } catch (err) { setError('Failed to load teacher details.'); }
    }, [detailsCache]);

    const handleToggleView = useCallback((view) => { setActiveView(view); }, []);

    const filteredStudents = useMemo(() => pageData.students.filter(s => (s.name?.toLowerCase() || '').includes(studentSearchTerm.toLowerCase()) || (String(s.student_id || '').toLowerCase()).includes(studentSearchTerm.toLowerCase())), [pageData.students, studentSearchTerm]);
    const filteredTeachers = useMemo(() => pageData.teachers.filter(t => (t.name?.toLowerCase() || '').includes(teacherSearchTerm.toLowerCase()) || (String(t.teacher_id || '').toLowerCase()).includes(teacherSearchTerm.toLowerCase())), [pageData.teachers, teacherSearchTerm]);
    
    // --- Pagination Logic ---
    const studentTotalPages = Math.ceil(filteredStudents.length / studentItemsPerPage);
    const studentIndexOfLastItem = studentCurrentPage * studentItemsPerPage;
    const studentIndexOfFirstItem = studentIndexOfLastItem - studentItemsPerPage;
    const currentStudents = filteredStudents.slice(studentIndexOfFirstItem, studentIndexOfLastItem);

    const teacherTotalPages = Math.ceil(filteredTeachers.length / teacherItemsPerPage);
    const teacherIndexOfLastItem = teacherCurrentPage * teacherItemsPerPage;
    const teacherIndexOfFirstItem = teacherIndexOfLastItem - teacherItemsPerPage;
    const currentTeachers = filteredTeachers.slice(teacherIndexOfFirstItem, teacherIndexOfLastItem);


    if (loading) return <Loader />;
    if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>;

    return (
        <div className="max-w-7xl mx-auto min-h-screen space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <img src={placeholder} alt="Admin" className="w-16 h-16 rounded-full object-cover border-2 border-slate-100" />
                    <div>
                        <h3 className="text-lg font-medium text-slate-800">Admin User</h3>
                        <p className="text-sm text-slate-500">Administrator</p>
                    </div>
                </div>
                <div onClick={() => navigate('/add-user')} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 cursor-pointer hover:bg-slate-50">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"><UserPlus className="w-6 h-6 text-blue-600" /></div>
                    <div>
                        <h4 className="font-semibold text-slate-800">Add New User</h4>
                        <p className="text-sm text-slate-500">Onboard new students or teachers.</p>
                    </div>
                </div>
                <div onClick={() => navigate('/all-notification')} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 cursor-pointer hover:bg-slate-50">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"><Bell className="w-6 h-6 text-blue-600" /></div>
                    <div>
                        <h4 className="font-semibold text-slate-800">Manage Notifications</h4>
                        <p className="text-sm text-slate-500">Create and view announcements.</p>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-3 border-b border-slate-200">
                    <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto sm:inline-flex">
                        <button onClick={() => handleToggleView('students')} className={`w-1/2 sm:w-auto px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'students' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}>Students</button>
                        <button onClick={() => handleToggleView('teachers')} className={`w-1/2 sm:w-auto px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'teachers' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}>Teachers</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[60vh]">
                    <div className="lg:col-span-1 lg:border-r border-slate-200 flex flex-col">
                        <div className="p-4 border-b border-slate-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input type="text" placeholder={`Search ${activeView}...`} value={activeView === 'students' ? studentSearchTerm : teacherSearchTerm} onChange={(e) => activeView === 'students' ? setStudentSearchTerm(e.target.value) : setTeacherSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                            {activeView === 'students' ? (
                                currentStudents.length > 0 ? currentStudents.map(student => <UserListItem key={student.student_id} user={student} onClick={handleStudentClick} idField="student_id" isSelected={selectedStudent?.student_id === student.student_id} />) : <div className="p-6 text-center text-slate-500">No students found.</div>
                            ) : (
                                currentTeachers.length > 0 ? currentTeachers.map(teacher => <UserListItem key={teacher.teacher_id} user={teacher} onClick={handleTeacherClick} idField="teacher_id" isSelected={selectedTeacher?.teacher_id === teacher.teacher_id} />) : <div className="p-6 text-center text-slate-500">No teachers found.</div>
                            )}
                        </div>
                        {/* --- Pagination Controls --- */}
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
                    <div className="lg:col-span-2 p-6 bg-slate-50/50">
                        {activeView === 'students' ? (
                            selectedStudent ? <StudentDetails student={selectedStudent} /> : <EmptyState message="Select a student to view their details" icon={<Users />} />
                        ) : (
                            selectedTeacher ? <TeacherDetails teacher={selectedTeacher} /> : <EmptyState message="Select a teacher to view their details" icon={<User />} />
                        )}
                    </div>
                </div>
            </div>
            {!isChatOpen && (
                <button 
                    className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all duration-300 hover:scale-110"
                    onClick={() => setIsChatOpen(true)}
                    title="Open Admin Assistant"
                >
                    <MessageCircleMore size={28} />
                </button>
            )}

            {isChatOpen && <AdminChatbot closeChat={() => setIsChatOpen(false)} />}
        </div>
    );
};

const UserListItem = React.memo(({ user, onClick, idField, isSelected }) => (
    <div onClick={() => onClick(user[idField])} className={`flex items-center gap-4 p-4 cursor-pointer border-b border-slate-100 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
        <img src={user.photo_url || placeholder} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-grow">
            <p className={`font-semibold text-sm ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{user.name}</p>
            <p className="text-xs text-slate-500">{user[idField]}</p>
        </div>
    </div>
));

const PaginationControls = ({ currentPage, totalPages, setCurrentPage, itemsPerPage, setItemsPerPage }) => (
    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Show</span>
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 rounded-md">
                <option value={5}>5</option>
                <option value={10}>10</option>
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
);

const StudentDetails = ({ student }) => (
    <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white rounded-lg border border-slate-200">
                <img src={student.photo_url || placeholder} alt={student.name} className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md" />
                <div>
                    <h2 className="text-2xl font-medium text-slate-800">{student.name}</h2>
                    <p className="text-slate-500">{student.student_id}</p>
                    <p className="text-sm text-slate-500 mt-1">{student.department} | Year: {student.year}</p>
                </div>
            </div>
            <div className="p-5 bg-white rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-blue-600 mb-3 uppercase">Contact & Mentor</h3>
                <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /><span>{student.email || '-'}</span></p>
                    <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /><span>{student.phone || '-'}</span></p>
                    <p className="flex items-center gap-2"><User size={14} className="text-slate-400" /><span>Mentor: {student.class_advisor || '-'}</span></p>
                    <p className="flex items-center gap-2"><School size={14} className="text-slate-400" /><span>Boarding: {student.boarding || '-'}</span></p>
                </div>
            </div>
        </div>
        <div className="p-5 bg-white rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-blue-600 mb-3 uppercase">Academic Performance</h3>
            {student.subjects?.length > 0 ? (
                <table className="w-full text-sm">
                    <thead className="text-left">
                        <tr className="border-b">
                            <th className="pb-1 font-medium text-slate-500">Subject</th>
                            <th className="pb-1 font-medium text-slate-500 text-center">Total Assessments</th>
                            <th className="pb-1 font-medium text-slate-500 text-center">Present Assessments</th>
                            <th className="pb-1 font-medium text-slate-500 text-center">Marks</th>
                        </tr>
                    </thead>
                    <tbody>{student.subjects.map((sub, i) => 
                        <tr key={i}>
                            <td className="py-1.5">{sub.name}</td>
                            <td className="py-1.5 text-center font-semibold">{sub.totalAssessments || 0}</td>
                            <td className="py-1.5 text-center font-semibold">{sub.attendedAssessments || 0}</td>
                            <td className="py-1.5 text-center font-semibold">{sub.totalMarks || 0}</td>
                        </tr>)}</tbody>
                </table>
            ) : <p className="text-sm text-slate-500 text-center py-4">No performance data available.</p>}
        </div>
    </div>
);

const TeacherDetails = ({ teacher }) => (
    <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white rounded-lg border border-slate-200">
            <img src={teacher.photo_url || placeholder} alt={teacher.name} className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md" />
            <div>
                <h2 className="text-2xl font-medium text-slate-800">{teacher.name}</h2>
                <p className="text-slate-500">{teacher.teacher_id}</p>
                <p className="text-sm text-slate-500 mt-1">{teacher.department}</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-white rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-blue-600 mb-3 uppercase">Contact Information</h3>
                <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /><span>{teacher.email || '-'}</span></p>
                    <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /><span>{teacher.phone || '-'}</span></p>
                </div>
            </div>
            <div className="p-5 bg-white rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-blue-600 mb-3 uppercase">Assigned Subjects</h3>
                {teacher.subjects && teacher.subjects.length > 0 ? (
                    <ul className="space-y-1.5 text-sm">{(Array.isArray(teacher.subjects) ? teacher.subjects : [teacher.subjects]).map((s, i) => <li key={i} className="flex items-center gap-2"><Book size={14} className="text-slate-400" />{s}</li>)}</ul>
                ) : <p className="text-sm text-slate-500 text-center py-4">No subjects assigned.</p>}
            </div>
        </div>
    </div>
);

const EmptyState = ({ message, icon }) => (
    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center animate-fadeIn">
        <div className="w-16 h-16 text-slate-300 mb-4">{icon}</div>
        <p className="font-medium">{message}</p>
    </div>
);

export default AdminDashboard;