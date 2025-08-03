import { createContext, useContext, useEffect, useState } from 'react';

// Create the authentication context.
const AuthContext = createContext(null);

/**
 * Custom hook to easily access authentication context values.
 * Throws an error if used outside of AuthProvider.
 * @returns {{user: object|null, isAuthenticated: boolean, loading: boolean}} Auth state and user data.
 */
export const useAuth = () => {
    return useContext(AuthContext);
};

/**
 * Provides authentication state and user details to its children components.
 * Manages token decoding, expiration checks, and setting user information.
 *
 * @param {object} props - React props.
 * @param {React.ReactNode} props.children - Child components that will consume this context.
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Stores the authenticated user object.
    const [loading, setLoading] = useState(true); // Indicates if authentication state is being loaded.

    // Effect hook to check for an existing token in session storage on component mount.
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        if (token) {
            try {
                // Decode the JWT token payload.
                const payload = JSON.parse(atob(token.split('.')[1]));

                // Check for token expiration.
                if (payload.exp * 1000 < Date.now()) {
                    console.log("Token expired, removing.");
                    sessionStorage.removeItem('token'); // Remove expired token.
                    setUser(null); // Clear user data.
                } else {
                    // Correctly set the user object with all relevant userDetails properties based on role.
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
                            year: payload.userDetails.year, // Capture year for student
                        }),
                        ...(payload.role === 'teacher' && {
                            teacher_id: payload.userDetails.teacher_id,
                            department: payload.userDetails.department,
                            subjects: payload.userDetails.subjects, // Ensure 'subjects' is captured for teachers
                        }),
                        // Admin-specific fields can be added here if needed from context.
                    });
                }
            } catch (error) {
                // Handle errors during token decoding (e.g., malformed token).
                console.error("Failed to decode token, removing.", error);
                sessionStorage.removeItem('token');
                setUser(null);
            }
        }
        setLoading(false); // Authentication check is complete.
    }, []); // Empty dependency array ensures this effect runs only once on mount.

    // Derived state: true if a user object exists, false otherwise.
    const isAuthenticated = !!user;

    // The value provided by this context to its consumers.
    const value = {
        user,
        isAuthenticated,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {/* Render children only after the initial loading check is complete */}
            {!loading && children}
        </AuthContext.Provider>
    );
};
