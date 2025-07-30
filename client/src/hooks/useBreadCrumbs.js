import { useLocation } from 'react-router-dom';
import { useBreadcrumbContext } from '../contexts/BreadcrumbContext';

// The default name mapping remains as a fallback.
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

const useBreadcrumbs = () => {
    const location = useLocation();
    const { customCrumbs } = useBreadcrumbContext();

    // --- STRATEGY 1: Use Custom Breadcrumbs if they are set ---
    // The `customCrumbs` array will not be empty if a page has used `setCrumbs`.
    if (customCrumbs && customCrumbs.length > 0) {
        // We still add the "Home" crumb for consistency.
        return [{ name: 'Home', path: '/' }, ...customCrumbs];
    }

    // --- STRATEGY 2: Fallback to automatic generation from URL ---
    const pathnames = location.pathname.split('/').filter(x => x);

    const breadcrumbs = pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        // Use the map or format the name nicely as a fallback.
        const name = breadcrumbNameMap[value] || value.replace(/-/g, ' ');
        return { name, path: to };
    });

    return [{ name: 'Home', path: '/' }, ...breadcrumbs];
};

export default useBreadcrumbs;