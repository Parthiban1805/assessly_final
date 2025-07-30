import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import './App.css';
import { BreadcrumbProvider } from "./contexts/BreadcrumbContext";
import AppLayout from './layouts/AppLayout';
import AddNotification from "./routes/Admin/AddNotification";
import AddUser from "./routes/Admin/AddUser";
import AdminDashboard from "./routes/Admin/AdminDashboard";
import AllNotifications from "./routes/Admin/AllNotifications";
import AssessmentList from "./routes/Admin/AssessmentList";
import UserManagement from "./routes/Admin/UserManagement";
import Login from './routes/Login/Login';
import ProtectedRoute from './routes/Login/ProtectedRoute';
import PublicRoute from "./routes/Login/PublicRoute";
import NotFoundPage from './routes/NotFoundPage';
import Assessment from "./routes/Student/Assessment";
import AssessmentHandler from "./routes/Student/Assessment/AssessmentHandler";
import AssessmentPage from "./routes/Student/Assessment/AssessmentPage";
import QuizInstructions from "./routes/Student/Assessment/QuizInstructions";
import ResultPage from "./routes/Student/Assessment/ResultPage";
import CourseModules from "./routes/Student/CourseModules";
import CourseView from "./routes/Student/CourseView";
import Dashboard from './routes/Student/Dashboard';
import EnrollmentPage from "./routes/Student/EnrollmentPage";
import Grades from "./routes/Student/Grades";
import Studymaterial from "./routes/Student/StudyMaterial";
import VerificationPage from "./routes/Student/VerificationPage";
import AddQuestion from "./routes/Teacher/AddQuestion";
import AddStudyMaterial from "./routes/Teacher/AddStudyMaterial";
import AIQuizFactory from "./routes/Teacher/AIQuizFactory/AIQuizFactory";
import EditAIQuiz from "./routes/Teacher/AIQuizFactory/EditAIQuiz";
import ViewAIQuiz from "./routes/Teacher/AIQuizFactory/ViewAIQuiz";
import AssessmentAnalytics from "./routes/Teacher/AssessmentAnalytics";
import AssessmentDisplay from "./routes/Teacher/AssessmentDisplay";
import DateWiseReport from "./routes/Teacher/DateWiseReport";
import QuestionBank from "./routes/Teacher/QuestionBank";
import TeacherResultPage from "./routes/Teacher/ResultPage";
import TeacherDashboard from "./routes/Teacher/TeacherDashboard";
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const RoleBasedRedirect = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    switch (user.role) {
        case 'student': return <Navigate to="/dashboard" replace />;
        case 'teacher': return <Navigate to="/teacher-dashboard" replace />;
        case 'admin': return <Navigate to="/admin-dashboard" replace />;
        default: return <Navigate to="/login" replace />;
    }
};

