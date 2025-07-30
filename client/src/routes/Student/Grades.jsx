import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import Loader from "../../components/Loader";

const Grades = () => {
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5); // State for items per page

    useEffect(() => {
        const fetchGradesPageData = async () => {
            setLoading(true);
            try {
                const token = sessionStorage.getItem("token");
                const response = await axios.get('http://localhost:5000/api/v1/grades/page-data', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPageData(response.data);
                setCurrentPage(1); 
            } catch (err) {
                console.error("Error fetching grades page data:", err);
                const errorMessage = err.response?.data?.message || "Failed to load grades.";
                setError(errorMessage);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchGradesPageData();
    }, [navigate]);

    // Reset to page 1 if itemsPerPage changes
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    const renderGrade = (grade) => {
        if (!pageData?.settings?.displayAllowed) {
            return "Hidden";
        }
        return grade != null ? `${parseFloat(grade).toFixed(1)}%` : "N/A";
    };

    if (loading) {
        return <Loader />;
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold text-red-700">Something went wrong</h3>
                <p className="text-red-600 mt-2">{error}</p>
            </div>
        );
    }

    const { grades, settings } = pageData;
    const displayAllowed = settings.displayAllowed;

    // --- Pagination Logic ---
    const totalGrades = grades?.length || 0;
    const totalPages = Math.ceil(totalGrades / itemsPerPage);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    const currentGrades = grades?.slice(indexOfFirstItem, indexOfLastItem) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-medium text-slate-800">My Grades</h1>
                <p className="text-slate-500 mt-1">An overview of your average marks for each module.</p>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-200">
                    <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex-shrink-0">Module Overview</h3>
                </div>

                {!displayAllowed && (
                    <div className="m-5 p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 rounded-md flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold">Grade Display Disabled</h4>
                            <p className="text-sm">Grade and mark visibility is currently turned off by the administrator.</p>
                        </div>
                    </div>
                )}
                
                {/* Grades Table */}
                <div className="divide-y divide-slate-200">
                    <div className="flex justify-between items-center px-5 py-3 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span>Module Name</span>
                        <span>Average Grade</span>
                    </div>

                    {currentGrades.length > 0 ? (
                        currentGrades.map((item, index) => (
                            <div key={index} className="flex justify-between items-center px-5 py-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <GraduationCap className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span className="font-medium text-slate-800 text-sm">{item.subject.name}</span>
                                </div>
                                <div 
                                    className={`font-medium text-sm px-2 py-0.5 rounded-full
                                        ${!displayAllowed || item.subject.averageMarks == null ? 'bg-slate-100 text-slate-500' : 
                                        item.subject.averageMarks >= 75 ? 'bg-green-100 text-green-800 border border-green-300' :
                                        item.subject.averageMarks >= 50 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                        'bg-red-100 text-red-500 border border-red-300'}`}
                                >
                                    {renderGrade(item.subject.averageMarks)}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center py-10 text-slate-500">No grades are available at this time.</p>
                    )}
                </div>
                
                {totalPages > 1 && (
                  <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>Show</span>
                      <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="px-2 py-1 border border-slate-300 rounded-md">
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
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

export default Grades;