import axios from 'axios';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, FileSearch } from 'lucide-react'; // Icons for calendar, dropdown, pagination, and empty state
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'; // Import useCallback
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader'; // Global loading spinner
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * Custom hook to detect clicks outside a specified DOM element.
 * Useful for closing dropdowns or modals when a user clicks outside of them.
 * @param {React.RefObject} ref - A ref object attached to the element to monitor.
 * @param {function} callback - The function to call when an outside click is detected.
 */
const useOutsideClick = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the ref exists and the click is outside the ref's element.
      if (ref.current && !ref.current.contains(event.target)) {
        callback(); // Execute the callback.
      }
    };
    document.addEventListener('mousedown', handleClickOutside); // Attach event listener.
    // Cleanup function: remove the event listener on component unmount.
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback]); // Dependencies: ref and callback.
};

/**
 * DateWiseReport component allows teachers to view student assessment reports
 * grouped by date. It supports filtering by date range (all, week, month)
 * and includes pagination for detailed student marks.
 *
 * @returns {JSX.Element} The date-wise assessment report UI.
 */
const DateWiseReport = () => {
  // State to store student reports data, grouped by date.
  const [studentReports, setStudentReports] = useState([]);
  // State to manage overall loading status.
  const [loading, setLoading] = useState(true);
  // State to store any error messages during data fetching.
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Hook for programmatic navigation.

  // UI States for date selection dropdown and filter.
  const [activeDate, setActiveDate] = useState(null); // The currently selected date for detailed view.
  const [isDropdownOpen, setDropdownOpen] = useState(false); // Controls visibility of date selection dropdown.
  const [filter, setFilter] = useState('all'); // Filter for date ranges: 'all', 'week', 'month'.

  // Pagination states for the detailed student marks table.
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Number of entries per page.

  const dropdownRef = useRef(null); // Ref for the date selection dropdown for outside click detection.
  useOutsideClick(dropdownRef, () => setDropdownOpen(false)); // Use custom hook to close dropdown on outside click.

  /**
   * Effect hook to fetch date-wise report data on component mount.
   * Redirects to login if no authentication token is found.
   */
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true); // Start loading state.
      try {
        const token = sessionStorage.getItem("token");
        if (!token) {
          navigate('/login'); // Redirect if not authenticated.
          return;
        }
        // Fetch date-wise report data from the API.
        const response = await axios.get(`${API_BASE_URL}/reports/teacher-date-wise`, {
          headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
        });
        setStudentReports(response.data); // Set fetched data.
      } catch (err) {
        // Set error message from API response or a generic one.
        setError(err.response?.data?.message || 'Failed to fetch report data.');
      } finally {
        setLoading(false); // End loading state.
      }
    };
    fetchReportData();
  }, [navigate]); // Dependency: navigate function.

  /**
   * Effect hook to reset pagination to page 1 whenever the selected date (`activeDate`)
   * or the number of items per page (`itemsPerPage`) changes.
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [activeDate, itemsPerPage]);

  /**
   * Memoized processing of raw student reports into a structured format grouped by date.
   * Calculates assessment and student counts per date.
   * Sorts dates in descending order (most recent first).
   * Uses useMemo for performance optimization.
   */
  const processedDates = useMemo(() => {
    if (!studentReports || studentReports.length === 0) return [];
    const grouped = {};
    studentReports.forEach(assessment => {
      const openDate = assessment.openDate;
      if (!grouped[openDate]) {
        grouped[openDate] = { date: openDate, assessments: [], studentIds: new Set() };
      }
      grouped[openDate].assessments.push(assessment);
      assessment.studentMarks.forEach(mark => grouped[openDate].studentIds.add(mark.studentId));
    });
    return Object.values(grouped).map(group => ({
      ...group,
      assessmentCount: group.assessments.length,
      studentCount: group.studentIds.size,
    })).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending.
  }, [studentReports]); // Dependency: studentReports data.

  /**
   * Memoized filtering of `processedDates` based on the selected `filter` (all, week, month).
   * Uses useMemo for performance optimization.
   */
  const filteredDates = useMemo(() => {
    if (filter === 'all') return processedDates;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Normalize today to start of day.
    return processedDates.filter(d => {
      const itemDate = new Date(d.date);
      if (filter === 'week') {
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7); // Calculate date 7 days ago.
        return itemDate >= oneWeekAgo && itemDate <= today; // Filter for last 7 days including today.
      }
      if (filter === 'month') {
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // Get first day of current month.
        return itemDate >= firstDayOfMonth && itemDate <= today; // Filter for current month.
      }
      return true;
    });
  }, [processedDates, filter]); // Dependencies: processedDates, filter.

  /**
   * Memoized data for the currently selected date, if any.
   * Uses useMemo for performance optimization.
   */
  const selectedDateData = useMemo(() => {
    if (!activeDate) return null;
    return processedDates.find(d => d.date === activeDate);
  }, [activeDate, processedDates]); // Dependencies: activeDate, processedDates.

  /**
   * Memoized flattening of selected date's assessment data into rows for the detailed table.
   * Each row represents a student's mark for a specific assessment on the selected date.
   * Uses useMemo for performance optimization.
   */
  const displayRows = useMemo(() => {
    if (!selectedDateData) return [];
    return selectedDateData.assessments.flatMap(assessment =>
        assessment.studentMarks.map(markData => ({
            key: `${assessment._id}-${markData.studentId}`, // Unique key for each row.
            studentName: markData.studentName || 'N/A',
            studentId: markData.studentId,
            assessmentName: assessment.name,
            marks: markData.marks,
            totalMarks: assessment.totalMarks || 100, // Default total marks to 100 if not specified.
        }))
    );
  }, [selectedDateData]); // Dependency: selectedDateData.

  // Pagination calculations for the detailed table (`displayRows`).
  const totalItems = displayRows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = displayRows.slice(indexOfFirstItem, indexOfLastItem);

  /**
   * Handles selection of a date from the dropdown.
   * Sets the active date and closes the dropdown.
   * @param {string} date - The date string selected.
   */
  const handleDateSelect = (date) => {
    setActiveDate(date);
    setDropdownOpen(false);
  };

  /**
   * Formats a date string for display in the UI (e.g., "November 27, 2023").
   * @param {string} dateString - The date string.
   * @returns {string} Formatted date string.
   */
  const formatDateForDisplay = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Display global loading spinner.
  if (loading) return <Loader />;
  // Display error message if data fetching failed.
  if (error) return <div className="p-6 text-center text-red-600 dark:text-red-400">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto min-h-screen space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm px-6 py-2">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 dark:border-gray-700">
            <div>
                <h1 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider flex-shrink-0">Date-Wise Assessment Report</h1>
                <p className="text-slate-500 dark:text-gray-400 mt-1">Select a date to view detailed student performance.</p>
            </div>
            {/* Date Selection Dropdown */}
            <div className="relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors" aria-expanded={isDropdownOpen} aria-haspopup="true">
                <Calendar size={18} />
                <span>{activeDate ? formatDateForDisplay(activeDate) : 'Select a Date'}</span>
                <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-full sm:w-96 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-lg z-10">
                <div className="p-3 border-b border-slate-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-600 dark:text-gray-300">Filter:</span>
                    {/* Filter buttons for date ranges */}
                    <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-md ${filter === 'all' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'hover:bg-slate-100 dark:hover:bg-gray-700/50 text-slate-700 dark:text-gray-200'}`}>All</button>
                    <button onClick={() => setFilter('week')} className={`px-3 py-1 rounded-md ${filter === 'week' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'hover:bg-slate-100 dark:hover:bg-gray-700/50 text-slate-700 dark:text-gray-200'}`}>This Week</button>
                    <button onClick={() => setFilter('month')} className={`px-3 py-1 rounded-md ${filter === 'month' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'hover:bg-slate-100 dark:hover:bg-gray-700/50 text-slate-700 dark:text-gray-200'}`}>This Month</button>
                    </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                    {/* List of dates available based on filter */}
                    {filteredDates.length > 0 ? filteredDates.map(item => (
                    <div key={item.date} onClick={() => handleDateSelect(item.date)} className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700 last:border-b-0 ${activeDate === item.date ? 'bg-blue-50 dark:bg-blue-900' : ''}`}>
                        <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{formatDateForDisplay(item.date)}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">{new Date(item.date).toDateString()}</p>
                        </div>
                        <div className="text-right">
                        <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{item.assessmentCount} Assessment{item.assessmentCount > 1 && 's'}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">{item.studentCount} Student{item.studentCount > 1 && 's'}</p>
                        </div>
                    </div>
                    )) : <p className="p-6 text-center text-slate-500 dark:text-gray-400">No assessments in this period.</p>}
                </div>
                </div>
            )}
            </div>
        </div>

        {/* Report Table and Pagination */}
        {activeDate && selectedDateData ? (
            <>
                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm mb-4">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">S.No</th>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Student Name</th>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Roll No</th>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Assessment</th>
                                <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Marks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                            {currentItems.map((row, index) => (
                                <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 text-slate-500 dark:text-gray-400">{indexOfFirstItem + index + 1}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{row.studentName}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{row.studentId}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{row.assessmentName}</td>
                                    <td className="px-6 py-4 text-center font-bold">
                                        <span className={`px-3 py-1 rounded-full text-xs text-slate-800 dark:text-white`}>
                                            {row.marks}
                                        </span>
                                    </td>
                                </tr>
                            ))}
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
            </>
        ) : (
            // Empty state when no date is selected or no data for filtered dates.
            <div className="flex flex-col items-center justify-center text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm mb-4">
                <FileSearch className="w-16 h-16 text-slate-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 dark:text-gray-200">No Date Selected</h3>
                <p className="text-slate-500 dark:text-gray-400 mt-2 max-w-sm">Please select a date from the dropdown above to view the detailed report.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DateWiseReport;
