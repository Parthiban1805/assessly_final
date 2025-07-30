import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import placeholder from "../assets/placeholder1.png";
import NavigationLinks from '../components/NavigationLinks';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ isCollapsed, onToggle }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const userImageRef = useRef(null);
    
    const logout = () => {
        sessionStorage.removeItem("token");
        window.location.href = '/login';
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isDropdownOpen &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                !userImageRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

    return (
        <aside 
            className={`fixed top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50
                    transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'w-[72px] px-1' : 'w-[260px]'}`}
        >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 h-16 flex-shrink-0">
                <h3 className={`text-xl font-medium text-slate-800 transition-all duration-200 ${isCollapsed ? 'hidden' : 'opacity-100'}`}>
                    Assessly
                </h3>
                <button 
                    onClick={onToggle} 
                    className="p-1.5 rounded-md text-slate-500 cursor-pointer hover:bg-slate-100 "
                >
                    {isCollapsed ? <ChevronsRight size={20}/> : <ChevronsLeft size={20}/>}
                </button>
            </div>

            <nav className="flex-1 py-4 overflow-y-auto">
                <NavigationLinks user={user} isCollapsed={isCollapsed} />
            </nav>

            <div className="p-3 border-t border-slate-200 flex-shrink-0">
                {user && (
                    isCollapsed ? (
                        <div className="relative flex justify-center">
                            <button ref={userImageRef} onClick={() => setDropdownOpen(!isDropdownOpen)}>
                                <img 
                                    src={user.photo_url || placeholder} 
                                    alt={user.name} 
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            </button>
                            {isDropdownOpen && (
                                <div 
                                    ref={dropdownRef}
                                    className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-md shadow-lg border border-slate-200 z-10 animate-fade-in-up"
                                >
                                    <div className="flex items-center gap-3 p-3 border-b border-slate-200">
                                        <img 
                                            src={user.photo_url || placeholder} 
                                            alt={user.name} 
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={logout} 
                                        className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                    >
                                        <LogOut className="mr-2" size={16} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <img 
                                src={user.photo_url || placeholder} 
                                alt={user.name} 
                                className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="ml-3 overflow-hidden">
                                <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                            <button 
                                onClick={logout} 
                                title="Logout" 
                                className="ml-auto p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-red-600"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    )
                )}
            </div>
        </aside>
    );
};

export default Sidebar;