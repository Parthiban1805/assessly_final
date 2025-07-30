// File: src/routes/Teacher_Dashboard/AssessmentAnalytics.jsx
import axios from 'axios';
import { Check, Download, X } from 'lucide-react';
// REMOVE THIS LINE: import sodium from 'libsodium-wrappers'; // THIS IS NO LONGER NEEDED
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis
} from 'recharts';
import Loader from '../../components/Loader';
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext';
// Assuming you would import Lucide icons if used in other parts of your app
// import { ChevronLeft, ChevronRight, Download, Settings, Trash2, X } from 'lucide-react';
// Assuming Skeleton is used for loading states if available globally
// import Skeleton from 'react-loading-skeleton';


export default function AssessmentAnalytics() {
  const navigate               = useNavigate();
  const { assessmentId: param } = useParams();

  /* ───────── state ───────── */
  const [assessments,        setAssessments]        = useState([]);
  const [activeId,           setActiveId]           = useState(param || '');
  const [summary,            setSummary]            = useState(null);
  const [topPerformers,      setTopPerformers]      = useState([]);
  const [graphData,          setGraphData]          = useState([]);
  const [distributionData,   setDistributionData]   = useState([]);
  const [questionStats,      setQuestionStats]      = useState([]);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState('');
  const {setCrumbs} = useBreadcrumbContext();
  /* ───────── helpers ───────── */
  // FIX: Simplified getAuthToken. The JWT token is retrieved directly from sessionStorage.
  // Your backend generates standard JWTs, not encrypted tokens that require libsodium.
  const getAuthToken = () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      console.error("No auth token found in sessionStorage. Redirecting to login.");
      // Redirect to login if no token is found, this prevents further errors.
      navigate('/login');
      throw new Error('No auth token in storage'); // Throw to stop further execution in the current call stack
    }
    return token;
  };

  /* ───────── fetch assessments once ───────── */
  useEffect(() => {
    (async () => {
      try {
        const token = getAuthToken(); // Get the token
        const res   = await axios.get(
          'http://localhost:5000/api/v1/analytics/assessments', // FIX: Corrected API path to /api/v1/analytics/assessments
          { headers: { Authorization: `Bearer ${token}` } } // IMPORTANT: Ensure Authorization header is sent
        );
        setAssessments(res.data);
      } catch (e) {
        console.error('Error fetching assessments:', e);
        setError(e.response?.data?.message || 'Failed to load assessments'); // Use error message from response if available
      }
    })();
  }, [navigate]); // Add navigate to dependency array for correct effect re-runs

  /* ───────── fetch analytics when activeId changes ───────── */
  useEffect(() => {
    if (!activeId) return;            // nothing selected yet
    setLoading(true);
    setError('');
    (async () => {
      try {
        const token = getAuthToken(); // Get the token

        const { data: sum } = await axios.get(
          `http://localhost:5000/api/v1/analytics/summary?assessmentId=${activeId}`, // FIX: Corrected API path
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSummary(sum);

        const { data: tp }  = await axios.get(
          `http://localhost:5000/api/v1/analytics/top-performers?assessmentId=${activeId}&limit=10`, // FIX: Corrected API path
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const sorted = [...tp.topPerformers].sort((a,b)=>
          b.score !== a.score ? b.score - a.score : a.name.localeCompare(b.name)
        );
        setTopPerformers(sorted);

        const { data: g }   = await axios.get(
          `http://localhost:5000/api/v1/analytics/performance-graph?assessmentId=${activeId}&limit=10`, // FIX: Corrected API path
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const chartRows = g.labels.map((label,i) => ({
          name: label,
          Score:        g.datasets[0].data[i],
          'Total Marks':g.datasets[1].data[i]
        }));
        setGraphData(chartRows);

        const { data: dist } = await axios.get(
          `http://localhost:5000/api/v1/analytics/performance-distribution?assessmentId=${activeId}`, // FIX: Corrected API path
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDistributionData(dist.ranges);

        const { data: questions } = await axios.get(
          `http://localhost:5000/api/v1/analytics/question-performance?assessmentId=${activeId}`, // FIX: Corrected API path
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setQuestionStats(questions.questionStats);

      } catch (e) {
        console.error('Error fetching analytics:', e);
        setError(e.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeId, navigate]); // Add navigate to dependency array for correct effect re-runs

  useEffect(() => {
    if (summary && summary.assessmentInfo) {
        setCrumbs([
        { name: 'Analytics', path: '/analytics' },
        { name: `${summary.assessmentInfo.name}`, path: '/assessment-results' },
        ]);
    }
    }, [summary, setCrumbs]);

  /* ───────── ui actions ───────── */
  const selectAssessment = (id) => {
    setActiveId(id);
    navigate(`/analytics/${id}`);
  };

  const goBack = () => {
    setActiveId('');
    navigate('/analytics');   // drops :assessmentId param
  };

  /* ───────── choose assessment view ───────── */
  if (!activeId) {
    return (
      <div className="max-w-7xl mx-auto min-h-screen">
        <h2 className="text-lg font-semibold text-slate-800">Assessment Analytics</h2>
        <p className='text-slate-600 mb-4'>
            Choose an assessment to view its performance metrics and question-level data.
        </p>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            {error && <p className="text-red-600 bg-red-50 p-3 rounded-md mb-4 border border-red-200">{error}</p>}

            <select
            className="w-full max-w-md p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
            defaultValue=""
            onChange={e => selectAssessment(e.target.value)}
            >
            <option value="" disabled>Choose an assessment</option>
            {/* You might want a loading spinner/skeleton here if assessments takes time to load */}
            {loading ? (
                <option value="" disabled>Loading assessments...</option>
            ) : (
                assessments.map(a => (
                <option key={a._id} value={a._id}>
                    {a.name} — {a.subjectName} ({new Date(a.openDate).toLocaleDateString()})
                </option>
                ))
            )}
            </select>
        </div>
      </div>
    );
  }

  /* ───────── analytics view ───────── */
  if (loading) return <Loader/>;
  
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md border border-red-200">
            {/* <AlertTriangle className="mx-auto w-12 h-12 text-red-500 mb-4" /> */}
            <h2 className="text-2xl font-medium text-red-600 mb-4">Error</h2>
            <p className="text-slate-700 mb-6">Assessment details not found</p>
            <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                Try Again
            </button>
        </div>
    </div>
  );
  
  if (!summary) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">No Data Available</h2>
            <p className="text-slate-600">No summary data found for the selected assessment. It might not have any submissions yet.</p>
            <button 
                onClick={goBack}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                Select Another Assessment
            </button>
        </div>
    </div>
  );


  return (
    <div className="max-w-7xl mx-auto min-h-screen">

      {/* header with back button and export */}
      <header className="flex items-center justify-between mb-8 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-medium text-slate-800">
            {summary.assessmentInfo?.name || 'Assessment Analytics'}
          </h1>
        </div>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold sm:mt-0 flex items-center"
          onClick={() => window.print()}
        >
          <Download size={16} className="mr-1" />
          Export Report
        </button>
      </header>

      {/* stats cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Total Students Assessed</div>
          <div className="text-2xl font-medium text-slate-900">{summary.totalStudents}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Class Average (%)</div>
          <div className="text-2xl font-medium text-slate-900">{summary.averagePercentage}%</div>
        </div>
      </section>

      {/* performance graph */}
      <section className="bg-white p-4 rounded-xl shadow-sm mb-8 border border-slate-200">
        <h2 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Performance Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={graphData} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line type="monotone" dataKey="Score" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="Total Marks" stroke="#10b981" strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* top performers table */}
      <section className="bg-white p-4 rounded-xl shadow-sm mb-8 border border-slate-200">
        <h2 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Top Performers</h2>
        {topPerformers.length === 0
          ? <p className="text-slate-600 text-center py-4">No top performers found for this assessment.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 uppercase">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 uppercase">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 uppercase">Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {topPerformers.map((p,i)=>(
                    <tr 
                      key={p.studentId}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={()=>navigate(`/teacher-dashboard/students/${p.studentId}/${activeId}`)}
                    >
                      <td className="py-3 px-4 text-slate-900">{i+1}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{p.name}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{p.score}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{p.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      {/* performance distribution */}
      <section className="bg-white p-4 rounded-xl shadow-sm mb-8 border border-slate-200">
        <h2 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Performance Distribution</h2>
        <div className="space-y-8">
          {/* custom distribution bars */}
          <div className="flex justify-center gap-8 flex-wrap">
            {distributionData.map((range, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="text-sm font-medium text-slate-600 mb-2">{range.label}</div>
                <div className="relative flex flex-col items-center">
                  <div 
                    className="rounded-t-md flex flex-col justify-end p-2"
                    style={{
                      height: `${Math.max(range.percentage * 2, 40)}px`,
                      backgroundColor: range.color,
                      width: '60px'
                    }}
                  >
                    <div className="flex flex-wrap justify-center gap-1">
                      {Array.from({ length: Math.min(range.count, 10) }, (_, i) => (
                        <div 
                          key={i} 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                        />
                      ))}
                      {range.count > 10 && (
                        <div className="text-xs text-white font-medium">+{range.count - 10}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <div className="text-sm font-semibold text-slate-900">{range.count} students</div>
                    <div className="text-xs text-slate-500">({range.percentage}%)</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* recharts bar chart */}
          <div className="mt-8">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} formatter={(value, name) => [`${value} students`, 'Count']} />
                {/* <Legend wrapperStyle={{ paddingTop: '10px' }} /> */}
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* question performance analysis */}
      <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Question Performance Analysis</h2>
        <div className="space-y-8">
          
          {/* summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl font-medium mr-4">
                <Check size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Easiest Question</h3>
                <p className="text-green-700">
                  Q{questionStats[0]?.questionNumber}: {questionStats[0]?.correctPercentage}% correct
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white text-xl font-medium mr-4">
                <X size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Hardest Question</h3>
                <p className="text-red-700">
                  Q{questionStats[questionStats.length - 1]?.questionNumber}: {questionStats[questionStats.length - 1]?.correctPercentage}% correct
                </p>
              </div>
            </div>
          </div>

          {/* bar chart */}
          <div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={questionStats} 
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis 
                  dataKey="questionNumber" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={12}
                  stroke="#94a3b8" tickLine={false} axisLine={false}
                />
                <YAxis 
                  label={{ value: 'Correct Percentage (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  domain={[0, 100]}
                  stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false}
                />
                <Tooltip 
                  formatter={(value, name) => [`${value}%`, 'Correct Percentage']}
                  labelFormatter={(label) => `Question ${label}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="correctPercentage" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </section>
          {/* detailed question list */}
      <section section className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200">Detailed Question Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {questionStats.map((stat, index) => (
            <div 
                key={index} 
                className={`p-4 rounded-xl border ${
                stat.difficulty.toLowerCase() === 'easy' ? 'border-green-200 bg-green-50' :
                stat.difficulty.toLowerCase() === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
                }`}
            >
                <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-700">Q{stat.questionNumber}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    stat.difficulty.toLowerCase() === 'easy' ? 'bg-green-200 text-green-800' :
                    stat.difficulty.toLowerCase() === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-red-200 text-red-800'
                }`}>
                    {stat.difficulty}
                </span>
                </div>
                <div className="mb-3">
                <p className="text-sm text-slate-700">
                    {stat.question.length > 80 
                    ? `${stat.question.substring(0, 80)}...` 
                    : stat.question
                    }
                </p>
                </div>
                <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Correct:</span>
                    <span className="text-green-600 font-medium">{stat.correctCount} ({stat.correctPercentage}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Incorrect:</span>
                    <span className="text-red-600 font-medium">{stat.incorrectCount}</span>
                </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                    width: `${stat.correctPercentage}%`,
                    backgroundColor: stat.color || '#3b82f6'
                    }}
                ></div>
                </div>
            </div>
            ))}
        </div>
      </section>
    </div>
  );
}