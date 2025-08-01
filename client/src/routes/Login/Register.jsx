import axios from 'axios';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * Register component provides a form for new user registration.
 * It handles form submission, displays success/error messages, and redirects to login on success.
 *
 * @returns {JSX.Element} The registration form UI.
 */
const Register = () => {
    // State to hold form input data.
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    // State for displaying messages to the user (e.g., "Registration successful!").
    const [message, setMessage] = useState('');
    // State to indicate if an API request is in progress.
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate(); // Hook for programmatic navigation.

    // Destructure formData for easier access.
    const { name, email, password } = formData;

    /**
     * Handles changes to form input fields, updating the formData state.
     * @param {Event} e - The change event from the input element.
     */
    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    /**
     * Handles the form submission for user registration.
     * Sends registration data to the backend API and provides feedback.
     *
     * @param {Event} e - The form submission event.
     */
    const onSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Start loading state.
        setMessage(''); // Clear any previous messages.
        try {
            // Send POST request to the registration endpoint.
            await axios.post(`${API_BASE_URL}/auth/register`, {
                name,
                email,
                password
            });
            setMessage('Registration successful! Redirecting to login...');
            // Redirect to login page after a short delay for user to read the message.
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            console.error("Registration error:", err);
            // Display error message from backend or a generic fallback.
            setMessage('Registration failed: ' + (err.response?.data?.msg || err.message));
            setIsLoading(false); // Stop loading on error.
        }
    };

    // Determine message style based on whether it's a success message.
    const isSuccessMessage = message.includes('successful');
    const alertStyles = isSuccessMessage
        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700'
        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700';

    return (
        <div className="flex items-center justify-center min-h-screen w-full bg-slate-50 dark:bg-gray-900 p-4 font-sans">
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 p-6 space-y-5 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create an Account</h1>
                <p className="text-slate-500 dark:text-gray-400 mt-1.5 text-sm">Get started with Assessly for free.</p>
            </div>

            {/* Dynamic message display (success/error) */}
            {message && (
            <div className={`p-3 rounded-md border text-sm font-medium ${alertStyles}`}>
                <span>{message}</span>
            </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
            {/* Full Name Input */}
            <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-gray-200">Full Name</label>
                <input
                id="name"
                type="text"
                placeholder="Enter your name"
                name="name"
                value={name}
                onChange={onChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-md placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-gray-200">Email</label>
                <input
                id="email"
                type="email"
                placeholder="name@example.com"
                name="email"
                value={email}
                onChange={onChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-md placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-gray-200">Password</label>
                <input
                id="password"
                type="password"
                placeholder="Create a strong password"
                name="password"
                value={password}
                onChange={onChange}
                minLength="6"
                required
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-md placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
            </div>

            {/* Create Account Button */}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-sm bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:bg-blue-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
            </form>

            {/* Link to Login page */}
            <div className="text-center text-sm text-slate-600 dark:text-gray-300 pt-2">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">
                    Sign In
                </Link>
            </div>
        </div>
        </div>
    );
};

export default Register;
