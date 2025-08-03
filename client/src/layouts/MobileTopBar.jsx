import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Sun, Moon, Monitor } from 'lucide-react'; // Added theme icons
import { useAuth } from '../contexts/AuthContext'; // Authentication context hook
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme hook for theme management
import NavigationLinks from '../components/NavigationLinks'; // Navigation links component
import placeholder from "../assets/placeholder1.png"; // Placeholder for user avatar

/**
 * MobileTopBar component provides a responsive top bar for mobile devices.
 * It includes a hamburger menu to toggle a slide-out navigation drawer and theme toggle.
 *
 * @returns {JSX.Element} The mobile top bar UI and slide-out navigation.
 */
const MobileTopBar = () => {
    // State to control the visibility of the mobile navigation menu (drawer).
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isThemePopupOpen, setThemePopupOpen] = useState(false); // State for controlling the theme popup's visibility
    const { user } = useAuth(); // Get authenticated user details from AuthContext.
    const { theme, setTheme, getThemeIcon } = useTheme(); // Get theme state and helpers from ThemeContext
    const navigate = useNavigate(); // Navigation hook for programmatic redirects.
    
    const themePopupRef = useRef(null); // Ref for the theme popup element
    const themeButtonRef = useRef(null); // Ref for the theme button

    // Theme options with their respective icons and labels
    const themeOptions = [
        { value: 'light', label: 'Light', icon: <Sun size={16} /> },
        { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
        { value: 'system', label: 'System', icon: <Monitor size={16} /> }
    ];

    /**
     * Toggles the visibility of the mobile navigation menu.
     */
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    /**
     * Handles user logout, clears session token, and redirects to the login page.
     */
    const logout = () => {
        sessionStorage.removeItem("token"); // Remove authentication token.
        navigate("/login"); // Redirect to login page.
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
     * Effect hook to set up and clean up event listeners for detecting clicks outside
     * the theme popup. If a click occurs outside, it is closed.
     */
    useEffect(() => {
        const handleClickOutside = (event) => {
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
    }, [isThemePopupOpen]); // Dependency array: effect re-runs when popup state changes

    return (
        <>
            {/* The Fixed Top Bar for Mobile */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between px-4 z-[999]">
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">Assessly</h1>
                
                {/* Right side controls: Theme toggle and Menu button */}
                <div className="flex items-center gap-2">
                    {/* Theme Toggle Button */}
                    <div className="relative">
                        <button
                            ref={themeButtonRef}
                            onClick={() => setThemePopupOpen(!isThemePopupOpen)}
                            className="p-2 rounded-md text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-800 dark:hover:text-white transition-all duration-200 active:scale-95"
                            aria-label="Open theme selector"
                            title="Select theme"
                        >
                            {getThemeIcon(theme)}
                        </button>
                        
                        {/* Theme Popup */}
                        {isThemePopupOpen && (
                            <div
                                ref={themePopupRef}
                                className="absolute top-full right-0 mt-2 w-36 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-slate-200 dark:border-gray-600 z-[1002] animate-fade-in-up"
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

                    {/* Hamburger Menu Button */}
                    <button 
                        onClick={toggleMenu} 
                        className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors duration-200" 
                        aria-label="Open navigation menu"
                    >
                        <Menu size={24} className="text-slate-600 dark:text-gray-300" />
                    </button>
                </div>
            </header>

            {/* Overlay for when the mobile menu is open. Clicks on overlay close the menu. */}
            <div
                className={`md:hidden fixed inset-0 bg-black/40 z-[1000] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={toggleMenu}
                aria-hidden={!isMenuOpen} // Improve accessibility
            />

            {/* The Slide-out Navigation Drawer */}
            <aside
                className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 z-[1001] transition-transform duration-300 ease-in-out flex flex-col
                           ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Drawer Header: Menu Title and Close Button */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-gray-700 h-16">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Menu</h2>
                    <button onClick={toggleMenu} className="p-2" aria-label="Close navigation menu">
                        <X size={24} className="text-slate-600 dark:text-gray-300" />
                    </button>
                </div>

                {/* Navigation Links Area */}
                <div className="flex-1 py-4 overflow-y-auto">
                    {/* NavigationLinks component, passing a callback to close the menu on link click. */}
                    <NavigationLinks user={user} onLinkClick={() => setIsMenuOpen(false)} />
                </div>

                {/* User Profile Section at the bottom of the drawer */}
                <div className="p-2 border-t border-slate-200 dark:border-gray-700">
                    {user && (
                        <div className="flex items-center justify-between p-2">
                           <div className="flex items-center">
                             <img
                                src={user.photo_url || placeholder}
                                alt={user.name}
                                className="w-9 h-9 rounded-full object-cover border-2 border-slate-200 dark:border-gray-700"
                            />
                            <div className="ml-3">
                                <p className="text-sm font-semibold text-slate-700 dark:text-gray-200 truncate">{user.name}</p>
                                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                           </div>
                           {/* Logout button */}
                           <button onClick={logout} title="Logout" className="p-2 text-slate-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" aria-label="Logout">
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