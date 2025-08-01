import { useCallback, useEffect, useState } from 'react';

/**
 * A custom React hook to manage the browser's fullscreen mode.
 * It provides the current fullscreen state and functions to request and exit fullscreen.
 *
 * @param {function} [onExitFullscreen] - An optional callback function that will be
 * invoked when the user exits fullscreen mode (e.g., by pressing the Escape key or through other means).
 *
 * @returns {{
 *  isFullscreen: boolean,
 *  requestFullscreen: function,
 *  exitFullscreen: function
 * }} An object containing:
 *   - `isFullscreen`: A boolean indicating if the browser is currently in fullscreen mode.
 *   - `requestFullscreen`: A function to programmatically request fullscreen mode for the document.
 *   - `exitFullscreen`: A function to programmatically exit fullscreen mode.
 */
const useFullscreen = (onExitFullscreen) => {
    // Initialize state by checking if any fullscreen element exists (with vendor prefixes).
    const [isFullscreen, setIsFullscreen] = useState(
        !!document.fullscreenElement ||
        !!document.webkitFullscreenElement ||
        !!document.mozFullScreenElement ||
        !!document.msFullscreenElement
    );

    /**
     * Requests fullscreen mode for the entire document (documentElement).
     * Handles various browser vendor prefixes for cross-browser compatibility.
     * Uses useCallback for memoization to prevent unnecessary re-creation.
     */
    const requestFullscreen = useCallback(() => {
        const element = document.documentElement; // Target the entire page for fullscreen
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) { /* Safari and other WebKit browsers */
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) { /* Firefox */
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) { /* IE11 */
            element.msRequestFullscreen();
        }
    }, []);

    /**
     * Exits fullscreen mode.
     * Handles various browser vendor prefixes for cross-browser compatibility.
     * Uses useCallback for memoization.
     */
    const exitFullscreen = useCallback(() => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari and other WebKit browsers */
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
    }, []);

    /**
     * Effect hook to listen for changes in the browser's fullscreen state.
     * This allows the hook to react to user actions (e.g., pressing Esc to exit fullscreen).
     */
    useEffect(() => {
        /**
         * Event handler for fullscreen change events.
         * Updates the internal `isFullscreen` state and calls the `onExitFullscreen` callback if applicable.
         */
        const handleChange = () => {
            // Check if currently in fullscreen mode across all vendor prefixes.
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );
            setIsFullscreen(isCurrentlyFullscreen); // Update state

            // If fullscreen was exited and a callback is provided, invoke it.
            // This is typically called when `isCurrentlyFullscreen` becomes false.
            if (!isCurrentlyFullscreen && onExitFullscreen) {
                onExitFullscreen();
            }
        };

        // Add event listeners for all relevant fullscreen change events.
        document.addEventListener('fullscreenchange', handleChange);
        document.addEventListener('webkitfullscreenchange', handleChange);
        document.addEventListener('mozfullscreenchange', handleChange);
        document.addEventListener('MSFullscreenChange', handleChange);

        // Cleanup function: remove all event listeners when the component unmounts or effect re-runs.
        return () => {
            document.removeEventListener('fullscreenchange', handleChange);
            document.removeEventListener('webkitfullscreenchange', handleChange);
            document.removeEventListener('mozfullscreenchange', handleChange);
            document.removeEventListener('MSFullscreenChange', handleChange);
        };
    }, [onExitFullscreen]); // Dependency array: re-run effect if onExitFullscreen callback changes.

    // Return the current fullscreen state and control functions.
    return { isFullscreen, requestFullscreen, exitFullscreen };
};

export default useFullscreen;
