import axios from 'axios'; // Import axios for API requests
import { ChevronLeft, ChevronRight, MessageCircleMore } from 'lucide-react'; // Icons from lucide-react
import { useEffect, useState } from 'react';
import 'react-loading-skeleton/dist/skeleton.css'; // Styling for react-loading-skeleton (if used)
import placeholder from '../../assets/placeholder.png'; // Placeholder image for user avatar
import { useAuth } from '../../contexts/AuthContext'; // Authentication context hook
import TeacherChatbot from '../../components/Teacher_Chatbot'; // Teacher-specific chatbot component
// Assuming Loader is imported from components directory if needed for full page load state
// import Loader from '../../components/Loader';
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * TeacherDashboard component provides an overview for teachers, displaying
 * their details, assigned subjects, and a summary of student reports.
 * It also includes options to add questions and download student data.
 *
 * @returns {JSX.Element} The Teacher Dashboard UI.
 */
const TeacherDashboard = () => {
  // State to manage overall loading status for student reports.
  const [loading, setLoading] = useState(false);
  // State to store the fetched student reports.
  const [studentReports, setStudentReports] = useState([]);
  // State to store any error messages during data fetching.
  const [error, setError] = useState('');
  // State to control the visibility of the Teacher Chatbot.
  const [isChatOpen, setIsChatOpen] = useState(false);
  // State to manage the loading status of the Excel download.
  const [isDownloading, setIsDownloading] = useState(false);

  const { user, isAuthenticated } = useAuth(); // Get authenticated user details from AuthContext.

  /**
   * Effect hook to fetch student reports for the teacher's assigned subjects on component mount.
   * Runs only if the user is authenticated and has subjects assigned.
   */
  useEffect(() => {
    const fetchStudentReports = async () => {
      // Do not fetch if not authenticated or no subjects are assigned to the teacher.
      if (!isAuthenticated || !user?.subjects) {
        setLoading(false); // Ensure loading stops if conditions aren't met.
        return;
      }

      try {
        setLoading(true); // Start loading state.
        setError(''); // Clear any previous errors.
        const token = sessionStorage.getItem('token'); // Retrieve authentication token.

        // Fetch student reports related to the teacher's subjects.
        const res = await axios.get(
          `${API_BASE_URL}/reports/student-subjects`,
          {
            params: { subject: user.subjects }, // Pass subjects as a query parameter.
            headers: {
              'Authorization': `Bearer ${token}` // Include authorization header.
            }
          }
        );
        setStudentReports(res.data); // Set fetched student reports.
      } catch (err) {
        console.error('Error fetching student reports:', err);
        setError(err.response?.data?.message || 'Failed to load student reports'); // Set error message.
      } finally {
        setLoading(false); // End loading state.
      }
    };

    fetchStudentReports();
  }, [isAuthenticated, user]); // Dependencies: isAuthenticated, user (to re-fetch if user data changes).

  /**
   * Handles downloading student reports as an Excel file.
   * Prevents multiple downloads if one is already in progress.
   */
  const handleDownload = async () => {
    if (!user?.subjects || isDownloading) return; // Prevent download if no subjects or already downloading.

    setIsDownloading(true); // Set downloading state to true.
    setError(''); // Clear previous errors.

    try {
      const token = sessionStorage.getItem('token');
      const subject = user.subjects;

      // Send GET request to download student subjects report.
      const res = await axios.get(
        `${API_BASE_URL}/reports/download/student-subjects`,
        {
          params: { subject: subject },
          headers: {
            'Authorization': `Bearer ${token}`
          },
          responseType: 'blob', // Important: response type must be 'blob' for file downloads.
        }
      );

      // Create a URL for the blob and trigger a file download.
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      // Sanitize subject name for filename.
      link.setAttribute('download', `student_subjects_${subject.replace(/ /g, '_').replace(/[^a-zA-Z0-9_.]/g, '')}.xlsx`);
      document.body.appendChild(link); // Temporarily append to document.
      link.click(); // Programmatically click to trigger download.
      document.body.removeChild(link); // Remove the link.
      console.log('File downloaded successfully!');
    } catch (err) {
      console.error('Error downloading Excel file:', err);
      setError(err.response?.data?.message || 'Error downloading file. Please try again.');
    } finally {
      setIsDownloading(false); // Reset downloading state.
    }
  };

  // Pagination states for the Student Reports table.
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Number of items to display per page.

  /**
   * Effect hook to reset pagination to page 1 whenever `itemsPerPage` changes.
   */
  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on items per page change.
  }, [itemsPerPage]);

  // Pagination calculations.
  const totalReports = studentReports?.length || 0;
  const totalPages = Math.ceil(totalReports / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStudentReports = studentReports?.slice(indexOfFirstItem, indexOfLastItem) || [];

  // UI rendering begins here.
  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      {/* --- Top Section: Teacher Details and Quick Actions --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* -------- Block 1: Teacher Details -------- */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-gray-700">
          <h4 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-4 pb-3 border-b border-slate-200 dark:border-gray-700">TEACHER DETAILS</h4>
          <div className="flex items-center gap-4">
            <img
              src={user?.photo_url || placeholder}
              alt="Teacher"
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-100 dark:border-gray-700 flex-shrink-0"
            />
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
                {user?.name || 'Not available'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-gray-300 mb-2">
                {user?.teacher_id || 'Not available'}
              </p>
              <span className="inline-block bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* -------- Block 2: Department and Subject -------- */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-gray-700">
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-2 border-b border-slate-200 dark:border-gray-700">Department</h4>
            <p className="text-md font-medium text-slate-800 dark:text-white mb-3">{user?.department || 'Not available'}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-2 border-b border-slate-200 dark:border-gray-700">Handling Subject</h4>
            <p className="text-md font-medium text-slate-800 dark:text-white">{user?.subjects || 'Not available'}</p>
          </div>
        </div>

        {/* -------- Block 3: Question Bank Quick Access -------- */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-slate-200 dark:border-gray-700">
          <h4 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-4 pb-3 border-b border-slate-200 dark:border-gray-700">QUESTION BANK</h4>
          <div>
            <p className="text-sm text-slate-600 dark:text-gray-300 mb-4 leading-relaxed">
              Quickly add new assessment questions or manage your existing question bank.
            </p>
            <a href="/add-question" className="text-white no-underline">
              <button className="w-full bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                Add Questions
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* --- Student Reports Section --- */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-gray-700">
          <div>
            <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Student Reports</h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Overview of student performance in your subject.</p>
          </div>
          {/* Download Excel Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading || loading} // Disable if downloading or initial reports are loading
            className="mt-4 sm:mt-0 w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors disabled:bg-blue-300 dark:disabled:bg-gray-600"
          >
            {isDownloading ? (
              <>
                {/* Inline spinner for downloading state */}
                <svg className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></svg>
                Downloading...
              </>
            ) : (
              <>
                {/* Download icon */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel
              </>
            )}
          </button>
        </div>

        {/* Error message display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading state for the table (can use Skeleton here if integrated) */}
        {loading ? (
          <div className="p-5">
            {/* Replace with Skeleton component if available */}
            <p className="text-slate-500 dark:text-gray-400">Loading student reports...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Roll No</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Total Assessments</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Completed Assessments</th>
                  <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Total Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                {currentStudentReports.length > 0 ? (
                  currentStudentReports.map((report, idx) =>
                    // Map through subjects within each report to show one row per subject per student
                    report.subjects.map((subject, sidx) => (
                      <tr
                        key={`${report.studentId}-${subject.subjectName}`} // Unique key for each row
                        className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-slate-500 dark:text-gray-400">{indexOfFirstItem + idx + 1}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{report.name}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{report.studentId}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{report.year}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{report.department}</td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{subject.subjectName}</span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600 dark:text-gray-300">{subject.totalAssessments}</td>
                        <td className="px-6 py-4 text-center font-semibold text-green-600 dark:text-green-400">{subject.presentAssessments}</td>
                        <td className="px-6 py-4 text-center font-medium text-blue-600 dark:text-blue-400">{subject.totalMarks}</td>
                      </tr>
                    ))
                  )
                ) : (
                  <tr>
                    <td colSpan="9" className="py-8 px-4 text-center text-slate-500 dark:text-gray-400">
                      <div className="flex flex-col items-center">
                        {/* Placeholder icon can be added here if desired */}
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
      {/* Floating Chatbot Button */}
      {!isChatOpen && (
        <button
            className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-all duration-300 hover:scale-110"
            onClick={() => setIsChatOpen(true)}
            title="Open Teaching Assistant"
            aria-label="Open teaching assistant chatbot"
        >
            <MessageCircleMore size={28} />
        </button>
      )}

      {/* Teacher Chatbot Component */}
      {isChatOpen && <TeacherChatbot closeChat={() => setIsChatOpen(false)} />}
    </div>
  );
}

export default TeacherDashboard;
