import axios from 'axios';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, FileSearch } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';

// Custom hook to handle clicks outside a specific element
const useOutsideClick = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback]);
};

const DateWiseReport = () => {
  const [studentReports, setStudentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // UI State
  const [activeDate, setActiveDate] = useState(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'week', 'month'
  
  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const dropdownRef = useRef(null);
  useOutsideClick(dropdownRef, () => setDropdownOpen(false));

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem("token");
        if (!token) { navigate('/login'); return; }

        const response = await axios.get('http://localhost:5000/api/v1/reports/teacher-date-wise', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setStudentReports(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch report data.');
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [navigate]);
  
  // Reset pagination when the selected date or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeDate, itemsPerPage]);

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
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [studentReports]);

  const filteredDates = useMemo(() => {
    if (filter === 'all') return processedDates;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return processedDates.filter(d => {
      const itemDate = new Date(d.date);
      if (filter === 'week') {
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);
        return itemDate >= oneWeekAgo && itemDate <= today;
      }
      if (filter === 'month') {
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return itemDate >= firstDayOfMonth && itemDate <= today;
      }
      return true;
    });
  }, [processedDates, filter]);

  const selectedDateData = useMemo(() => {
    if (!activeDate) return null;
    return processedDates.find(d => d.date === activeDate);
  }, [activeDate, processedDates]);

  // --- Pagination Logic ---
  // Flatten the nested data into a single array of rows for easy pagination
  const displayRows = useMemo(() => {
    if (!selectedDateData) return [];
    return selectedDateData.assessments.flatMap(assessment => 
        assessment.studentMarks.map(markData => ({
            key: `${assessment._id}-${markData.studentId}`,
            studentName: markData.studentName || 'N/A',
            studentId: markData.studentId,
            assessmentName: assessment.name,
            marks: markData.marks,
            totalMarks: assessment.totalMarks || 100,
        }))
    );
  }, [selectedDateData]);

  console.log(selectedDateData);
  
  const totalItems = displayRows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = displayRows.slice(indexOfFirstItem, indexOfLastItem);

  const handleDateSelect = (date) => {
    setActiveDate(date);
    setDropdownOpen(false);
  };

  const formatDateForDisplay = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) return <Loader />;
  if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto min-h-screen space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 border-b border-slate-200">
            <div>
                <h1 className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex-shrink-0">Date-Wise Assessment Report</h1>
                <p className="text-slate-500 mt-1">Select a date to view detailed student performance.</p>
            </div>
            <div className="relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                <Calendar size={18} />
                <span>{activeDate ? formatDateForDisplay(activeDate) : 'Select a Date'}</span>
                <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-full sm:w-96 bg-white rounded-xl border border-slate-200 shadow-lg z-10">
                <div className="p-3 border-b border-slate-200">
                    <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-600">Filter:</span>
                    <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-md ${filter === 'all' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}>All</button>
                    <button onClick={() => setFilter('week')} className={`px-3 py-1 rounded-md ${filter === 'week' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}>This Week</button>
                    <button onClick={() => setFilter('month')} className={`px-3 py-1 rounded-md ${filter === 'month' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}>This Month</button>
                    </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                    {filteredDates.length > 0 ? filteredDates.map(item => (
                    <div key={item.date} onClick={() => handleDateSelect(item.date)} className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0 ${activeDate === item.date ? 'bg-blue-50' : ''}`}>
                        <div>
                        <p className="font-semibold text-slate-800">{formatDateForDisplay(item.date)}</p>
                        <p className="text-xs text-slate-500">{new Date(item.date).toDateString()}</p>
                        </div>
                        <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">{item.assessmentCount} Assessment{item.assessmentCount > 1 && 's'}</p>
                        <p className="text-xs text-slate-500">{item.studentCount} Student{item.studentCount > 1 && 's'}</p>
                        </div>
                    </div>
                    )) : <p className="p-6 text-center text-slate-500">No assessments in this period.</p>}
                </div>
                </div>
            )}
            </div>
        </div>
      
        {/* Report Table and Pagination */}
        {activeDate && selectedDateData ? (
            <>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">S.No</th>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Student Name</th>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Roll No</th>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Assessment</th>
                                <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">Marks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {currentItems.map((row, index) => (
                                <tr key={row.key} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500">{indexOfFirstItem + index + 1}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{row.studentName}</td>
                                    <td className="px-6 py-4 text-slate-600">{row.studentId}</td>
                                    <td className="px-6 py-4 text-slate-600">{row.assessmentName}</td>
                                    <td className="px-6 py-4 text-center font-bold">
                                        <span className={`px-3 py-1 rounded-full text-xs`}>
                                            {row.marks}
                                        </span>
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
            </>
        ) : (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <FileSearch className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700">No Date Selected</h3>
                <p className="text-slate-500 mt-2 max-w-sm">Please select a date from the dropdown above to view the detailed report.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DateWiseReport;