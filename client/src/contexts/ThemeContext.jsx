// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react'; // Import icons for theme options

// Define the ThemeContext with a default null value.
const ThemeContext = createContext(null);

/**
 * Custom hook to consume the Theme Context.
 * Throws an error if used outside of a ThemeProvider, ensuring proper context usage.
 * @returns {{
 *   theme: 'light' | 'dark' | 'system',
 *   setTheme: function,
 *   toggleTheme: function,
 *   getThemeIcon: function,
 *   getThemeLabel: function
 * }} An object containing the current theme, functions to toggle it, and helpers for UI.
 */
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

/**
 * Provides the current theme ('light', 'dark', or 'system') and a toggle function to its children components.
 * Manages the theme state, persists user preference in localStorage, and applies/removes the 'dark' class
 * to the document's <html> element for Tailwind CSS. It also handles system preference changes.
 *
 * @param {object} props - React props.
 * @param {React.ReactNode} props.children - The child components that will have access to the theme context.
 */
export const ThemeProvider = ({ children }) => {
    // Initialize theme state:
    // 1. Check localStorage for 'theme' preference.
    // 2. If not in localStorage, default to 'system'.
    const [theme, setTheme] = useState(() => {
        const storedTheme = localStorage.getItem('theme');
        return storedTheme || 'system';
    });

    /**
     * Applies or removes the 'dark' class on the document's <html> element
     * based on the current theme state and system preference.
     * @param {'light' | 'dark' | 'system'} currentTheme - The theme to apply.
     */
    const applyThemeToHtml = useCallback((currentTheme) => {
        const root = document.documentElement;
        // Listen for system theme changes if the current theme is 'system'
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

        if (currentTheme === 'dark') {
            root.classList.add('dark');
        } else if (currentTheme === 'light') {
            root.classList.remove('dark');
        } else { // currentTheme === 'system'
            // Apply 'dark' class based on system preference
            root.classList.toggle('dark', prefersDarkScheme.matches);
        }
    }, []);

    // Effect hook to synchronize the theme state with the DOM and localStorage.
    useEffect(() => {
        applyThemeToHtml(theme); // Apply theme on initial render and theme changes
        localStorage.setItem('theme', theme); // Persist theme preference

        // Set up listener for system theme changes ONLY if current theme is 'system'
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        const mediaQueryListener = (e) => {
            if (theme === 'system') {
                document.documentElement.classList.toggle('dark', e.matches);
            }
        };

        if (theme === 'system') {
            prefersDarkScheme.addEventListener('change', mediaQueryListener);
        }

        // Cleanup function for the media query listener
        return () => {
            prefersDarkScheme.removeEventListener('change', mediaQueryListener);
        };
    }, [theme, applyThemeToHtml]); // Rerun effect when 'theme' changes or applyThemeToHtml is re-memoized

    /**
     * Toggles the current theme between 'light', 'dark', and 'system' in a cycle.
     * Uses useCallback to memoize the function, preventing unnecessary re-renders.
     */
    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => {
            if (prevTheme === 'light') return 'dark';
            if (prevTheme === 'dark') return 'system';
            return 'light'; // If 'system' or any other value, cycle back to 'light'
        });
    }, []);

    /**
     * Updates the theme state and applies it to the DOM
     * @param {'light' | 'dark' | 'system'} newTheme - The new theme to set
     */
    const updateTheme = useCallback((newTheme) => {
        setTheme(newTheme);
        applyThemeToHtml(newTheme);
        localStorage.setItem('theme', newTheme);
    }, [applyThemeToHtml]);

    /**
     * Returns the Lucide-React icon component corresponding to a given theme.
     * @param {'light' | 'dark' | 'system'} themeOption - The theme option.
     * @returns {React.ReactElement} The corresponding icon component.
     */
    const getThemeIcon = useCallback((themeOption) => {
        if (themeOption === 'light') return <Sun size={18} />;
        if (themeOption === 'dark') return <Moon size={18} />;
        return <Monitor size={18} />; // For 'system' theme
    }, []);

    /**
     * Returns a human-readable label for a given theme option.
     * @param {'light' | 'dark' | 'system'} themeOption - The theme option.
     * @returns {string} The human-readable label.
     */
    const getThemeLabel = useCallback((themeOption) => {
        if (themeOption === 'light') return 'Light Mode';
        if (themeOption === 'dark') return 'Dark Mode';
        return 'System Preference';
    }, []);

    // The value provided by this context to its consumers.
    const value = {
        theme,
        setTheme: updateTheme, // Expose the updateTheme function as setTheme
        toggleTheme,
        getThemeIcon,
        getThemeLabel
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};