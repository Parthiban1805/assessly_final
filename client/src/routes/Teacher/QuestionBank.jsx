import axios from 'axios';
import { ChevronLeft, ChevronRight, Download, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';

const QuestionBank = () => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Filter and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchAssessments = async () => {
      setIsLoading(true);
      const token = sessionStorage.getItem("token");
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const response = await axios.get('http://localhost:5000/api/v1/assessments/my-assessments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setAssessments(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch your assessments.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssessments();
  }, [navigate]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter(assessment => 
      assessment.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterSubject === '' || assessment.subjectName === filterSubject) &&
      (filterYear === '' || String(assessment.year) === filterYear)
    );
  }, [assessments, searchTerm, filterSubject, filterYear]);

  const uniqueSubjects = useMemo(() => [...new Set(assessments.map(a => a.subjectName))], [assessments]);
  const uniqueYears = useMemo(() => [...new Set(assessments.map(a => String(a.year)))], [assessments]);

  const currentItems = useMemo(() => {
    const firstItem = (currentPage - 1) * itemsPerPage;
    return filteredAssessments.slice(firstItem, firstItem + itemsPerPage);
  }, [currentPage, itemsPerPage, filteredAssessments]);

  const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterSubject('');
    setFilterYear('');
    setCurrentPage(1);
  };
  
  const formatDate = (dateStr, timeStr) => `${new Date(dateStr).toLocaleDateString('en-GB')} ${timeStr}`;

  if (isLoading) return <Loader />;
  if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto min-h-screen space-y-6">

      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 flex-shrink-0">QUESTION BANK</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end mt-4 pb-6">
          <div className="relative">
            <label htmlFor="search" className="text-xs font-semibold text-slate-500">Search by Name</label>
            <Search className="absolute left-3 bottom-2.5 w-5 h-5 text-slate-400 pointer-events-none" />
            <input id="search" type="text" placeholder="e.g., Midterm Exam" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full mt-1 pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
          </div>
          <div>
            <label htmlFor="subject" className="text-xs font-semibold text-slate-500">Filter by Subject</label>
            <select id="subject" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">All Subjects</option>
              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="year" className="text-xs font-semibold text-slate-500">Filter by Year</label>
            <select id="year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">All Years</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 transition-colors text-sm">
            <X size={16}/> Clear Filters
          </button>
        </div>
        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Assessment Name</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Opens</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Closes</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentItems.length > 0 ? (
                currentItems.map((assessment) => (
                  <tr key={assessment._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{assessment.name}</td>
                    <td className="px-6 py-4 text-slate-600">{assessment.subjectName}</td>
                    <td className="px-6 py-4 text-center text-slate-600">{assessment.year}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{formatDate(assessment.openDate, assessment.openTime)}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{formatDate(assessment.closeDate, assessment.closeTime)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <a href={assessment.question} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 hover:bg-blue-100 hover:text-blue-600 rounded-md" title="Download Material">
                          <Download size={16} />
                        </a>
                        <button className="p-2 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-md" title="Delete Assessment">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500">
                    No assessments match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Show</span>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 rounded-md">
                <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
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
    </div>
  );
};

export default QuestionBank;