import axios from 'axios';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const { name, email, password } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
        await axios.post('http://localhost:5000/api/auth/register', {
            name,
            email,
            password
        });
        setMessage('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
        setMessage('Registration failed: ' + (err.response?.data?.msg || err.message));
        setIsLoading(false);
        }
    };

    const isSuccessMessage = message.includes('successful');

    const alertStyles = isSuccessMessage
        ? 'bg-green-50 text-green-800 border-green-300'
        : 'bg-red-50 text-red-800 border-red-300';


    return (
        <div className="flex items-center justify-center min-h-screen w-full bg-slate-50 p-4 font-sans">
        <div className="w-full max-w-sm bg-white p-6 space-y-5 rounded-xl shadow-lg border border-slate-200">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900">Create an Account</h1>
                <p className="text-slate-500 mt-1.5 text-sm">Get started with Prodify for free.</p>
            </div>

            {message && (
            <div className={`p-3 rounded-md border text-sm font-medium ${alertStyles}`}>
                <span>{message}</span>
            </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</label>
                <input
                id="name"
                type="text"
                placeholder="Enter your name"
                name="name"
                value={name}
                onChange={onChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
                <input
                id="email"
                type="email"
                placeholder="name@example.com"
                name="email"
                value={email}
                onChange={onChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
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
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
            </div>
            
            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-sm bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
            </form>

            <div className="text-center text-sm text-slate-600 pt-2">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-800 transition">
                    Sign In
                </Link>
            </div>
        </div>
        </div>
    );
};

export default Register;