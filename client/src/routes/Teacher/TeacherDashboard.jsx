// ==============================================
// File: src/routes/Teacher_Dashboard/Teacher_Dashboard.jsx
// ==============================================
import axios from 'axios'; // Import axios
import { ChevronLeft, ChevronRight, MessageCircleMore } from 'lucide-react'; // Assuming lucide-react is used for icons
import { useEffect, useState } from 'react';
import 'react-loading-skeleton/dist/skeleton.css';
import placeholder from '../../assets/placeholder.png';
import { useAuth } from '../../contexts/AuthContext';
// Assuming these are your components from the same directory
// Assuming Loader and Teacher_Chatbot are imported from components directory
// import Loader from '../../components/Loader';
import TeacherChatbot from '../../components/Teacher_Chatbot';

// --------------------------------------------------
// Overview component encapsulates existing dashboard
// --------------------------------------------------
const Teacher_Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [studentReports, setStudentReports] = useState([]);
  const [error, setError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { user, isAuthenticated } = useAuth(); 
  // console.log('User from context:', user?.teacher_id); // Debugging line to check user data

  useEffect(() => {
    const fetchStudentReports = async () => {
      if (!isAuthenticated || !user?.subjects) {
        setLoading(false); // Ensure loading stops even if data is not fetched
        return;
      }

      try {
        setLoading(true);
        setError('');
        const token = sessionStorage.getItem('token'); 

        const res = await axios.get(
          `http://localhost:5000/api/v1/reports/student-subjects`, 
          {
            params: { subject: user.subjects }, 
            headers: {
              'Authorization': `Bearer ${token}` 
            }
          }
        );
        
        setStudentReports(res.data);
      } catch (err) {
        console.error('Error fetching student reports:', err);
        setError(err.response?.data?.message || 'Failed to load student reports'); 
      } finally {
        setLoading(false);
      }
    };

    fetchStudentReports();
  }, [isAuthenticated, user]); 

  const [isDownloading, setIsDownloading] = useState(false); // State for download button
  // No changes to isChatOpen state, as per the problem scope

  const handleDownload = async () => {
    if (!user?.subjects || isDownloading) return; 

    setIsDownloading(true); // Set downloading state
    setError('');
    
    try {
      const token = sessionStorage.getItem('token'); 
      const subject = user.subjects; 

      const res = await axios.get( 
        `http://localhost:5000/api/v1/reports/download/student-subjects`, 
        {
          params: { subject: subject },
          headers: {
            'Authorization': `Bearer ${token}` 
          },
          responseType: 'blob', 
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `student_subjects_${subject.replace(/ /g, '_').replace(/[^a-zA-Z0-9_.]/g, '')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('File downloaded successfully!');
    } catch (err) {
      console.error('Error downloading Excel file:', err);
      setError(err.response?.data?.message || 'Error downloading file. Please try again.');
    } finally {
      setIsDownloading(false); // Reset downloading state
    }
  };

  // Pagination for Student Reports table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // State for items per page

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on items per page change
  }, [itemsPerPage]);

  const totalReports = studentReports?.length || 0;
  const totalPages = Math.ceil(totalReports / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStudentReports = studentReports?.slice(indexOfFirstItem, indexOfLastItem) || [];

  // ---------- UI ----------
  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      {/* --- top section: teacher details --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* -------- block 1: teacher details -------- */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-4 pb-3 border-b border-slate-200">TEACHER DETAILS</h4>
          <div className="flex items-center gap-4">
            <img 
              src={user?.photo_url || placeholder} 
              alt="Teacher" 
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-100 flex-shrink-0"
            />
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 mb-1">
                {user?.name || 'Not available'} 
              </h3>
              <p className="text-sm text-slate-600 mb-2">
                {user?.teacher_id || 'Not available'} 
              </p>
              <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* -------- block 2: department and subject -------- */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-2 border-b border-slate-200">Department</h4>
            <p className="text-md font-medium text-slate-800 mb-3">{user?.department || 'Not available'}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-2 border-b border-slate-200">Handling Subject</h4>
            <p className="text-md font-medium text-slate-800">{user?.subjects || 'Not available'}</p>
          </div>
        </div>

        {/* -------- block 3: question bank -------- */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h4 className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-4 pb-3 border-b border-slate-200">QUESTION BANK</h4>
          <div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Quickly add new assessment questions or manage your existing question bank.
            </p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
              <a href="/add-question" className="text-white no-underline">Add Questions</a>
            </button>
          </div>
        </div>
      </div>

      {/* --- student reports section --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200">
          <div>
            <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Student Reports</h3>
            <p className="text-sm text-slate-500 mt-1">Overview of student performance in your subject.</p>
          </div>
          <button 
            onClick={handleDownload}
            disabled={isDownloading || loading} // Use isDownloading state for button disable
            className="mt-4 sm:mt-0 w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          // Placeholder for loading state (assuming Skeleton is available)
          <div className="p-5">
            {/* <Skeleton count={5} height={50} className="my-2" /> */}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Roll No</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">Total Assessments</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">Completed Assessments</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">Total Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentStudentReports.length > 0 ? (
                  currentStudentReports.map((report, idx) =>
                    report.subjects.map((subject, sidx) => (
                      <tr 
                        key={`${report.studentId}-${subject.subjectName}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-slate-500">{indexOfFirstItem + idx + 1}</td>
                        <td className="px-6 py-4 font-medium text-slate-800">{report.name}</td>
                        <td className="px-6 py-4 text-slate-600">{report.studentId}</td>
                        <td className="px-6 py-4 text-slate-600">{report.year}</td>
                        <td className="px-6 py-4 text-slate-600">{report.department}</td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-blue-600">{subject.subjectName}</span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600">{subject.totalAssessments}</td>
                        <td className="px-6 py-4 text-center font-semibold text-green-600">{subject.presentAssessments}</td>
                        <td className="px-6 py-4 text-center font-medium text-blue-600">{subject.totalMarks}</td>
                      </tr>
                    ))
                  )
                ) : (
                  <tr>
                    <td colSpan="9" className="py-8 px-4 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        {/* <svg className="w-12 h-12 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg> */}
                        No reports found for the given department.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination controls */}
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
      {!isChatOpen && (
        <button 
            className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all duration-300 hover:scale-110"
            onClick={() => setIsChatOpen(true)}
            title="Open Teaching Assistant"
        >
            <MessageCircleMore size={28} />
        </button>
      )}

      {isChatOpen && <TeacherChatbot closeChat={() => setIsChatOpen(false)} />}
    </div>
  );
}

export default Teacher_Dashboard;