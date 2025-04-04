// src/services/auth.js
import { apiPost, apiGet } from './api';

const AUTH_ENDPOINT = '/auth'; // Base endpoint for authentication

/**
 * Logs in a user.
 * @param {object} credentials - User credentials (e.g., { email, password }).
 * @returns {Promise<object>} A promise that resolves to the login response (e.g., { token, user }).
 */
export const login = (credentials) => {
  if (!credentials || !credentials.email || !credentials.password) {
    return Promise.reject(new Error('Email and password are required for login.'));
  }
  // The response should ideally contain a token and user info
  // The calling code will need to handle storing the token (e.g., in localStorage)
  return apiPost(`${AUTH_ENDPOINT}/login`, credentials);
};

/**
 * Registers a new user.
 * @param {object} userData - User registration data (e.g., { name, email, password }).
 * @returns {Promise<object>} A promise that resolves to the registration response (e.g., { user }).
 */
export const register = (userData) => {
   if (!userData || !userData.email || !userData.password) {
    return Promise.reject(new Error('Email and password are required for registration.'));
  }
  // Adjust required fields based on your API
  return apiPost(`${AUTH_ENDPOINT}/register`, userData);
};

/**
 * Logs out the current user.
 * This might involve calling an API endpoint to invalidate a server-side session/token,
 * and/or clearing the client-side token.
 * @returns {Promise<any>} A promise that resolves when logout is complete.
 */
export const logout = () => {
  // Option 1: Call an API endpoint (if your backend requires it)
  // return apiPost(`${AUTH_ENDPOINT}/logout`, {}); // Send empty body or specific data if needed

  // Option 2: Only clear client-side token (if backend is stateless JWT)
  console.log("Logging out - clearing client-side token.");
  localStorage.removeItem('authToken'); // Example: clear token
  // Potentially redirect or update UI state here
  return Promise.resolve(); // Indicate success
};

/**
 * Fetches the currently authenticated user's information.
 * Requires a valid token to be sent via api.js's header injection.
 * @returns {Promise<object>} A promise that resolves to the current user object.
 */
export const getCurrentUser = () => {
  // Assumes an endpoint like /auth/me or /users/me exists
  return apiGet(`${AUTH_ENDPOINT}/me`);
};

// Add other auth-related functions as needed (e.g., password reset, email verification)