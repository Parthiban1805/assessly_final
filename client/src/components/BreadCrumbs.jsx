import React from 'react';
import { Link } from 'react-router-dom';
import useBreadcrumbs from '../hooks/useBreadcrumbs';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = () => {
    const breadcrumbs = useBreadcrumbs();

    if (breadcrumbs.length <= 1) {
        return null; // Don't show on root dashboard pages
    }

    return (
        <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 sm:gap-2 text-sm text-slate-500">
                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                        <li key={crumb.path} className="flex items-center gap-1.5 sm:gap-2">
                            {index > 0 && <ChevronRight size={16} className="text-slate-400" />}
                            <a 
                                href={crumb.path} 
                                className={`flex items-center gap-2 transition-colors capitalize
                                    ${isLast ? 'text-slate-700 font-semibold pointer-events-none' : 'hover:text-blue-600'}`
                                }
                            >
                                {/* {index === 0 && <Home size={16} />} */}
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