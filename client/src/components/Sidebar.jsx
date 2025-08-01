import { ChevronsLeft, ChevronsRight, LogOut, Monitor, Moon, Sun } from 'lucide-react'; // Import necessary Lucide icons
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import placeholder from "../assets/placeholder1.png"; // Placeholder image for user avatar
import { useAuth } from '../contexts/AuthContext'; // Context for user authentication
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme hook for theme management
import NavigationLinks from './NavigationLinks'; // Component for sidebar navigation links

/**
 * Sidebar component for application navigation and user actions.
 * It can be collapsed/expanded and includes user profile details and a theme selector popup.
 *
 * @param {object} props - Component props.
 * @param {boolean} props.isCollapsed - Determines if the sidebar is in a collapsed state.
 * @param {function} props.onToggle - Callback function to toggle the sidebar's collapsed state.
 * @returns {JSX.Element} The sidebar UI.
 */
const Sidebar = ({ isCollapsed, onToggle }) => {
    const { user } = useAuth(); // Get authenticated user details from AuthContext
    const { theme, setTheme, getThemeIcon, getThemeLabel } = useTheme(); // Get theme state and helpers from ThemeContext
    const navigate = useNavigate(); // Navigation hook for programmatic redirects
    const location = useLocation(); // Hook to get current location/path

    const [isDropdownOpen, setDropdownOpen] = useState(false); // State for controlling the user dropdown menu's visibility
    const [isThemePopupOpen, setThemePopupOpen] = useState(false); // State for controlling the theme popup's visibility
    const [selectedItem, setSelectedItem] = useState(location.pathname); // State for tracking selected navigation item
    const dropdownRef = useRef(null); // Ref for the dropdown menu element, used for outside click detection
    const userImageRef = useRef(null); // Ref for the user image button, also used for outside click detection
    const themePopupRef = useRef(null); // Ref for the theme popup element
    const themeButtonRef = useRef(null); // Ref for the theme button

    // Theme options with their respective icons and labels
    const themeOptions = [
        { value: 'light', label: 'Light', icon: <Sun size={16} /> },
        { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
        { value: 'system', label: 'System', icon: <Monitor size={16} /> }
    ];

    /**
     * Handles user logout by clearing the session token and forcing a full page reload.
     * This ensures all application state is reset for a clean logout.
     */
    const logout = () => {
        sessionStorage.removeItem("token"); // Remove authentication token
        window.location.href = '/login'; // Redirect to login and force full reload
    };

    /**
     * Handles navigation item selection
     * @param {string} path - The path/route to navigate to
     * @param {Event} event - The click event
     */
    const handleItemSelect = (path, event) => {
        event.preventDefault();
        setSelectedItem(path);
        navigate(path);
        
        // Close dropdown if in collapsed mode
        if (isCollapsed && isDropdownOpen) {
            setDropdownOpen(false);
        }
    };

    /**
     * Handles theme selection from the popup
     * Uses the proper theme context to update both state and DOM
     * @param {string} selectedTheme - The selected theme value
     */
    const handleThemeSelect = (selectedTheme) => {
        // Use the context's setTheme function which handles both state and DOM updates
        setTheme(selectedTheme);
        setThemePopupOpen(false);
    };

    /**
     * Effect hook to update selected item when location changes
     */
    useEffect(() => {
        setSelectedItem(location.pathname);
    }, [location.pathname]);

    /**
     * Effect hook to set up and clean up event listeners for detecting clicks outside
     * the user dropdown menu and theme popup. If a click occurs outside, they are closed.
     */
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if dropdown is open and the click is outside both the dropdown and its toggle button
            if (
                isDropdownOpen &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                userImageRef.current && // Ensure ref current exists before checking contains
                !userImageRef.current.contains(event.target)
            ) {
                setDropdownOpen(false); // Close the dropdown
            }

            // Check if theme popup is open and the click is outside both the popup and its toggle button
            if (
                isThemePopupOpen &&
                themePopupRef.current &&
                !themePopupRef.current.contains(event.target) &&
                themeButtonRef.current &&
                !themeButtonRef.current.contains(event.target)
            ) {
                setThemePopupOpen(false); // Close the theme popup
            }
        };
        document.addEventListener('mousedown', handleClickOutside); // Attach event listener
        // Cleanup function to remove the event listener when the component unmounts or dependencies change
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen, isThemePopupOpen]); // Dependency array: effect re-runs when either popup state changes

    return (
        <aside
            className={`fixed top-0 left-0 h-screen bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 flex flex-col z-50
                    transition-all duration-300 ease-in-out select-none
                    ${isCollapsed ? 'w-[72px] px-1' : 'w-[260px]'}`}
        >
            {/* Sidebar Header: Application Title and Collapse Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-gray-700 h-16 flex-shrink-0">
                {/* Assessly title, visible only when sidebar is expanded */}
                <h3 
                    className={`text-xl font-medium text-slate-800 dark:text-white transition-all duration-200 cursor-default ${isCollapsed ? 'hidden' : 'opacity-100'}`}
                    onClick={(e) => e.preventDefault()}
                >
                    Assessly
                </h3>
                {/* Button to toggle sidebar's collapsed state */}
                <button
                    onClick={onToggle}
                    className="p-1.5 rounded-md text-slate-500 dark:text-gray-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors duration-200 active:scale-95"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <ChevronsRight size={20}/> : <ChevronsLeft size={20}/>}
                </button>
            </div>

            {/* Main Navigation Area: Contains dynamic links based on user role */}
            <nav className="flex-1 py-4 overflow-y-auto">
                <NavigationLinks 
                    user={user} 
                    isCollapsed={isCollapsed} 
                    selectedItem={selectedItem}
                    onItemSelect={handleItemSelect}
                />
            </nav>

            {/* User Profile, Logout, and Theme Toggle Section */}
            <div className="p-3 border-t border-slate-200 dark:border-gray-700 flex-shrink-0">
                {user && (
                    isCollapsed ? (
                        /* Collapsed State: Displays only user image, with a dropdown on click */
                        <div className="relative flex justify-center">
                            <button 
                                ref={userImageRef} 
                                onClick={() => setDropdownOpen(!isDropdownOpen)} 
                                aria-label="Open user menu"
                                className="transition-transform duration-200 active:scale-95 rounded-full"
                            >
                                <img
                                    src={user.photo_url || placeholder}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent"
                                />
                            </button>
                            {isDropdownOpen && (
                                <div
                                    ref={dropdownRef}
                                    className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-slate-200 dark:border-gray-600 z-10 animate-fade-in-up"
                                >
                                    {/* Dropdown Header: User Name and Email */}
                                    <div className="flex items-center gap-3 p-3 border-b border-slate-200 dark:border-gray-600 select-text">
                                        <img
                                            src={user.photo_url || placeholder}
                                            alt={user.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{user.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-gray-400">{user.email}</p>
                                        </div>
                                    </div>
                                    {/* Theme Toggle within dropdown for collapsed state */}
                                    <div className="relative">
                                        <button
                                            ref={themeButtonRef}
                                            onClick={() => setThemePopupOpen(!isThemePopupOpen)}
                                            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer transition-colors duration-200 active:bg-slate-200 dark:active:bg-gray-500"
                                            aria-label="Open theme selector"
                                        >
                                            {getThemeIcon(theme)}<span className="ml-2">Theme</span>
                                        </button>
                                        {/* Theme Popup for collapsed state */}
                                        {isThemePopupOpen && (
                                            <div
                                                ref={themePopupRef}
                                                className="absolute left-full top-0 ml-1 w-36 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-slate-200 dark:border-gray-600 z-20 animate-fade-in-up"
                                            >
                                                {themeOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => handleThemeSelect(option.value)}
                                                        className={`flex items-center w-full px-3 py-2 text-sm transition-colors duration-200 ${
                                                            theme === option.value
                                                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                                                                : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-gray-600 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        {option.icon}
                                                        <span className="ml-2">{option.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Logout Button within the dropdown */}
                                    <button
                                        onClick={logout}
                                        className="flex items-center w-full px-3 py-2 rounded-b-md text-sm text-slate-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-transparent dark:hover:text-red-400 cursor-pointer transition-colors duration-200 active:bg-red-100 dark:active:bg-red-800"
                                        aria-label="Logout"
                                    >
                                        <LogOut className="mr-2" size={16} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Expanded State: Displays user image, name, email, logout button, and theme toggle */
                        <div className="flex items-center justify-between">
                            <img
                                src={user.photo_url || placeholder}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200 cursor-pointer"
                                onClick={() => setDropdownOpen(!isDropdownOpen)}
                            />
                            <div className="ml-3 overflow-hidden flex-1 select-text">
                                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{user.name}</p>
                                <p className="text-xs text-slate-500 dark:text-gray-400">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                {/* Theme Toggle for expanded state */}
                                <div className="relative">
                                    <button
                                        ref={themeButtonRef}
                                        onClick={() => setThemePopupOpen(!isThemePopupOpen)}
                                        title="Select theme"
                                        className="p-2 rounded-md text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-800 dark:hover:text-white transition-all duration-200 active:scale-95 active:bg-slate-200 dark:active:bg-gray-600"
                                        aria-label="Open theme selector"
                                    >
                                        {getThemeIcon(theme)}
                                    </button>
                                    {/* Theme Popup for expanded state */}
                                    {isThemePopupOpen && (
                                        <div
                                            ref={themePopupRef}
                                            className="absolute bottom-full right-0 mb-2 w-36 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-slate-200 dark:border-gray-600 z-20 animate-fade-in-up"
                                        >
                                            {themeOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => handleThemeSelect(option.value)}
                                                    className={`flex items-center w-full px-3 py-2 text-sm transition-colors duration-200 first:rounded-t-md last:rounded-b-md ${
                                                        theme === option.value
                                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                                                            : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-gray-600 dark:hover:text-white'
                                                    }`}
                                                >
                                                    {option.icon}
                                                    <span className="ml-2">{option.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Logout Button */}
                                <button
                                    onClick={logout}
                                    title="Logout"
                                    className="p-2 rounded-md text-slate-500 dark:text-gray-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400 transition-all duration-200 active:scale-95 active:bg-red-50 dark:active:bg-red-900"
                                    aria-label="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>
        </aside>
    );
};

export default Sidebar;