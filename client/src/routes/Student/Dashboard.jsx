import axios from 'axios';
import { Award, Mail, MapPin, Phone, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import placeholder from '../../assets/placeholder.png';
import Loader from '../../components/Loader';
import { useBreadcrumbContext } from '../../contexts/BreadcrumbContext';


const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { setCrumbs } = useBreadcrumbContext();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);

        setCrumbs([{ name: 'Dashboard', path: '/dashboard' }]);

        try {
            const token = sessionStorage.getItem("token");
            const response = await axios.get('http://localhost:5000/api/v1/dashboard/student', {
            headers: { 'Authorization': `Bearer ${token}` }
            });
            setDashboardData(response.data);
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            const errorMessage = err.response?.data?.message || "An error occurred while loading the dashboard.";
            setError(errorMessage);
            if (err.response?.status === 401 || err.response?.status === 403) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
        };

        fetchDashboardData();

        return () => {
            setCrumbs([]);
        };

    }, [setCrumbs, navigate]);

    const handleAssessmentClick = (assessmentId) => {
        navigate(`/assessments/${assessmentId}`);
    };

    // Card component now includes flex properties to structure its children
    const Card = ({ children, className = '' }) => (
        <div className={`bg-white p-5 rounded-lg border border-slate-200 flex flex-col ${className}`}>
        {children}
        </div>
    );
    
    const CardTitle = ({ children }) => (
        <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider pb-3 mb-4 border-b border-slate-200 flex-shrink-0">
        {children}
        </h3>
    );

    if (loading) return <Loader />;

    if (error) {
        return (
            <div className='text-center p-10'>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Could not load dashboard</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition">
                Try Again
            </button>
            </div>
        );
    }

    if (!dashboardData) return <div className="p-6 text-center">No dashboard data available.</div>;

    const { userDetails, courseData, performanceData, todayAssessments, notifications, attendance, settings } = dashboardData;
    const displayAllowed = settings.displayAllowed;
    const totalAssessments = courseData.reduce((acc, course) => acc + course.totalAssessments, 0);
    const attendedAssessments = courseData.reduce((acc, course) => acc + course.attendedAssessments, 0);
    const overallAttendance = totalAssessments > 0 ? (attendedAssessments / totalAssessments) * 100 : 0;
    
    const overallAverage = displayAllowed && performanceData.length > 0 
        ? performanceData.reduce((acc, month) => acc + month.averageMarks, 0) / performanceData.length 
        : 0;
    
    let bestCourse = null;
    let lowestAttendanceCourse = null;

    if (courseData && courseData.length > 0) {
        if (displayAllowed) {
            bestCourse = courseData.reduce((prev, current) => (prev.totalMarks > current.totalMarks) ? prev : current);
        }
        lowestAttendanceCourse = courseData
        .map(course => ({...course, attendancePercentage: course.totalAssessments > 0 ? (course.attendedAssessments / course.totalAssessments) * 100 : 100}))
        .reduce((prev, current) => (prev.attendancePercentage < current.attendancePercentage) ? prev : current);
    }

    return (
        // THE FIX: Using a single grid container and placing each card individually.
        // We use a 3-column grid on large screens.
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
            {/* --- ROW 1 --- */}
            <Card>
                <CardTitle>Student Details</CardTitle>
                <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                        <img src={userDetails.photo_url || placeholder} alt="Student" className="w-20 h-20 object-cover rounded-md bg-slate-200" />
                        {!userDetails.photo_url && (
                            <button
                                onClick={() => navigate('/enroll')}
                                className="mt-2 text-xs font-semibold text-white bg-blue-600 px-3 py-1 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Enroll Face
                            </button>
                        )}
                    </div>
                    <div>
                        <h2 className="text-base font-medium text-slate-900">{userDetails.name}</h2>
                        <p className="text-sm text-slate-600">{userDetails.student_id}</p>
                        <p className="text-sm text-slate-600">Semester - {userDetails.semester}</p>
                        <span className="text-xs font-bold text-blue-600 mt-1 inline-block">CONTINUING</span>
                    </div>
                </div>
                <hr className="my-4 border-slate-200" />
                <div className="space-y-1 text-sm text-slate-600">
                    <p>Hostel: {userDetails.boarding}</p>
                    <p>Class Advisor: {userDetails.class_advisor || 'Anonymous'}</p>
                </div>
                <p className="font-medium text-md text-slate-800 mt-2">{userDetails.department}</p>
            </Card>

            <Card>
                <CardTitle>Attendance Stats</CardTitle>
                <div className="space-y-5 text-sm flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-center"><span className="text-slate-600">Assessments conducted</span> <span className="font-semibold text-slate-800">{totalAssessments}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-600">Assessments attended</span> <span className="font-semibold text-slate-800">{attendedAssessments}</span></div>
                    <div>
                        <div className="flex justify-between items-center mb-1"><span className="text-slate-600">Overall Attendance</span><span className="font-semibold text-blue-600">{overallAttendance.toFixed(2)}%</span></div>
                        <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${overallAttendance}%` }}></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1"><span className="text-slate-600">Today Attendance ({attendance?.attended || 0}/{attendance?.total || 0})</span><span className="font-semibold text-blue-600">{attendance?.percentage || '0.00'}%</span></div>
                        <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${attendance?.percentage || 0}%` }}></div></div>
                    </div>
                </div>
            </Card>

            <Card>
                <CardTitle>Live Assessments</CardTitle>
                <div className="space-y-2 overflow-y-auto flex-1 pr-1 max-h-[200px]">
                    {todayAssessments.length > 0 ? (
                    todayAssessments.map((assessment) => (
                        <div key={assessment._id} onClick={() => handleAssessmentClick(assessment._id)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition">
                        <p className="text-sm font-medium text-slate-700">{assessment.name}</p>
                        </div>
                    ))
                    ) : (<div className="flex items-center justify-center h-full text-slate-500 text-sm">No assessments scheduled for today.</div>)}
                </div>
            </Card>

            {/* --- ROW 2 (Wide Progress Chart) --- */}
            {/* THE FIX: This card spans 2 out of 3 columns on large screens */}
            <Card className="lg:col-span-2 min-h-[300px]">
                <CardTitle>Progress</CardTitle>
                {!displayAllowed && (<div className="bg-amber-100 text-amber-800 text-xs p-2 rounded-md mb-4">Grade display is currently disabled.</div>)}
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
                            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip wrapperClassName="!text-xs !rounded-md !border-slate-300" />
                            <Area type="monotone" dataKey="averageMarks" stroke="none" fill="url(#lineGradient)" />
                            <Line type="monotone" dataKey="averageMarks" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                        </LineChart>
                        </ResponsiveContainer>
                    ) : (<div className="flex items-center justify-center h-full text-slate-500 text-sm">Chart data hidden.</div>)}
                </div>
            </Card>

            {displayAllowed && (
                <Card>
                    <CardTitle>Important Notifications</CardTitle>
                    <div className='min-h-[6rem] max-h-[200px]'>
                        {notifications.length > 0 ? notifications.map((notification, index) => (
                            <p key={index} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition">{notification.description}</p>
                        )) : (<p className="text-sm text-slate-500">No notifications to display</p>)}
                    </div>
                </Card>
            )}

            {/* --- ROW 3 (Wide Courses List) --- */}
            {/* THE FIX: This card spans all 3 columns on large screens */}
            <Card className="lg:col-span-2">
                <CardTitle>Courses Registered</CardTitle>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase">
                            <tr>
                                <th scope="col" className="px-2 py-3 font-semibold">Course Name</th>
                                <th scope="col" className="px-2 py-3 font-semibold text-center">Total Count</th>
                                <th scope="col" className="px-2 py-3 font-semibold text-center">Present Count</th>
                                {displayAllowed && <th scope="col" className="px-2 py-3 font-semibold text-center">Total Marks</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {courseData?.length > 0 ? courseData.map((row, index) => (
                            <tr key={index} className="border-t border-slate-200 text-slate-700">
                                <td className="px-2 py-3 font-medium text-slate-800">{row.subjectName}</td>
                                <td className="px-2 py-3 text-center">{row.totalAssessments}</td>
                                <td className="px-2 py-3 text-center">{row.attendedAssessments}</td>
                                {displayAllowed && <td className="px-2 py-3 font-bold text-center">{row.totalMarks}</td>}
                            </tr>
                            )) : (
                            <tr><td colSpan={displayAllowed ? 4 : 3} className="text-center py-4 border-t border-slate-200">No course data.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex-shrink-0">
                    <button className="bg-blue-600 text-white px-6 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition">Next</button>
                </div>
            </Card>

            {/* --- ROW 4 (Remaining cards) --- */}            
            <Card>
                <CardTitle>Course Highlights</CardTitle>
                <div className="space-y-4 min-h-[6rem]">
                {bestCourse ? (
                    <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><Award className="w-5 h-5 text-blue-600" /></div>
                    <div>
                        <p className="text-xs text-slate-500">Best Performing Course</p>
                        <p className="text-sm font-bold text-slate-800">{bestCourse.subjectName}</p>
                        <p className="text-xs font-semibold text-blue-600">{bestCourse.totalMarks} Marks</p>
                    </div>
                    </div>
                ) : displayAllowed ? (
                    <p className="text-xs text-slate-500">No performance data.</p>
                ) : null}
                
                {lowestAttendanceCourse && lowestAttendanceCourse.attendancePercentage < 100 ? (
                    <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-red-600" /></div>
                    <div>
                        <p className="text-xs text-slate-500">Lowest Attendance</p>
                        <p className="text-sm font-bold text-slate-800">{lowestAttendanceCourse.subjectName}</p>
                        <p className="text-xs font-semibold text-red-600">{lowestAttendanceCourse.attendancePercentage.toFixed(1)}% Attended</p>
                    </div>
                    </div>
                ) : (
                    <p className="text-xs text-slate-500">Perfect attendance in all courses!</p>
                )}
                </div>
            </Card>

            <Card>
                <CardTitle>Feedback</CardTitle>
                <p className="text-sm text-slate-600 min-h-[6rem]">Share your thoughts, suggestions, or report any issues with us. Your feedback helps us improve and provide a better experience. We value your input!</p>
            </Card>
            
            <Card>
                <CardTitle>Contact</CardTitle>
                <p className='flex items-center gap-4 text-sm text-slate-600'><span className="text-sm text-blue-600"><Phone size={15}/></span>0427 222-0-2224</p>
                <p className='flex items-center gap-4 text-sm text-slate-600 mt-2'><span className="text-sm text-blue-600"><Mail size={15}/></span>weacttech@gmail.com</p>
                <p className='flex items-center gap-4 text-sm text-slate-600 mt-2'><span className="text-sm text-blue-600"><MapPin size={15}/></span>Erode, TN, IN</p>
            </Card>
        </div>
    );
};

export default Dashboard;