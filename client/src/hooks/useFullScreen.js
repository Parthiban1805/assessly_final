import { useCallback, useEffect, useState } from 'react';

/**
 * A custom React hook to manage the browser's fullscreen mode.
 * 
 * @param {function} [onExitFullscreen] - An optional callback function that will be
 * invoked when the user exits fullscreen mode (e.g., by pressing the Escape key).
 * 
 * @returns {{
 *  isFullscreen: boolean,
 *  requestFullscreen: function,
 *  exitFullscreen: function
 * }} An object containing the current fullscreen state and functions to enter/exit it.
 */
const useFullscreen = (onExitFullscreen) => {
    // Determine initial state by checking all vendor-prefixed properties.
    const [isFullscreen, setIsFullscreen] = useState(
        !!document.fullscreenElement || 
        !!document.webkitFullscreenElement || 
        !!document.mozFullScreenElement || 
        !!document.msFullscreenElement
    );

    // --- Enter Fullscreen ---
    const requestFullscreen = useCallback(() => {
        const element = document.documentElement; // Target the entire page
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) { /* Safari */
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) { /* Firefox */
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) { /* IE11 */
            element.msRequestFullscreen();
        }
    }, []);

    // --- START OF THE FIX: Add the exitFullscreen function ---
    const exitFullscreen = useCallback(() => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
    }, []);
    // --- END OF THE FIX ---

    // Effect to listen for changes in fullscreen state (e.g., user pressing Esc)
    useEffect(() => {
        const handleChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );
            setIsFullscreen(isCurrentlyFullscreen);

            // If fullscreen was exited AND we were previously in fullscreen, call the callback.
            // This prevents the callback from firing on initial load if not in fullscreen.
            if (!isCurrentlyFullscreen && onExitFullscreen) {
                // We can check the previous state, but it's simpler to just let the calling
                // component handle the logic of when the callback matters (like with isTerminatingRef).
                onExitFullscreen();
            }
        };

        // Add listeners for all browser types
        document.addEventListener('fullscreenchange', handleChange);
        document.addEventListener('webkitfullscreenchange', handleChange);
        document.addEventListener('mozfullscreenchange', handleChange);
        document.addEventListener('MSFullscreenChange', handleChange);

        // Cleanup listeners on unmount
        return () => {
            document.removeEventListener('fullscreenchange', handleChange);
            document.removeEventListener('webkitfullscreenchange', handleChange);
            document.removeEventListener('mozfullscreenchange', handleChange);
            document.removeEventListener('MSFullscreenChange', handleChange);
        };
    }, [onExitFullscreen]);

    // Return all three values: the state and the two control functions.
    return { isFullscreen, requestFullscreen, exitFullscreen };
};

export default useFullscreen;