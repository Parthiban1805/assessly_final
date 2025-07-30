import { createContext, useContext, useEffect, useState } from 'react';

// Create the context
const AuthContext = createContext(null);

// Create a custom hook to use the context easily
export const useAuth = () => {
    return useContext(AuthContext);
};

// Create the Provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));

                // Check for token expiration
                if (payload.exp * 1000 < Date.now()) {
                    console.log("Token expired, removing.");
                    sessionStorage.removeItem('token');
                    setUser(null);
                } else {
                    // FIX: Correctly set the user object to include all relevant userDetails properties based on role
                    // The payload.userDetails object already contains all the role-specific details from the backend.
                    setUser({
                        name: payload.userDetails.name,
                        email: payload.userDetails.email,
                        photo_url: payload.userDetails.photo_url,
                        role: payload.role,
                        // Dynamically add role-specific details from payload.userDetails
                        ...(payload.role === 'student' && {
                            student_id: payload.userDetails.student_id,
                            department: payload.userDetails.department,
                            year: payload.userDetails.year, // Also capture year for student
                        }),
                        ...(payload.role === 'teacher' && {
                            teacher_id: payload.userDetails.teacher_id,
                            department: payload.userDetails.department,
                            subjects: payload.userDetails.subjects, // IMPORTANT: Ensure 'subjects' is captured for teachers
                        }),
                        // Add other admin-specific fields here if the admin dashboard needs them from context
                    });
                }
            } catch (error) {
                console.error("Failed to decode token, removing.", error);
                sessionStorage.removeItem('token');
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    const isAuthenticated = !!user;

    const value = {
        user,
        isAuthenticated,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};