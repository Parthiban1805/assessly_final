import { useEffect, useRef } from 'react';

const useExamSecurity = (logEvent, isActive) => {
    const lastViolationTimeRef = useRef(0);

    useEffect(() => {
        const createEvent = (type, severity = 'violation') => ({ type, severity });

        const handleViolation = (type) => {
            const now = Date.now();
            if (now - lastViolationTimeRef.current > 1000) {
                logEvent(createEvent(type));
                lastViolationTimeRef.current = now;
            }
        };

        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(key)) {
                e.preventDefault();
                handleViolation(`Attempted ${key.toUpperCase()} shortcut`);
            }

            if (key === 'printscreen') {
                e.preventDefault();
                handleViolation('Print Screen key detected');
            }

            if (key === 'f12' || e.keyCode === 123) {
                e.preventDefault();
                logEvent(createEvent('Attempted to open Developer Tools with F12', 'warning'));
            }

            if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
                e.preventDefault();
                logEvent(createEvent(`Prohibited shortcut: Ctrl+Shift+${key.toUpperCase()}`, 'warning'));
            }

            if ((e.ctrlKey || e.metaKey) && key === 'tab') {
                e.preventDefault();
                handleViolation('Attempted to switch tabs via keyboard');
            }
        };

        const handleClipboard = (e) => {
            e.preventDefault();
            logEvent(createEvent(`Clipboard event detected: ${e.type}`, 'warning'));
        };

        const handleResize = () => {
            if ((window.outerWidth - window.innerWidth > 160) || (window.outerHeight - window.innerHeight > 160)) {
                logEvent(createEvent('Possible Developer Tools open (window resized)', 'warning'));
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            logEvent(createEvent('Right-click detected', 'warning'));
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleViolation('Switched to another tab or application');
            }
        };

        const handleWindowBlur = () => {
            handleViolation('Window lost focus');
        };

        const handleBeforePrint = (e) => {
            e.preventDefault();
            handleViolation('Print dialog triggered');
        };

        const handleDrag = (e) => {
            e.preventDefault();
            logEvent(createEvent('Drag action detected', 'warning'));
        };

        const handleTouch = (e) => {
            logEvent(createEvent('Touch interaction detected (possible mobile use)', 'warning'));
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                handleViolation('Exited fullscreen mode');
            }
        };

        const handleOffline = () => {
            logEvent(createEvent('Network disconnected', 'warning'));
        };

        const handleOnline = () => {
            logEvent(createEvent('Network reconnected', 'info'));
        };

        if (!isActive) return;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);
        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('copy', handleClipboard);
        window.addEventListener('paste', handleClipboard);
        window.addEventListener('cut', handleClipboard);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('dragstart', handleDrag);
        window.addEventListener('touchstart', handleTouch);
        window.addEventListener('touchmove', handleTouch);
        window.addEventListener('touchend', handleTouch);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('copy', handleClipboard);
            window.removeEventListener('paste', handleClipboard);
            window.removeEventListener('cut', handleClipboard);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('beforeprint', handleBeforePrint);
            window.removeEventListener('dragstart', handleDrag);
            window.removeEventListener('touchstart', handleTouch);
            window.removeEventListener('touchmove', handleTouch);
            window.removeEventListener('touchend', handleTouch);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [logEvent, isActive]);
};

export default useExamSecurity;
