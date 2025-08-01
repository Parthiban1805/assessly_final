import { GoogleLogin } from "@react-oauth/google";
import axios from 'axios';
import { Eye, EyeOff, X } from 'lucide-react'; // Icons for password visibility and message dismissal
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * Login component handles user authentication via email/password or Google OAuth.
 * It manages form state, displays messages, and redirects upon successful login.
 *
 * @returns {JSX.Element} The login form UI.
 */
const Login = () => {
  // State for email and password input fields.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // State for the "Remember me" checkbox.
  const [rememberMe, setRememberMe] = useState(false);
  // State for displaying user messages (e.g., success, error).
  const [message, setMessage] = useState('');
  // State for the type of message ('error', 'success', 'info') to apply appropriate styling.
  const [messageType, setMessageType] = useState('error');
  // State to indicate if an API request is in progress (e.g., during login).
  const [isLoading, setIsLoading] = useState(false);
  // State to toggle password visibility.
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); // Hook for programmatic navigation (though window.location.href is used for full reload).

  /**
   * Effect hook to check for a saved email in localStorage on component mount.
   * If found (from a previous "Remember me" selection), pre-fills the email field.
   */
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []); // Empty dependency array means this runs only once on mount.

  /**
   * Handles authentication success by storing the token, managing "remember me" preference,
   * and redirecting the user to their role-specific dashboard with a full page reload.
   * A full page reload ensures a clean state for the authenticated application.
   *
   * @param {string} token - The authentication JWT token received from the backend.
   * @param {object} userDetails - User details (including role) received from the backend.
   */
  const handleAuth = (token, userDetails) => {
    sessionStorage.setItem('token', token); // Store the JWT token in session storage.

    // Manage "Remember me" preference in localStorage.
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    // Determine the appropriate dashboard path based on user role.
    let destination = '/'; // Default fallback, should be handled by RoleBasedRedirect.
    switch (userDetails.role) {
      case 'student':
        destination = '/dashboard';
        break;
      case 'teacher':
        destination = '/teacher-dashboard';
        break;
      case 'admin':
        destination = '/admin-dashboard';
        break;
      default:
        // Handle unexpected roles.
        setMessage('Unknown role. Please contact support.');
        setMessageType('error');
        setIsLoading(false); // Stop loading on error.
        return; // Exit if role is unknown.
    }

    // Force a full page navigation and reload to ensure clean application state.
    window.location.href = destination;
  };

  /**
   * Handles the traditional email/password login form submission.
   * Sends credentials to the backend API and calls `handleAuth` on success.
   *
   * @param {Event} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Start loading state.
    setMessage(''); // Clear any previous messages.

    try {
      // Send login request to the backend.
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const { token, userDetails } = res.data;

      setMessage("Login successful! Redirecting...");
      setMessageType('success');

      handleAuth(token, userDetails); // Proceed with authentication handling.
    } catch (err) {
      console.log(email, password); // Log email and password for debugging (remove in production).
      console.error("❌ Login error:", err);
      // Display error message from backend or a generic fallback.
      setMessage(err.response?.data?.msg || 'Login failed. Please check your credentials.');
      setMessageType('error');
      setIsLoading(false); // Ensure loading stops on error.
    }
  };

 /**
  * Handles successful Google OAuth login.
  * Sends the Google JWT credential to the backend for verification and user authentication.
  *
  * @param {object} response - The response object from Google Login, containing the JWT credential.
  */
 const handleGoogleLogin = async (response) => {
    setIsLoading(true); // Start loading state.
    setMessage(''); // Clear any previous messages.

    const jwtToken = response.credential; // Google's JWT credential.
    // Decode the Google JWT to extract user data for the backend.
    const payload = JSON.parse(atob(jwtToken.split(".")[1]));
    const userData = {
      email: payload.email,
      name: payload.name,
      photo_url: payload.picture,
    };

    try {
      // Send Google user data to the backend for processing/authentication.
      const res = await axios.post(`${API_BASE_URL}/auth/google-login`, userData);
      const { token, userDetails } = res.data;

      setMessage("Google login successful! Redirecting...");
      setMessageType('success');

      handleAuth(token, userDetails); // Proceed with authentication handling.

    } catch (error) {
      console.error("❌ Google login error:", error);
      // Display error message from backend or a generic fallback.
      setMessage(error.response?.data?.msg || 'Google login failed. Please try again.');
      setMessageType('error');
      setIsLoading(false); // Ensure loading stops on error.
    }
  };

  /**
   * Dismisses the currently displayed message.
   */
  const dismissMessage = () => {
    setMessage('');
  };

  // Styles for different message types.
  const alertStyles = {
    error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-700',
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-slate-50 dark:bg-gray-900 p-4 font-sans">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 p-6 space-y-5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-md">
        <div className="text-center">
            <h1 className="text-2xl font-medium text-slate-900 dark:text-white">Welcome Back</h1>
            <p className="text-slate-500 dark:text-gray-400 mt-1.5 text-sm">Sign in to your account.</p>
        </div>

        {/* Dynamic message display (success/error) */}
        {message && (
          <div className={`flex items-start justify-between p-3 rounded-md border text-sm ${alertStyles[messageType]}`}>
            <span className="font-medium">{message}</span>
            <button onClick={dismissMessage} className="text-current opacity-70 hover:opacity-100" aria-label="Dismiss message">
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-gray-200">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-md placeholder-slate-400 dark:placeholder-gray-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-gray-200">Password</label>
              {/* Link to forgot password page */}
              <a href="/forgot-password" tabIndex={-1} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">Forgot password?</a>
            </div>
            <div className="relative flex items-center">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-md placeholder-slate-400 dark:placeholder-gray-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {/* Button to toggle password visibility */}
              <button
                type="button"
                className="absolute right-3 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:bg-blue-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Separator for alternative login methods */}
        <div className="relative flex items-center justify-center my-5">
          <div className="flex-grow border-t border-slate-200 dark:border-gray-700"></div>
          <span className="mx-4 flex-shrink text-xs font-medium text-slate-400 dark:text-gray-500 uppercase">OR</span>
          <div className="flex-grow border-t border-slate-200 dark:border-gray-700"></div>
        </div>

        {/* Google Login Button */}
        <div className="flex justify-center">
            <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => {
                    setMessage('Google Sign-In failed. Please try again.');
                    setMessageType('error');
                }}
                useOneTap // Attempts to sign in automatically if a Google session is detected.
                theme="outline" // Google button theme.
                size="medium" // Google button size.
                text="continue_with" // Google button text.
                shape="rectangular" // Google button shape.
            />
        </div>
      </div>
    </div>
  );
};

export default Login;
