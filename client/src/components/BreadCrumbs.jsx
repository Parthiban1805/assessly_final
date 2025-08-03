import React from 'react';
import { ChevronRight } from 'lucide-react';
import useBreadcrumbs from '../hooks/useBreadcrumbs'; // Custom hook to generate breadcrumb paths

/**
 * Breadcrumbs component for navigation.
 * Displays the current path within the application hierarchy.
 *
 * @returns {JSX.Element|null} The breadcrumbs navigation or null if only one crumb.
 */
const Breadcrumbs = () => {
    const breadcrumbs = useBreadcrumbs(); // Fetch breadcrumb data from the custom hook

    // Do not render breadcrumbs if there is only one item (typically 'Home' or 'Dashboard').
    if (breadcrumbs.length <= 1) {
        return null;
    }

    return (
        <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 sm:gap-2 text-sm text-slate-500 dark:text-gray-400">
                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1; // Check if it's the last crumb
                    return (
                        <li key={crumb.path} className="flex items-center gap-1.5 sm:gap-2">
                            {/* Render a separator for all but the first crumb. */}
                            {index > 0 && <ChevronRight size={16} className="text-slate-400 dark:text-gray-500" />}
                            <a
                                href={crumb.path}
                                // Apply styles based on whether it's the last crumb or a clickable link.
                                className={`flex items-center gap-2 transition-colors capitalize
                                    ${isLast
                                        ? 'text-slate-700 dark:text-white font-semibold pointer-events-none'
                                        : 'hover:text-blue-600 dark:hover:text-blue-400'
                                    }`
                                }
                            >
                                {/* Removed Home icon as per existing commented code, assuming it's not desired */}
                                <span>{crumb.name}</span>
                            </a>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
