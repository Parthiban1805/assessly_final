// src/config/constants.js

/**
 * Defines application-wide constants, particularly API endpoints
 * and third-party service keys, loaded from environment variables.
 * This centralizes configuration and enhances maintainability.
 */

/**
 * Base URL for the main backend API.
 * Loaded from VITE_API_BASE_URL environment variable.
 * @type {string}
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Base URL for the Python-based proctoring service API.
 * Loaded from VITE_PROCTORING_API_URL environment variable.
 * @type {string}
 */
export const PROCTORING_API_URL = import.meta.env.VITE_PROCTORING_API_URL || 'http://localhost:5001/api';

/**
 * Google OAuth Client ID for authentication.
 * Loaded from VITE_GOOGLE_CLIENT_ID environment variable.
 * @type {string}
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;