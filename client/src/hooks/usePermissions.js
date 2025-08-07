// src/hooks/usePermissions.js

import { useState, useEffect, useCallback } from 'react';

export const usePermissions = () => {
    // We now have 3 distinct states:
    // 'prompt': The initial state, we don't know the status yet.
    // 'granted': User has allowed access.
    // 'denied': User has previously blocked access.
    const [status, setStatus] = useState('prompt');

    const checkPermissions = useCallback(async () => {
        if (!navigator.permissions) {
            // Fallback for older browsers
            setStatus('prompt'); // We have to ask manually
            return;
        }
        
        try {
            const [cameraResult, micResult] = await Promise.all([
                navigator.permissions.query({ name: 'camera' }),
                navigator.permissions.query({ name: 'microphone' }),
            ]);

            // Both must be granted to be in the 'granted' state
            if (cameraResult.state === 'granted' && micResult.state === 'granted') {
                setStatus('granted');
            } 
            // If either one is permanently denied, the whole status is 'denied'
            else if (cameraResult.state === 'denied' || micResult.state === 'denied') {
                setStatus('denied');
            } 
            // Otherwise, we are in the 'prompt' state and need to ask
            else {
                setStatus('prompt');
            }
            
            // Set up listeners to re-check if the user changes settings in another tab
            cameraResult.onchange = () => checkPermissions();
            micResult.onchange = () => checkPermissions();

        } catch (error) {
            console.error("Error querying permissions:", error);
            setStatus('prompt'); // Fallback to asking
        }
    }, []);

    useEffect(() => {
        checkPermissions();
    }, [checkPermissions]);

    return { status };
};