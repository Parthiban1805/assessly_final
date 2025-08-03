import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react'; // Icons for alert, graduation cap, and pagination
import Loader from "../../components/Loader"; // Global loading spinner
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * Grades component displays a student's average grades for each module.
 * It includes an alert if grade visibility is disabled by the administrator and features pagination.
 *
 * @returns {JSX.Element} The student's grades overview UI.
 */
const Grades = () => {
    // State to hold all fetched page data, including grades and display settings.
    const [pageData, setPageData] = useState(null);
    // State to manage overall loading status.
    const [loading, setLoading] = useState(true);
    // State to store any error messages during data fetching.
    const [error, setError] = useState(null);
    const navigate = useNavigate(); // Hook for programmatic navigation.

    // Pagination states.
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5); // Number of grade entries to display per page.

    /**
     * Effect hook to fetch grades page data on component mount.
     * Handles authentication errors by redirecting to login.
     */
    useEffect(() => {
        const fetchGradesPageData = async () => {
            setLoading(true); // Start loading state.
            try {
                const token = sessionStorage.getItem("token");
                // Fetch grades page data from the API.
                const response = await axios.get(`${API_BASE_URL}/grades/page-data`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
                });
                setPageData(response.data); // Set fetched data.
                setCurrentPage(1); // Reset pagination to the first page.
            } catch (err) {
                console.error("Error fetching grades page data:", err);
                const errorMessage = err.response?.data?.message || "Failed to load grades.";
                setError(errorMessage); // Set error message.
                // If authentication error, redirect to login.
                if (err.response?.status === 401 || err.response?.status === 403) {
                    navigate('/login');
                }
            } finally {
                setLoading(false); // End loading state.
            }
        };

        fetchGradesPageData();
    }, [navigate]); // Dependency: navigate function.

    /**
     * Effect hook to reset pagination to page 1 whenever `itemsPerPage` changes.
     */
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    /**
     * Renders the grade percentage or "Hidden" if display is not allowed.
     * @param {number|null} grade - The numerical grade percentage.
     * @returns {string} Formatted grade or "Hidden".
     */
    const renderGrade = (grade) => {
        if (!pageData?.settings?.displayAllowed) {
            return "Hidden";
        }
        return grade != null ? `${parseFloat(grade).toFixed(1)}%` : "N/A";
    };

    // Display global loading spinner.
    if (loading) {
        return <Loader />;
    }

    // Display error message if data fetching failed.
    if (error) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Something went wrong</h3>
                <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
            </div>
        );
    }

    const { grades, settings } = pageData; // Destructure grades and settings from pageData.
    const displayAllowed = settings.displayAllowed; // Check if grades are allowed to be displayed.

    // Pagination logic: calculate total pages and current grades to display.
    const totalGrades = grades?.length || 0;
    const totalPages = Math.ceil(totalGrades / itemsPerPage);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    const currentGrades = grades?.slice(indexOfFirstItem, indexOfLastItem) || [];

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div>
                <h1 className="text-2xl font-medium text-slate-800 dark:text-white">My Grades</h1>
                <p className="text-slate-500 dark:text-gray-400 mt-1">An overview of your average marks for each module.</p>
            </div>

            {/* Main Content Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="p-5 border-b border-slate-200 dark:border-gray-700">
                    <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider flex-shrink-0">Module Overview</h3>
                </div>

                {/* Alert for disabled grade display */}
                {!displayAllowed && (
                    <div className="m-5 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-400 rounded-md flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold">Grade Display Disabled</h4>
                            <p className="text-sm">Grade and mark visibility is currently turned off by the administrator.</p>
                        </div>
                    </div>
                )}

                {/* Grades Table */}
                <div className="divide-y divide-slate-200 dark:divide-gray-700">
                    {/* Table Header Row */}
                    <div className="flex justify-between items-center px-5 py-3 bg-slate-50 dark:bg-gray-700 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                        <span>Module Name</span>
                        <span>Average Grade</span>
                    </div>

                    {currentGrades.length > 0 ? (
                        currentGrades.map((item, index) => (
                            <div key={index} className="flex justify-between items-center px-5 py-4 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                        <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                                    </div>
                                    <span className="font-medium text-slate-800 dark:text-white text-sm">{item.subject.name}</span>
                                </div>
                                <div
                                    className={`font-medium text-sm px-2 py-0.5 rounded-full
                                        ${!displayAllowed || item.subject.averageMarks == null ? 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400' :
                                        item.subject.averageMarks >= 75 ? 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700' :
                                        item.subject.averageMarks >= 50 ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700' :
                                        'bg-red-100 text-red-500 border border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700'}`}
                                >
                                    {renderGrade(item.subject.averageMarks)}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center py-10 text-slate-500 dark:text-gray-400">No grades are available at this time.</p>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
                      <span>Show</span>
                      <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
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

export default Grades;
