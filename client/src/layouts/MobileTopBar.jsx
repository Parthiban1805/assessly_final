import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NavigationLinks from '../components/NavigationLinks';
import placeholder from "../assets/placeholder1.png";

const MobileTopBar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const logout = () => {
        sessionStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <>
            {/* The Fixed Top Bar */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-[999]">
                <h1 className="text-lg font-bold text-slate-800">Assessly</h1>
                <button onClick={toggleMenu} className="p-2">
                    <Menu size={24} className="text-slate-600" />
                </button>
            </header>

            {/* Overlay */}
            <div 
                className={`md:hidden fixed inset-0 bg-black/40 z-[1000] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} 
                onClick={toggleMenu}
            />

            {/* The Slide-out Drawer */}
            <aside 
                className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white z-[1001] transition-transform duration-300 ease-in-out flex flex-col
                           ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-200 h-16">
                    <h2 className="text-lg font-bold text-slate-800">Menu</h2>
                    <button onClick={toggleMenu} className="p-2">
                        <X size={24} className="text-slate-600" />
                    </button>
                </div>

                <div className="flex-1 py-4 overflow-y-auto">
                    <NavigationLinks user={user} onLinkClick={() => setIsMenuOpen(false)} />
                </div>
                
                {/* User Profile Section */}
                <div className="p-2 border-t border-slate-200">
                    {user && (
                        <div className="flex items-center justify-between p-2">
                           <div className="flex items-center">
                             <img 
                                src={user.photo_url || placeholder} 
                                alt={user.name} 
                                className="w-9 h-9 rounded-full object-cover border-2 border-slate-200"
                            />
                            <div className="ml-3">
                                <p className="text-sm font-semibold text-slate-700 truncate">{user.name}</p>
                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                           </div>
                           <button onClick={logout} title="Logout" className="p-2 text-slate-500 hover:text-red-600">
                                <LogOut size={20} />
                           </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};

export default MobileTopBar;