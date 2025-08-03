import axios from 'axios';
import { Award, Mail, MapPin, Phone, TrendingDown } from 'lucide-react'; // Icons for dashboard elements
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'; // Chart components
import placeholder from '../../assets/placeholder.png'; // Placeholder image for student avatar
import Loader from '../../components/Loader'; // Global loading spinner component
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext'; // Breadcrumb context hook
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * Dashboard component for students, displaying personal details, attendance stats,
 * live assessments, academic progress chart, notifications, and registered courses.
 *
 * @returns {JSX.Element} The student dashboard UI.
 */
const Dashboard = () => {
    // State to hold all fetched dashboard data.
    const [dashboardData, setDashboardData] = useState(null);
    // State to manage overall loading status.
    const [loading, setLoading] = useState(true);
    // State to store any error messages during data fetching.
    const [error, setError] = useState(null);
    const { setCrumbs } = useBreadcrumbContext(); // Hook to set breadcrumbs.
    const navigate = useNavigate(); // Hook for programmatic navigation.

    /**
     * Effect hook to fetch all dashboard data for the student on component mount.
     * Sets breadcrumbs and handles authentication errors by redirecting to login.
     */
    useEffect(() => {
        const fetchDashboardData = async () => {
        setLoading(true); // Start loading state.
        setError(null); // Clear previous errors.

        setCrumbs([{ name: 'Dashboard', path: '/dashboard' }]); // Set static breadcrumb.

        try {
            const token = sessionStorage.getItem("token");
            // Fetch student dashboard data from the API.
            const response = await axios.get(`${API_BASE_URL}/dashboard/student`, {
                headers: { 'Authorization': `Bearer ${token}` } // Include authorization header.
            });
            setDashboardData(response.data); // Set fetched data.
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            const errorMessage = err.response?.data?.message || "An error occurred while loading the dashboard.";
            setError(errorMessage); // Set error message.
            // If authentication error, redirect to login.
            if (err.response?.status === 401 || err.response?.status === 403) {
                navigate('/login');
            }
        } finally {
            setLoading(false); // End loading state.
        }
        };

        fetchDashboardData();

        // Cleanup function for useEffect: reset breadcrumbs when component unmounts.
        return () => {
            setCrumbs([]);
        };

    }, [setCrumbs, navigate]); // Dependencies: setCrumbs (for breadcrumbs), navigate (for redirection).

    /**
     * Handles navigation to a specific assessment's handler page when clicked.
     * @param {string} assessmentId - The ID of the assessment to navigate to.
     */
    const handleAssessmentClick = (assessmentId) => {
        navigate(`/assessments/${assessmentId}`);
    };

    /**
     * Reusable Card component for consistent styling across the dashboard.
     * @param {object} props - Component props.
     * @param {React.ReactNode} props.children - Content of the card.
     * @param {string} [props.className] - Optional additional CSS classes.
     * @returns {JSX.Element} A styled card container.
     */
    const Card = ({ children, className = '' }) => (
        <div className={`bg-white dark:bg-gray-800 p-5 rounded-lg border border-slate-200 dark:border-gray-700 flex flex-col ${className}`}>
        {children}
        </div>
    );

    /**
     * Reusable CardTitle component for consistent card header styling.
     * @param {object} props - Component props.
     * @param {React.ReactNode} props.children - Title text.
     * @returns {JSX.Element} A styled card title.
     */
    const CardTitle = ({ children }) => (
        <h3 className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 dark:border-gray-700 flex-shrink-0">
        {children}
        </h3>
    );

    // Display global loading spinner.
    if (loading) return <Loader />;

    // Display error message if data fetching failed, with a retry option.
    if (error) {
        return (
            <div className='text-center p-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 mx-auto max-w-md'>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Could not load dashboard</h2>
            <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition">
                Try Again
            </button>
            </div>
        );
    }

    // If no dashboard data is available after loading, display a message.
    if (!dashboardData) return <div className="p-6 text-center text-slate-500 dark:text-gray-400">No dashboard data available.</div>;

    // Destructure dashboard data.
    const { userDetails, courseData, performanceData, todayAssessments, notifications, attendance, settings } = dashboardData;
    const displayAllowed = settings.displayAllowed; // Setting to control grade visibility.

    // Calculate overall attendance.
    const totalAssessments = courseData.reduce((acc, course) => acc + course.totalAssessments, 0);
    const attendedAssessments = courseData.reduce((acc, course) => acc + course.attendedAssessments, 0);
    const overallAttendance = totalAssessments > 0 ? (attendedAssessments / totalAssessments) * 100 : 0;

    // Calculate overall average if grade display is allowed and performance data exists.
    const overallAverage = displayAllowed && performanceData.length > 0
        ? performanceData.reduce((acc, month) => acc + month.averageMarks, 0) / performanceData.length
        : 0;

    let bestCourse = null;
    let lowestAttendanceCourse = null;

    // Determine best performing course and course with lowest attendance.
    if (courseData && courseData.length > 0) {
        if (displayAllowed) {
            bestCourse = courseData.reduce((prev, current) => (prev.totalMarks > current.totalMarks) ? prev : current);
        }
        lowestAttendanceCourse = courseData
        .map(course => ({...course, attendancePercentage: course.totalAssessments > 0 ? (course.attendedAssessments / course.totalAssessments) * 100 : 100}))
        .reduce((prev, current) => (prev.attendancePercentage < current.attendancePercentage) ? prev : current);
    }

    return (
        // Main grid container for the dashboard layout.
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* --- Student Details Card (ROW 1, Column 1) --- */}
            <Card>
                <CardTitle>Student Details</CardTitle>
                <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                        <img src={userDetails.photo_url || placeholder} alt="Student" className="w-20 h-20 object-cover rounded-md bg-slate-200 dark:bg-gray-700" />
                        {/* Option to enroll face if no photo URL exists. */}
                        {!userDetails.photo_url && (
                            <button
                                onClick={() => navigate('/enroll')}
                                className="mt-2 text-xs font-semibold text-white bg-blue-600 px-3 py-1 rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Enroll Face
                            </button>
                        )}
                    </div>
                    <div>
                        <h2 className="text-base font-medium text-slate-900 dark:text-white">{userDetails.name}</h2>
                        <p className="text-sm text-slate-600 dark:text-gray-300">{userDetails.student_id}</p>
                        <p className="text-sm text-slate-600 dark:text-gray-300">Semester - {userDetails.semester}</p>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 inline-block">CONTINUING</span>
                    </div>
                </div>
                <hr className="my-4 border-slate-200 dark:border-gray-700" />
                <div className="space-y-1 text-sm text-slate-600 dark:text-gray-300">
                    <p>Hostel: {userDetails.boarding}</p>
                    <p>Class Advisor: {userDetails.class_advisor || 'Anonymous'}</p>
                </div>
                <p className="font-medium text-md text-slate-800 dark:text-white mt-2">{userDetails.department}</p>
            </Card>

            {/* Attendance Stats Card (ROW 1, Column 2) */}
            <Card>
                <CardTitle>Attendance Stats</CardTitle>
                <div className="space-y-5 text-sm flex-1 flex flex-col justify-center text-slate-600 dark:text-gray-300">
                    <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-gray-300">Assessments conducted</span> <span className="font-semibold text-slate-800 dark:text-white">{totalAssessments}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-gray-300">Assessments attended</span> <span className="font-semibold text-slate-800 dark:text-white">{attendedAssessments}</span></div>
                    <div>
                        <div className="flex justify-between items-center mb-1"><span className="text-slate-600 dark:text-gray-300">Overall Attendance</span><span className="font-semibold text-blue-600 dark:text-blue-400">{overallAttendance.toFixed(2)}%</span></div>
                        <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${overallAttendance}%` }}></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1"><span className="text-slate-600 dark:text-gray-300">Today Attendance ({attendance?.attended || 0}/{attendance?.total || 0})</span><span className="font-semibold text-blue-600 dark:text-blue-400">{attendance?.percentage || '0.00'}%</span></div>
                        <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${attendance?.percentage || 0}%` }}></div></div>
                    </div>
                </div>
            </Card>

            {/* Live Assessments Card (ROW 1, Column 3) */}
            <Card>
                <CardTitle>Live Assessments</CardTitle>
                <div className="space-y-2 overflow-y-auto flex-1 pr-1 max-h-[200px]">
                    {todayAssessments.length > 0 ? (
                    todayAssessments.map((assessment) => (
                        <div key={assessment._id} onClick={() => handleAssessmentClick(assessment._id)} className="p-3 bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition">
                        <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{assessment.name}</p>
                        </div>
                    ))
                    ) : (<div className="flex items-center justify-center h-full text-slate-500 dark:text-gray-400 text-sm">No assessments scheduled for today.</div>)}
                </div>
            </Card>

            {/* --- Progress Chart Card (ROW 2, Spans 2 Columns) --- */}
            <Card className="lg:col-span-2 min-h-[300px]">
                <CardTitle>Progress</CardTitle>
                {!displayAllowed && (<div className="bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 text-xs p-2 rounded-md mb-4">Grade display is currently disabled.</div>)}
                <div className="flex-1">
                    {displayAllowed ? (
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                            <defs>
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            </defs>
                            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} className="dark:text-gray-400"/>
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} className="dark:text-gray-400"/>
                            <Tooltip wrapperClassName="!text-xs !rounded-md !border-slate-300 dark:!border-gray-600 !bg-white dark:!bg-gray-800 !text-slate-800 dark:!text-white" />
                            <Area type="monotone" dataKey="averageMarks" stroke="none" fill="url(#lineGradient)" />
                            <Line type="monotone" dataKey="averageMarks" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                        </LineChart>
                        </ResponsiveContainer>
                    ) : (<div className="flex items-center justify-center h-full text-slate-500 dark:text-gray-400 text-sm">Chart data hidden.</div>)}
                </div>
            </Card>

            {/* Important Notifications Card (ROW 2, Column 3) */}
            {displayAllowed && ( /* Only display if allowed */
                <Card>
                    <CardTitle>Important Notifications</CardTitle>
                    <div className='min-h-[6rem] max-h-[200px] overflow-y-auto'>
                        {notifications.length > 0 ? notifications.map((notification, index) => (
                            <p key={index} className="p-3 bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition text-slate-700 dark:text-gray-200">{notification.description}</p>
                        )) : (<p className="text-sm text-slate-500 dark:text-gray-400">No notifications to display</p>)}
                    </div>
                </Card>
            )}

            {/* --- Courses Registered List Card (ROW 3, Spans All 3 Columns) --- */}
            <Card className="lg:col-span-3">
                <CardTitle>Courses Registered</CardTitle>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-gray-400 uppercase bg-slate-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-2 py-3 font-semibold">Course Name</th>
                                <th scope="col" className="px-2 py-3 font-semibold text-center">Total Count</th>
                                <th scope="col" className="px-2 py-3 font-semibold text-center">Present Count</th>
                                {displayAllowed && <th scope="col" className="px-2 py-3 font-semibold text-center">Total Marks</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                            {courseData?.length > 0 ? courseData.map((row, index) => (
                            <tr key={index} className="border-t border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700/50">
                                <td className="px-2 py-3 font-medium text-slate-800 dark:text-white">{row.subjectName}</td>
                                <td className="px-2 py-3 text-center">{row.totalAssessments}</td>
                                <td className="px-2 py-3 text-center">{row.attendedAssessments}</td>
                                {displayAllowed && <td className="px-2 py-3 font-bold text-center">{row.totalMarks}</td>}
                            </tr>
                            )) : (
                            <tr><td colSpan={displayAllowed ? 4 : 3} className="text-center py-4 border-t border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400">No course data.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex-shrink-0">
                    <button className="bg-blue-600 text-white px-6 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition">Next</button>
                </div>
            </Card>

            {/* --- Course Highlights, Feedback, Contact Cards (ROW 4, 3 Columns) --- */}
            <Card>
                <CardTitle>Course Highlights</CardTitle>
                <div className="space-y-4 min-h-[6rem]">
                {bestCourse ? (
                    <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"><Award className="w-5 h-5 text-blue-600 dark:text-blue-300" /></div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-gray-400">Best Performing Course</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{bestCourse.subjectName}</p>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{bestCourse.totalMarks} Marks</p>
                    </div>
                    </div>
                ) : displayAllowed ? ( /* Only show message if display is allowed and no data */
                    <p className="text-xs text-slate-500 dark:text-gray-400">No performance data.</p>
                ) : null}

                {lowestAttendanceCourse && lowestAttendanceCourse.attendancePercentage < 100 ? (
                    <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-gray-400">Lowest Attendance</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{lowestAttendanceCourse.subjectName}</p>
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400">{lowestAttendanceCourse.attendancePercentage.toFixed(1)}% Attended</p>
                    </div>
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 dark:text-gray-400">Perfect attendance in all courses!</p>
                )}
                </div>
            </Card>

            <Card>
                <CardTitle>Feedback</CardTitle>
                <p className="text-sm text-slate-600 dark:text-gray-300 min-h-[6rem]">Share your thoughts, suggestions, or report any issues with us. Your feedback helps us improve and provide a better experience. We value your input!</p>
            </Card>

            <Card>
                <CardTitle>Contact</CardTitle>
                <p className='flex items-center gap-4 text-sm text-slate-600 dark:text-gray-300'><span className="text-sm text-blue-600 dark:text-blue-400"><Phone size={15}/></span>0427 222-0-2224</p>
                <p className='flex items-center gap-4 text-sm text-slate-600 dark:text-gray-300 mt-2'><span className="text-sm text-blue-600 dark:text-blue-400"><Mail size={15}/></span>weacttech@gmail.com</p>
                <p className='flex items-center gap-4 text-sm text-slate-600 dark:text-gray-300 mt-2'><span className="text-sm text-blue-600 dark:text-blue-400"><MapPin size={15}/></span>Erode, TN, IN</p>
            </Card>
        </div>
    );
};

export default Dashboard;
