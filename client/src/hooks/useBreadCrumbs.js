import { useLocation } from 'react-router-dom';
import { useBreadcrumbContext } from '../contexts/BreadcrumbContext';

// Default mapping of URL path segments to human-readable breadcrumb names.
// This serves as a fallback for routes not explicitly handled by custom breadcrumbs.
const breadcrumbNameMap = {
    'dashboard': 'Dashboard',
    'teacher-dashboard': 'Teacher Dashboard',
    'admin-dashboard': 'Admin Dashboard',
    'assessments': 'Assessments',
    'grades': 'Grades',
    'study-material': 'Study Materials',
    'courses': 'Courses',
    'course': 'Course Details',
    'results': 'Results',
    'instructions': 'Instructions',
    'assessment': 'Take Assessment',
    'questions': 'Questions',
    'add-question': 'Create Assessment',
    'question-bank': 'Question Bank',
    'add-study-material': 'Add Study Material',
    'date-wise-report': 'Date-Wise Report',
    'assessment-results': 'Assessment Results',
    'admin-access-assessment': 'All Assessments',
    'add-notification': 'Add Notification',
    'all-notification': 'All Notifications',
    'add-user': 'Add User',
    'analytics': 'Analytics',
};

/**
 * Custom hook for generating breadcrumbs based on the current URL path.
 * It prioritizes custom breadcrumbs set by pages via `BreadcrumbContext`
 * and falls back to automatically generating them from URL segments using a predefined map.
 *
 * @returns {Array<object>} An array of breadcrumb objects, each with `name` and `path` properties.
 */
const useBreadcrumbs = () => {
    const location = useLocation(); // Hook to get the current URL location object.
    const { customCrumbs } = useBreadcrumbContext(); // Access custom breadcrumbs from context.

    // --- Strategy 1: Use Custom Breadcrumbs if they are set by a specific page. ---
    // If `customCrumbs` array is not empty, it means a page has explicitly defined its breadcrumbs.
    if (customCrumbs && customCrumbs.length > 0) {
        // Always include a "Home" crumb at the beginning for consistency.
        return [{ name: 'Home', path: '/' }, ...customCrumbs];
    }

    // --- Strategy 2: Fallback to automatic generation from URL if no custom crumbs are set. ---
    // Split the pathname into segments and filter out any empty strings (e.g., from leading/trailing slashes).
    const pathnames = location.pathname.split('/').filter(x => x);

    // Map each path segment to a breadcrumb object.
    const breadcrumbs = pathnames.map((value, index) => {
        // Construct the full path for the current segment.
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        // Get the display name from the predefined map, or format it from the value as a fallback.
        const name = breadcrumbNameMap[value] || value.replace(/-/g, ' ');
        return { name, path: to };
    });

    // Always include a "Home" crumb at the beginning for consistency.
    return [{ name: 'Home', path: '/' }, ...breadcrumbs];
};

export default useBreadcrumbs;