const App = () => {
    return (
        <GoogleOAuthProvider clientId={clientId}>
            <BrowserRouter>
                <AuthProvider>
                    <BreadcrumbProvider >
                        <Routes>
                            {/* ====================================================== */}
                            {/* Group 1: Public Routes (No Sidebar, No Protection) */}
                            {/* ====================================================== */}
                            <Route path="/login" element={
                                <PublicRoute>
                                    <Login />
                                </PublicRoute>
                            } />

                            {/* =================================================================== */}
                            {/* Group 2: Protected Full-Screen Routes (No Sidebar, But Protected) */}
                            {/* These routes are for immersive experiences like taking a test. */}
                            {/* =================================================================== */}
                            <Route path="/assessment/:assessmentId/questions" element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <AssessmentPage />
                                </ProtectedRoute>
                            }/>
                            <Route path="/assessment/:assessmentId/verificationPage" element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <VerificationPage />
                                </ProtectedRoute>
                            }/>
                            <Route path="/assessments/:assessmentId" element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <AssessmentHandler />
                                </ProtectedRoute>
                            }/>
                            <Route path="/instructions/:assessmentId" element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <QuizInstructions />
                                </ProtectedRoute>
                            }/>
                            
                            {/* ==================================================================== */}
                            {/* Group 3: Protected Routes within AppLayout (These HAVE a Sidebar) */}
                            {/* All standard dashboard pages go here. */}
                            {/* ==================================================================== */}
                            <Route 
                                path="/" 
                                element={
                                    <ProtectedRoute>
                                        <AppLayout /> 
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<RoleBasedRedirect />} />
                                
                                {/* Student Routes */}
                                <Route path="dashboard" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
                                <Route path="assessments" element={<ProtectedRoute allowedRoles={['student']}><Assessment /></ProtectedRoute>} />
                                <Route path="grades" element={<ProtectedRoute allowedRoles={['student']}><Grades /></ProtectedRoute>} />
                                <Route path="study-material" element={<ProtectedRoute allowedRoles={['student']}><Studymaterial /></ProtectedRoute>} />
                                <Route path="courses" element={<ProtectedRoute allowedRoles={['student']}><CourseModules /></ProtectedRoute>} />
                                <Route path="course/:subjectId" element={<ProtectedRoute allowedRoles={['student']}><CourseView /></ProtectedRoute>} />
                                <Route path="results/:assessmentId" element={<ProtectedRoute allowedRoles={['student']}><ResultPage /></ProtectedRoute>} />
                                <Route path="enroll" element={<ProtectedRoute allowedRoles={['student']}><EnrollmentPage /></ProtectedRoute>} />
                                
                                {/* Teacher Routes */}
                                <Route path="teacher-dashboard" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
                                <Route path="add-question" element={<ProtectedRoute allowedRoles={['teacher']}><AddQuestion /></ProtectedRoute>} />
                                <Route path="question-bank" element={<ProtectedRoute allowedRoles={['teacher']}><QuestionBank /></ProtectedRoute>} />
                                <Route path="add-study-material" element={<ProtectedRoute allowedRoles={['teacher']}><AddStudyMaterial /></ProtectedRoute>} />
                                <Route path="date-wise-report" element={<ProtectedRoute allowedRoles={['teacher']}><DateWiseReport /></ProtectedRoute>} />
                                <Route path="assessment-results" element={<ProtectedRoute allowedRoles={['teacher']}><AssessmentDisplay /></ProtectedRoute>} />
                                <Route path="teacher/ai-quiz-factory" element={<ProtectedRoute allowedRoles={['teacher']}><AIQuizFactory /></ProtectedRoute>} />
                                <Route path="teacher/view-quiz" element={<ProtectedRoute allowedRoles={['teacher']}><ViewAIQuiz /></ProtectedRoute>} />
                                <Route path="teacher/edit-quiz" element={<ProtectedRoute allowedRoles={['teacher']}><EditAIQuiz /></ProtectedRoute>} />
                                <Route path="teacher-dashboard/students/:studentId/:assessmentId" element={<TeacherResultPage />} />
                                <Route path="analytics" element={<AssessmentAnalytics />} />
                                <Route path="analytics/:assessmentId" element={<AssessmentAnalytics />} />

                                {/* Admin Routes */}
                                <Route path="admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                                <Route path="admin-access-assessment" element={<ProtectedRoute allowedRoles={['admin']}><AssessmentList /></ProtectedRoute>} />
                                <Route path="add-notification" element={<ProtectedRoute allowedRoles={['admin']}><AddNotification /></ProtectedRoute>} />
                                <Route path="all-notification" element={<ProtectedRoute allowedRoles={['admin']}><AllNotifications /></ProtectedRoute>} />
                                <Route path="add-user" element={<ProtectedRoute allowedRoles={['admin']}><AddUser /></ProtectedRoute>} />
                                <Route path="manage-users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
                                
                            </Route>

                            {/* A final catch-all for any route not matched above */}
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </BreadcrumbProvider>
                </AuthProvider>
            </BrowserRouter>
        </GoogleOAuthProvider>
    );
};

export default App;