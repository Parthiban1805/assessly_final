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
import { IoAnalytics } from 'react-icons/io5';
import { useLocation } from 'react-router-dom';

const NavigationLinks = ({ user, isCollapsed = false, onLinkClick = () => {} }) => {
    const location = useLocation();

    const handleNavigation = (path) => {
        onLinkClick(); // This will close the mobile menu if passed
        window.location.href = path;
    };

    const isPathActive = (path) => {
        if (location.pathname === path) return true;
        if (path === '/assessments' && location.pathname.startsWith('/assessment')) return true;
        if (path === '/grades' && location.pathname.startsWith('/results')) return true;
        if (path === '/study-material' && location.pathname.includes('study-material')) return true;
        return location.pathname.startsWith(`${path}/`) && path !== '/';
    };

    const NavLink = ({ to, icon, text, activePath }) => (
        <a
            href={to}
            onClick={(e) => {
                e.preventDefault();
                handleNavigation(to);
            }}
            title={isCollapsed ? text : undefined}
            className={`
                flex items-center rounded-lg py-2.5 my-1 text-sm font-medium transition-colors duration-200 whitespace-nowrap
                ${isCollapsed ? 'w-full px-3 justify-center' : 'mx-2 px-4'}
                ${
                    isPathActive(activePath || to)
                        ? 'bg-slate-100 text-blue-600'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }
            `}
        >
            {React.cloneElement(icon, {
                size: 18,
                strokeWidth: 2,
            })}
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

    const studentLinks = (
        <>
            <NavLink
                to="/dashboard"
                icon={<LayoutDashboard />}
                text="Dashboard"
            />
            <NavLink
                to="/assessments"
                icon={<BookOpenCheck />}
                text="Assessments"
                activePath="/assessments"
            />
            <NavLink
                to="/grades"
                icon={<GraduationCap />}
                text="Grades"
                activePath="/grades"
            />
            <NavLink
                to="/study-material"
                icon={<NotebookText />}
                text="Study Material"
            />
        </>
    );

    const teacherLinks = (
        <>
            <NavLink
                to="/teacher-dashboard"
                icon={<LayoutDashboard />}
                text="Dashboard"
            />
            <NavLink
                to="/add-question"
                icon={<ClipboardPlus />}
                text="Add Question"
            />
            <NavLink
                to="/question-bank"
                icon={<Library />}
                text="Question Bank"
            />
            <NavLink
                to="/add-study-material"
                icon={<BookCopy />}
                text="Study Material"
            />
            <NavLink
                to="/date-wise-report"
                icon={<GraduationCap />}
                text="Date Wise Marks"
            />
            <NavLink
                to="/assessment-results"
                icon={<ChartNoAxesColumnDecreasingIcon />}
                text="Assessments & Results"
            />
            <NavLink
                to="/analytics"
                icon={<IoAnalytics />}
                text="Analytics"
            />
        </>
    );

    const adminLinks = (
        <>
            <NavLink
                to="/admin-dashboard"
                icon={<LayoutDashboard />}
                text="Dashboard"
            />
            <NavLink
                to="/admin-access-assessment"
                icon={<BookOpenCheck />}
                text="Assessment"
            />
            <NavLink
                to="/add-notification"
                icon={<BellPlus />}
                text="Add Notification"
            />
            <NavLink
                to="/all-notification"
                icon={<Bell />}
                text="Notifications"
            />
            <NavLink
                to="/add-user"
                icon={<UserPlus />}
                text="Add Bulk Users"
            />
            <NavLink
                to="/manage-users"
                icon={<UserCog2Icon />}
                text="Manage Users"
            />
        </>
    );

    return (
        <>
            {user?.role === 'student' && studentLinks}
            {user?.role === 'teacher' && teacherLinks}
            {user?.role === 'admin' && adminLinks}
        </>
    );
};

export default NavigationLinks;
