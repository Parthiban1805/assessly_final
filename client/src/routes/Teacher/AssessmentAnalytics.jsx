import axios from 'axios';
import { Check, ChevronLeft, Download, X } from 'lucide-react'; // Icons for check, download, x (for hardest question)
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
} from 'recharts'; // Chart components from Recharts
import Loader from '../../components/Loader'; // Global loading spinner
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext'; // Breadcrumb context hook

/**
 * AssessmentAnalytics component displays detailed performance analytics for a selected assessment.
 * It includes summary statistics, performance graphs, score distribution, and question-level analysis.
 *
 * @returns {JSX.Element} The assessment analytics UI.
 */
export default function AssessmentAnalytics() {
  const navigate = useNavigate(); // Hook for programmatic navigation.
  const { assessmentId: param } = useParams(); // Get assessmentId from URL parameters (if present).

  /* ───────── State Management ───────── */
  const [assessments, setAssessments] = useState([]); // List of all assessments available for analysis.
  const [activeId, setActiveId] = useState(param || ''); // ID of the currently selected assessment for detailed analytics.
  const [summary, setSummary] = useState(null); // Summary statistics for the active assessment.
  const [topPerformers, setTopPerformers] = useState([]); // List of top performing students.
  const [graphData, setGraphData] = useState([]); // Data for performance over time graph.
  const [distributionData, setDistributionData] = useState([]); // Data for score distribution.
  const [questionStats, setQuestionStats] = useState([]); // Statistics for individual questions.
  const [loading, setLoading] = useState(false); // Overall loading state for analytics data.
  const [error, setError] = useState(''); // Any error message during data fetching.
  const {setCrumbs} = useBreadcrumbContext(); // Hook to set breadcrumbs.

  /* ───────── Helper Functions ───────── */
  /**
   * Retrieves the authentication JWT token from sessionStorage.
   * Redirects to login if no token is found.
   * @returns {string} The authentication token.
   * @throws {Error} If no token is found.
   */
  const getAuthToken = () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      console.error("No auth token found in sessionStorage. Redirecting to login.");
      navigate('/login'); // Redirect to login if unauthenticated.
      throw new Error('No auth token in storage'); // Throw to halt further execution in current call stack.
    }
    return token;
  };

  /* ───────── Fetch Assessments Once on Mount ───────── */
  /**
   * Effect hook to fetch the list of all available assessments for analytics.
   * Runs once on component mount.
   */
  useEffect(() => {
    (async () => {
      try {
        const token = getAuthToken(); // Get the authentication token.
        const res = await axios.get(
          `${API_BASE_URL}/analytics/assessments`, // API endpoint for assessments.
          { headers: { Authorization: `Bearer ${token}` } } // Include authorization header.
        );
        setAssessments(res.data); // Set the fetched assessments.
      } catch (e) {
        console.error('Error fetching assessments:', e);
        setError(e.response?.data?.message || 'Failed to load assessments'); // Set error message.
      }
    })();
  }, [navigate]); // Dependency: navigate (to handle potential redirect inside getAuthToken).

  /* ───────── Fetch Analytics When Active Assessment ID Changes ───────── */
  /**
   * Effect hook to fetch detailed analytics data for the selected assessment.
   * Runs whenever `activeId` changes (i.e., when an assessment is selected).
   */
  useEffect(() => {
    if (!activeId) return; // Do nothing if no assessment is selected yet.

    setLoading(true); // Start loading state.
    setError(''); // Clear previous errors.

    (async () => {
      try {
        const token = getAuthToken(); // Get the authentication token.

        // Fetch summary statistics.
        const { data: sum } = await axios.get(
          `${API_BASE_URL}/analytics/summary?assessmentId=${activeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSummary(sum);

        // Fetch top performers.
        const { data: tp } = await axios.get(
          `${API_BASE_URL}/analytics/top-performers?assessmentId=${activeId}&limit=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Sort top performers by score (descending) then by name (ascending).
        const sorted = [...tp.topPerformers].sort((a,b)=>
          b.score !== a.score ? b.score - a.score : a.name.localeCompare(b.name)
        );
        setTopPerformers(sorted);

        // Fetch performance graph data.
        const { data: g } = await axios.get(
          `${API_BASE_URL}/analytics/performance-graph?assessmentId=${activeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Transform graph data into Recharts-compatible format.
        const chartRows = g.labels.map((label,i) => ({
          name: label,
          Score:        g.datasets[0].data[i],
          'Total Marks':g.datasets[1].data[i]
        }));
        setGraphData(chartRows);

        // Fetch performance distribution data.
        const { data: dist } = await axios.get(
          `${API_BASE_URL}/analytics/performance-distribution?assessmentId=${activeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDistributionData(dist.ranges);

        // Fetch question performance statistics.
        const { data: questions } = await axios.get(
          `${API_BASE_URL}/analytics/question-performance?assessmentId=${activeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setQuestionStats(questions.questionStats);

      } catch (e) {
        console.error('Error fetching analytics:', e);
        setError(e.response?.data?.message || 'Failed to load analytics'); // Set error message.
      } finally {
        setLoading(false); // End loading state.
      }
    })();
  }, [activeId, navigate]); // Dependencies: activeId, navigate (for potential redirect inside getAuthToken).

  /**
   * Effect hook to set breadcrumbs dynamically based on the selected assessment's name.
   */
  useEffect(() => {
    if (summary && summary.assessmentInfo) {
        setCrumbs([
        { name: 'Analytics', path: '/analytics' },
        { name: `${summary.assessmentInfo.name}`, path: `/analytics/${activeId}` }, // Update path to include assessment ID
        ]);
    }
  }, [summary, setCrumbs, activeId]); // Dependencies: summary, setCrumbs, activeId.

  /* ───────── UI Actions ───────── */
  /**
   * Selects an assessment for detailed analytics and updates the URL.
   * @param {string} id - The ID of the selected assessment.
   */
  const selectAssessment = (id) => {
    setActiveId(id);
    navigate(`/analytics/${id}`); // Update URL to reflect selected assessment.
  };

  /* ───────── Conditional Render: Choose Assessment View ───────── */
  if (!activeId) {
    return (
      <div className="max-w-7xl mx-auto min-h-screen">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Assessment Analytics</h2>
        <p className='text-slate-600 dark:text-gray-300 mb-4'>
            Choose an assessment to view its performance metrics and question-level data.
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm p-4">
            {error && <p className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-4 border border-red-200 dark:border-red-700">{error}</p>}

            <select
            className="w-full max-w-md p-3 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200"
            defaultValue=""
            onChange={e => selectAssessment(e.target.value)}
            >
            <option value="" disabled>Choose an assessment</option>
            {loading ? ( // Display loading message while assessments are being fetched.
                <option value="" disabled>Loading assessments...</option>
            ) : (
                // Map over fetched assessments to create options.
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

  /* ───────── Conditional Render: Analytics View ───────── */
  if (loading) return <Loader/>; // Display loading spinner while detailed analytics are fetched.

  // Display error message if detailed analytics fetching failed.
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center max-w-md border border-red-200 dark:border-red-700">
            <h2 className="text-2xl font-medium text-red-600 dark:text-red-400 mb-4">Error</h2>
            <p className="text-slate-700 dark:text-gray-200 mb-6">Assessment details not found</p>
            <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                Try Again
            </button>
        </div>
    </div>
  );

  // If no summary data is available for the active assessment (e.g., no submissions yet).
  if (!summary) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center max-w-md border border-slate-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">No Data Available</h2>
            <p className="text-slate-600 dark:text-gray-300">No summary data found for the selected assessment. It might not have any submissions yet.</p>
            <button
                className="mt-6 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                Select Another Assessment
            </button>
        </div>
    </div>
  );


  return (
    <div className="max-w-7xl mx-auto min-h-screen">

      {/* Header with back button and export */}
      <header className="flex items-center justify-between mb-8 pb-3 border-b border-slate-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-medium text-slate-800 dark:text-white">
            {summary.assessmentInfo?.name || 'Assessment Analytics'}
          </h1>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors text-sm font-semibold sm:mt-0 flex items-center"
          onClick={() => window.print()} // Triggers browser print dialog.
          aria-label="Export report as PDF"
        >
          <Download size={16} className="mr-1" />
          Export Report
        </button>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Total Students Assessed</div>
          <div className="text-2xl font-medium text-slate-900 dark:text-white">{summary.totalStudents}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Class Average (%)</div>
          <div className="text-2xl font-medium text-slate-900 dark:text-white">{summary.averagePercentage}%</div>
        </div>
      </section>

      {/* Performance Graph */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm mb-8 border border-slate-200 dark:border-gray-700">
        <h2 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Performance Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={graphData} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" className="dark:stroke-gray-700" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} className="dark:text-gray-400" />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} className="dark:text-gray-400" />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', color: '#1f2937' }} />
            <Legend wrapperStyle={{ paddingTop: '10px', color: '#64748b' }} />
            <Line type="monotone" dataKey="Score" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="Total Marks" stroke="#10b981" strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Top Performers Table */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm mb-8 border border-slate-200 dark:border-gray-700">
        <h2 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Top Performers</h2>
        {topPerformers.length === 0
          ? <p className="text-slate-600 dark:text-gray-300 text-center py-4">No top performers found for this assessment.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-gray-700">
                  <tr className="border-b border-slate-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-gray-300 uppercase">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-gray-300 uppercase">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-gray-300 uppercase">Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-gray-300 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                  {topPerformers.map((p,i)=>(
                    <tr
                      key={p.studentId}
                      className="border-b border-slate-100 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={()=>navigate(`/teacher-dashboard/students/${p.studentId}/${activeId}`)}
                    >
                      <td className="py-3 px-4 text-slate-900 dark:text-white">{i+1}</td>
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{p.name}</td>
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{p.score}</td>
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{p.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      {/* Performance Distribution */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm mb-8 border border-slate-200 dark:border-gray-700">
        <h2 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Performance Distribution</h2>
        <div className="space-y-8">

          {/* Custom distribution bars */}
          <div className="flex justify-center gap-8 flex-wrap">
            {distributionData.map((range, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">{range.label}</div>
                <div className="relative flex flex-col items-center">
                  <div
                    className="rounded-t-md flex flex-col justify-end p-2"
                    style={{
                      height: `${Math.max(range.percentage * 2, 40)}px`, // Minimum height for visibility.
                      backgroundColor: range.color,
                      width: '60px'
                    }}
                  >
                    <div className="flex flex-wrap justify-center gap-1">
                      {/* Visual indicator of students within range, max 10 circles */}
                      {Array.from({ length: Math.min(range.count, 10) }, (_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                        />
                      ))}
                      {/* Indicate additional students if count > 10 */}
                      {range.count > 10 && (
                        <div className="text-xs text-white font-medium">+{range.count - 10}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{range.count} students</div>
                    <div className="text-xs text-slate-500 dark:text-gray-400">({range.percentage}%)</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recharts Bar Chart for distribution */}
          <div className="mt-8">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" className="dark:stroke-gray-700" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} className="dark:text-gray-400" />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} className="dark:text-gray-400" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', color: '#1f2937' }} formatter={(value, name) => [`${value} students`, 'Count']} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Question Performance Analysis */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 mb-8">
        <h2 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Question Performance Analysis</h2>
        <div className="space-y-8">

          {/* Summary cards for easiest/hardest question */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex-shrink-0 w-12 h-12 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center text-white text-xl font-medium mr-4">
                <Check size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-400">Easiest Question</h3>
                <p className="text-green-700 dark:text-green-300">
                  Q{questionStats[0]?.questionNumber}: {questionStats[0]?.correctPercentage}% correct
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
              <div className="flex-shrink-0 w-12 h-12 bg-red-500 dark:bg-red-600 rounded-full flex items-center justify-center text-white text-xl font-medium mr-4">
                <X size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Hardest Question</h3>
                <p className="text-red-700 dark:text-red-300">
                  Q{questionStats[questionStats.length - 1]?.questionNumber}: {questionStats[questionStats.length - 1]?.correctPercentage}% correct
                </p>
              </div>
            </div>
          </div>

          {/* Bar chart for question performance */}
          <div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={questionStats}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" className="dark:stroke-gray-700" />
                <XAxis
                  dataKey="questionNumber"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={12}
                  stroke="#94a3b8" tickLine={false} axisLine={false}
                  className="dark:text-gray-400"
                />
                <YAxis
                  label={{ value: 'Correct Percentage (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  domain={[0, 100]}
                  stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false}
                  className="dark:text-gray-400"
                />
                <Tooltip
                  formatter={(value, name) => [`${value}%`, 'Correct Percentage']}
                  labelFormatter={(label) => `Question ${label}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    color: '#1f2937'
                  }}
                />
                <Bar dataKey="correctPercentage" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </section>
          {/* Detailed Question List */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">Detailed Question Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {questionStats.map((stat, index) => (
            <div
                key={index}
                className={`p-4 rounded-xl border ${
                stat.difficulty.toLowerCase() === 'easy' ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20' :
                stat.difficulty.toLowerCase() === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20' :
                'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                }`}
            >
                <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-700 dark:text-gray-200">Q{stat.questionNumber}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    stat.difficulty.toLowerCase() === 'easy' ? 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                    stat.difficulty.toLowerCase() === 'medium' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                    'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                }`}>
                    {stat.difficulty}
                </span>
                </div>
                <div className="mb-3">
                <p className="text-sm text-slate-700 dark:text-gray-200">
                    {stat.question.length > 80
                    ? `${stat.question.substring(0, 80)}...`
                    : stat.question
                    }
                </p>
                </div>
                <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-gray-300">Correct:</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{stat.correctCount} ({stat.correctPercentage}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-gray-300">Incorrect:</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">{stat.incorrectCount}</span>
                </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2">
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
