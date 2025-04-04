// src/services/api.js

// Assume API base URL is stored in an environment variable or config file
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'; // Use VITE_API_URL consistent with .env files

/**
 * Performs an API request.
 * Handles base URL, common headers (like Authorization), and basic error handling.
 *
 * @param {string} endpoint - The API endpoint (e.g., '/facilities').
 * @param {object} options - Fetch options (method, body, headers, etc.).
 * @returns {Promise<any>} - The JSON response from the API.
 * @throws {Error} - Throws an error if the API request fails.
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  // --- Authentication ---
  // TODO: Implement token retrieval (e.g., from localStorage, state management)
  const token = localStorage.getItem('authToken'); // Example: retrieve token
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
  // --- End Authentication ---

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...authHeaders,
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers, // Allow overriding default headers
    },
  };

  // Convert body to JSON string if it's an object and method requires it
  if (config.body && typeof config.body === 'object' && !['GET', 'HEAD'].includes(config.method?.toUpperCase())) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // --- Error Handling ---
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        // Try to parse error details from the response body
        const errorData = await response.json();
        errorMessage += ` - ${errorData.message || JSON.stringify(errorData)}`;
      } catch (e) {
        // Ignore if response body is not JSON or empty
      }
      // TODO: Implement more specific error handling (e.g., 401 Unauthorized -> redirect to login)
      if (response.status === 401) {
        console.error("Unauthorized access - redirecting to login might be needed.");
        // Example: window.location.href = '/login';
      }
      throw new Error(errorMessage);
    }
    // --- End Error Handling ---

    // Handle responses with no content (e.g., 204 No Content)
    if (response.status === 204) {
      return null;
    }

    return await response.json(); // Assume API always returns JSON
  } catch (error) {
    console.error('API Request Failed:', error);
    // Re-throw the error so calling functions can handle it
    throw error;
  }
};

// Helper methods for common HTTP verbs

export const apiGet = (endpoint, options = {}) =>
  apiRequest(endpoint, { ...options, method: 'GET' });

export const apiPost = (endpoint, body, options = {}) =>
  apiRequest(endpoint, { ...options, method: 'POST', body });

export const apiPut = (endpoint, body, options = {}) =>
  apiRequest(endpoint, { ...options, method: 'PUT', body });

export const apiPatch = (endpoint, body, options = {}) =>
  apiRequest(endpoint, { ...options, method: 'PATCH', body });

export const apiDelete = (endpoint, options = {}) =>
  apiRequest(endpoint, { ...options, method: 'DELETE' });

export default apiRequest; // Export the base request function as default