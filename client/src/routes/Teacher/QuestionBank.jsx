import axios from 'axios';
import { ChevronLeft, ChevronRight, Download, Search, Trash2, X } from 'lucide-react'; // Icons for navigation, search, download, delete
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader'; // Global loading spinner
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * QuestionBank component allows teachers to view, filter, and manage
 * assessments they have created. It includes features for searching,
 * filtering by subject and year, and downloading/deleting assessments.
 *
 * @returns {JSX.Element} The question bank management UI.
 */
const QuestionBank = () => {
  // State to store the list of assessments created by the teacher.
  const [assessments, setAssessments] = useState([]);
  // State to manage overall loading status.
  const [isLoading, setIsLoading] = useState(true);
  // State to store any error messages during data fetching.
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Hook for programmatic navigation.

  // Filter and Pagination states.
  const [searchTerm, setSearchTerm] = useState(''); // Search term for assessment name.
  const [filterSubject, setFilterSubject] = useState(''); // Filter by subject name.
  const [filterYear, setFilterYear] = useState(''); // Filter by academic year.
  const [currentPage, setCurrentPage] = useState(1); // Current page number.
  const [itemsPerPage, setItemsPerPage] = useState(10); // Number of items to display per page.

  /**
   * Effect hook to fetch assessments created by the authenticated teacher on component mount.
   * Redirects to login if no authentication token is found.
   */
  useEffect(() => {
    const fetchAssessments = async () => {
      setIsLoading(true); // Start loading state.
      const token = sessionStorage.getItem("token");
      if (!token) {
        navigate('/login'); // Redirect if not authenticated.
        return;
      }
      try {
        // Fetch assessments belonging to the current teacher.
        const response = await axios.get(`${API_BASE_URL}/assessments/my-assessments`, {
          headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
        });
        setAssessments(response.data); // Set fetched assessments.
      } catch (err) {
        // Set error message from API response or a generic one.
        setError(err.response?.data?.message || 'Failed to fetch your assessments.');
      } finally {
        setIsLoading(false); // End loading state.
      }
    };
    fetchAssessments();
  }, [navigate]); // Dependency: navigate function.

  /**
   * Memoized filtered list of assessments based on search term, subject, and year filters.
   * Re-calculates only when dependencies change.
   */
  const filteredAssessments = useMemo(() => {
    return assessments.filter(assessment =>
      // Filter by assessment name (case-insensitive search).
      assessment.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      // Filter by subject name (empty filter matches all).
      (filterSubject === '' || assessment.subjectName === filterSubject) &&
      // Filter by year (convert year to string for comparison, empty filter matches all).
      (filterYear === '' || String(assessment.year) === filterYear)
    );
  }, [assessments, searchTerm, filterSubject, filterYear]); // Dependencies for memoization.

  /**
   * Memoized list of unique subject names from all assessments, used for the subject filter dropdown.
   */
  const uniqueSubjects = useMemo(() => [...new Set(assessments.map(a => a.subjectName))], [assessments]);
  /**
   * Memoized list of unique academic years from all assessments, used for the year filter dropdown.
   */
  const uniqueYears = useMemo(() => [...new Set(assessments.map(a => String(a.year)))], [assessments]);

  /**
   * Memoized list of items to display on the current page based on pagination.
   */
  const currentItems = useMemo(() => {
    const firstItemIndex = (currentPage - 1) * itemsPerPage;
    const lastItemIndex = firstItemIndex + itemsPerPage;
    return filteredAssessments.slice(firstItemIndex, lastItemIndex);
  }, [currentPage, itemsPerPage, filteredAssessments]); // Dependencies for memoization.

  // Calculate total number of pages for pagination.
  const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);

  /**
   * Clears all search and filter criteria and resets pagination to the first page.
   */
  const clearFilters = () => {
    setSearchTerm('');
    setFilterSubject('');
    setFilterYear('');
    setCurrentPage(1);
  };

  /**
   * Formats a date string and time string into a single user-friendly date and time string.
   * @param {string} dateStr - The date string.
   * @param {string} timeStr - The time string (e.g., HH:MM).
   * @returns {string} Formatted date and time string (e.g., "DD/MM/YYYY HH:MM").
   */
  const formatDate = (dateStr, timeStr) => `${new Date(dateStr).toLocaleDateString('en-GB')} ${timeStr}`;

  // Display global loading spinner.
  if (isLoading) return <Loader />;
  // Display error message if data fetching failed.
  if (error) return <div className="p-6 text-center text-red-600 dark:text-red-400">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto min-h-screen space-y-6">

      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
        {/* Header and Filter Section */}
        <h1 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700 flex-shrink-0">QUESTION BANK</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end mt-4 pb-6">
          {/* Search by Name Input */}
          <div className="relative">
            <label htmlFor="search" className="text-xs font-semibold text-slate-500 dark:text-gray-400">Search by Name</label>
            <Search className="absolute left-3 bottom-2.5 w-5 h-5 text-slate-400 dark:text-gray-500 pointer-events-none" />
            <input id="search" type="text" placeholder="e.g., Midterm Exam" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full mt-1 pl-10 pr-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"/>
          </div>
          {/* Filter by Subject Dropdown */}
          <div>
            <label htmlFor="subject" className="text-xs font-semibold text-slate-500 dark:text-gray-400">Filter by Subject</label>
            <select id="subject" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
              <option value="">All Subjects</option>
              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Filter by Year Dropdown */}
          <div>
            <label htmlFor="year" className="text-xs font-semibold text-slate-500 dark:text-gray-400">Filter by Year</label>
            <select id="year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
              <option value="">All Years</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {/* Clear Filters Button */}
          <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors text-sm">
            <X size={16}/> Clear Filters
          </button>
        </div>
        {/* Assessments Table */}
        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Assessment Name</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Opens</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Closes</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
              {currentItems.length > 0 ? (
                currentItems.map((assessment) => (
                  <tr key={assessment._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{assessment.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{assessment.subjectName}</td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-gray-300">{assessment.year}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300 whitespace-nowrap">{formatDate(assessment.openDate, assessment.openTime)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300 whitespace-nowrap">{formatDate(assessment.closeDate, assessment.closeTime)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <a href={assessment.question} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 dark:text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900 dark:hover:text-blue-300 rounded-md" title="Download Material" aria-label={`Download questions for ${assessment.name}`}>
                          <Download size={16} />
                        </a>
                        <button className="p-2 text-slate-500 dark:text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300 rounded-md" title="Delete Assessment" aria-label={`Delete ${assessment.name}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500 dark:text-gray-400">
                    No assessments match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
              <span>Show</span>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
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
    </div>
  );
};

export default QuestionBank;
