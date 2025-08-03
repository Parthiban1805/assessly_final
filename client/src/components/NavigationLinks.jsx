import {
    Bell,
    BellPlus,
    BookCopy,
    BookOpenCheck,
    ChartNoAxesColumnDecreasingIcon,
    ClipboardPlus,
    GraduationCap,
    LayoutDashboard,
    Library,
    NotebookText,
    UserCog2Icon,
    UserPlus
} from 'lucide-react';
import React from 'react';
import { IoAnalytics } from 'react-icons/io5'; // Using react-icons for a specific icon
import { useLocation } from 'react-router-dom';

/**
 * NavigationLinks component renders a set of sidebar navigation links based on user role.
 * It dynamically highlights the active link based on the current URL path.
 *
 * @param {object} props - The component props.
 * @param {object} props.user - The user object containing role information.
 * @param {boolean} [props.isCollapsed=false] - If true, displays a compact version of the links (icons only).
 * @param {function} [props.onLinkClick=() => {}] - Callback fired when a link is clicked,
 *        useful for closing mobile menus.
 * @returns {JSX.Element} The set of navigation links.
 */
const NavigationLinks = ({ user, isCollapsed = false, onLinkClick = () => {} }) => {
    const location = useLocation(); // Hook to get the current URL location

    /**
     * Handles navigation to a new path.
     * Uses window.location.href to force a full page reload, ensuring a clean state.
     * @param {string} path - The destination URL path.
     */
    const handleNavigation = (path) => {
        onLinkClick(); // Trigger callback (e.g., close mobile menu)
        window.location.href = path; // Force full page reload for navigation
    };

    /**
     * Determines if a given path is active based on the current URL.
     * Supports exact matches and startsWith for parent routes.
     * @param {string} path - The path to check.
     * @returns {boolean} True if the path is active, false otherwise.
     */
    const isPathActive = (path) => {
        // Exact match
        if (location.pathname === path) return true;
        // Specific handling for assessment/grades/study-material to match sub-paths
        if (path === '/assessments' && location.pathname.startsWith('/assessment')) return true;
        if (path === '/grades' && location.pathname.startsWith('/results')) return true;
        if (path === '/study-material' && location.pathname.includes('study-material')) return true;
        // Generic startsWith match, avoiding root path matching all
        return location.pathname.startsWith(`${path}/`) && path !== '/';
    };

    /**
     * Helper component for individual navigation links.
     * @param {object} linkProps - Props for the individual link.
     * @param {string} linkProps.to - The URL path to navigate to.
     * @param {React.ReactElement} linkProps.icon - The Lucide React icon component.
     * @param {string} linkProps.text - The display text for the link.
     * @param {string} [linkProps.activePath] - Optional path to use for active state checking,
     *        if different from 'to'.
     * @returns {JSX.Element} A single navigation link.
     */
    const NavLink = ({ to, icon, text, activePath }) => (
        <a
            href={to}
            onClick={(e) => {
                e.preventDefault(); // Prevent default anchor behavior
                handleNavigation(to); // Use custom navigation handler
            }}
            title={isCollapsed ? text : undefined} // Tooltip for collapsed state
            className={`
                flex items-center rounded-lg py-2.5 my-1 text-sm font-medium transition-colors duration-200 whitespace-nowrap
                ${isCollapsed ? 'w-full px-3 justify-center' : 'mx-2 px-4'}
                ${
                    isPathActive(activePath || to)
                        ? 'bg-slate-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' // Active link style
                        : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-gray-700 dark:hover:text-white' // Inactive link style
                }
            `}
        >
            {/* Clone icon to pass consistent size and strokeWidth props */}
            {React.cloneElement(icon, {
                size: 18,
                strokeWidth: 2,
                // Inherit text color from parent for icons, no specific dark styles needed if currentColor works
            })}
            {/* Text label, hidden when collapsed */}
            <span
                className={`
                    transition-opacity duration-200
                    ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100 ml-2'}
                `}
            >
                {text}
            </span>
        </a>
    );

    // Links specific to the 'student' role
    const studentLinks = (
        <>
            <NavLink to="/dashboard" icon={<LayoutDashboard />} text="Dashboard" />
            <NavLink to="/assessments" icon={<BookOpenCheck />} text="Assessments" activePath="/assessments" />
            <NavLink to="/grades" icon={<GraduationCap />} text="Grades" activePath="/grades" />
            <NavLink to="/study-material" icon={<NotebookText />} text="Study Material" />
        </>
    );

    // Links specific to the 'teacher' role
    const teacherLinks = (
        <>
            <NavLink to="/teacher-dashboard" icon={<LayoutDashboard />} text="Dashboard" />
            <NavLink to="/add-question" icon={<ClipboardPlus />} text="Add Question" />
            <NavLink to="/question-bank" icon={<Library />} text="Question Bank" />
            <NavLink to="/add-study-material" icon={<BookCopy />} text="Study Material" />
            <NavLink to="/date-wise-report" icon={<GraduationCap />} text="Date Wise Marks" />
            <NavLink to="/assessment-results" icon={<ChartNoAxesColumnDecreasingIcon />} text="Assessments & Results" />
            <NavLink to="/analytics" icon={<IoAnalytics />} text="Analytics" />
        </>
    );

    // Links specific to the 'admin' role
    const adminLinks = (
        <>
            <NavLink to="/admin-dashboard" icon={<LayoutDashboard />} text="Dashboard" />
            <NavLink to="/admin-access-assessment" icon={<BookOpenCheck />} text="Assessment" />
            <NavLink to="/add-notification" icon={<BellPlus />} text="Add Notification" />
            <NavLink to="/all-notification" icon={<Bell />} text="Notifications" />
            <NavLink to="/add-user" icon={<UserPlus />} text="Add Bulk Users" />
            <NavLink to="/manage-users" icon={<UserCog2Icon />} text="Manage Users" />
        </>
    );

    // Render navigation links based on the authenticated user's role
    return (
        <>
            {user?.role === 'student' && studentLinks}
            {user?.role === 'teacher' && teacherLinks}
            {user?.role === 'admin' && adminLinks}
        </>
    );
};

export default NavigationLinks;
