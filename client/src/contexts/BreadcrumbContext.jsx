import React, { createContext, useContext, useState, useCallback } from 'react';

const BreadcrumbContext = createContext(null);

export const useBreadcrumbContext = () => {
    const context = useContext(BreadcrumbContext);
    if (!context) {
        throw new Error('useBreadcrumbContext must be used within a BreadcrumbProvider');
    }
    return context;
};

export const BreadcrumbProvider = ({ children }) => {
    // This state will hold the custom breadcrumbs set by a page.
    // e.g., [{ name: 'My Custom Page', path: '/my/custom/page' }]
    const [customCrumbs, setCustomCrumbs] = useState([]);

    // A memoized function for pages to call to set their breadcrumbs.
    const setCrumbs = useCallback((crumbs) => {
        setCustomCrumbs(crumbs);
    }, []);

    const value = { customCrumbs, setCrumbs };

    return (
        <BreadcrumbContext.Provider value={value}>
            {children}
        </BreadcrumbContext.Provider>
    );
};