import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PublicRoute = ({ children }) => {
    const { isAuthenticated, user } = useAuth();

    // If the user is authenticated, determine their dashboard and redirect them.
    if (isAuthenticated) {
        switch (user.role) {
        case 'student':
            return <Navigate to="/dashboard" replace />;
        case 'teacher':
            return <Navigate to="/teacher-dashboard" replace />;
        case 'admin':
            return <Navigate to="/admin-dashboard" replace />;
        default:
            // Fallback to a safe default if role is unknown, though this shouldn't happen.
            return <Navigate to="/" replace />;
        }
    }

    // If the user is not authenticated, render the requested public page (e.g., the Login component).
    return children;
};

export default PublicRoute;