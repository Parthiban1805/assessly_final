import { GoogleLogin } from "@react-oauth/google";
import axios from 'axios';
import { Eye, EyeOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Still useful for other potential navigation
// The sodium and SECRET_KEY logic is no longer needed on the client-side
// if the token is stored directly. I'll remove it for simplification.

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for saved email if user had checked "Remember me" before
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // THE FIX: This function now uses window.location.href for navigation,
  // which forces a page reload and ensures a clean state for the authenticated app.
  const handleAuth = (token, userDetails) => {
    // 1. Store the raw token.
    sessionStorage.setItem('token', token);
    
    // 2. Handle remembered email.
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    // 3. Determine the destination path.
    let destination = '/'; // Default to root, which will redirect via RoleBasedRedirect
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
        setMessage('Unknown role. Please contact support.');
        setMessageType('error');
        setIsLoading(false); // Stop loading on error
        return; // Exit if role is unknown
    }
    
    // 4. Force a full page navigation and reload.
    // This solves the bug of `setIsLoading(false)` not being called.
    window.location.href = destination;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(''); // Clear previous messages
    
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      const { token, userDetails } = res.data;
      
      setMessage("Login successful! Redirecting...");
      setMessageType('success');

      // Let handleAuth manage the final navigation.
      handleAuth(token, userDetails);
    } catch (err) {
      console.error("❌ Login error:", err);
      setMessage(err.response?.data?.msg || 'Login failed. Please check your credentials.');
      setMessageType('error');
      setIsLoading(false); // Ensure loading stops on error
    }
  };

 const handleGoogleLogin = async (response) => {
    setIsLoading(true);
    setMessage(''); // Clear previous messages
    const jwtToken = response.credential;
    const payload = JSON.parse(atob(jwtToken.split(".")[1]));
    const userData = {
      email: payload.email,
      name: payload.name,
      photo_url: payload.picture,
    };
  
    try {
      const res = await axios.post("http://localhost:5000/api/auth/google-login", userData);
      const { token, userDetails } = res.data;

      setMessage("Google login successful! Redirecting...");
      setMessageType('success');
      
      handleAuth(token, userDetails);

    }  catch (error) {
      console.error("❌ Google login error:", error);
      setMessage(error.response?.data?.msg || 'Google login failed. Please try again.');
      setMessageType('error');
      setIsLoading(false); // Ensure loading stops on error
    }
  };

  const dismissMessage = () => {
    setMessage('');
  };
  
  const alertStyles = {
    error: 'bg-red-50 text-red-800 border-red-300',
    success: 'bg-green-50 text-green-800 border-green-300',
    info: 'bg-blue-50 text-blue-800 border-blue-300',
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-sm bg-white p-6 space-y-5 rounded-xl border border-slate-200">
        <div className="text-center">
            <h1 className="text-2xl font-medium text-slate-900">Welcome Back</h1>
            <p className="text-slate-500 mt-1.5 text-sm">Sign in to your account.</p>
        </div>

        {message && (
          <div className={`flex items-start justify-between p-3 rounded-md border text-sm ${alertStyles[messageType]}`}>
            <span className="font-medium">{message}</span>
            <button onClick={dismissMessage} className="text-current opacity-70 hover:opacity-100" aria-label="Dismiss message">
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
              <a href="/forgot-password" tabIndex={-1} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition">Forgot password?</a>
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
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                className="absolute right-3 text-slate-400 hover:text-slate-600 transition"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="relative flex items-center justify-center my-5">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="mx-4 flex-shrink text-xs font-medium text-slate-400 uppercase">OR</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>
        
        <div className="flex justify-center">
            <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => {
                    setMessage('Google Sign-In failed. Please try again.');
                    setMessageType('error');
                }}
                useOneTap
                theme="outline"
                size="medium"
                text="continue_with"
                shape="rectangular"
            />
        </div>
      </div>
    </div>
  );
};

export default Login;