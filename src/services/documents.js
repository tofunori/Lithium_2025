// src/services/documents.js
import { apiGet, apiPost, apiDelete } from './api'; // Assuming PUT/PATCH might not be standard for simple doc management

const DOCUMENTS_ENDPOINT = '/documents';

/**
 * Fetches a list of documents, potentially filtered (e.g., by facilityId).
 * @param {object} filters - Optional query parameters for filtering (e.g., { facilityId: '123' }).
 * @returns {Promise<Array<object>>} A promise that resolves to an array of document metadata objects.
 */
export const getDocuments = (filters = {}) => {
  const queryString = new URLSearchParams(filters).toString();
  const endpoint = queryString ? `${DOCUMENTS_ENDPOINT}?${queryString}` : DOCUMENTS_ENDPOINT;
  return apiGet(endpoint);
};

/**
 * Fetches metadata for a single document by its ID.
 * @param {string} documentId - The ID of the document to fetch.
 * @returns {Promise<object>} A promise that resolves to the document metadata object.
 */
export const getDocumentById = (documentId) => {
  if (!documentId) {
    return Promise.reject(new Error('Document ID is required.'));
  }
  return apiGet(`${DOCUMENTS_ENDPOINT}/${documentId}`);
};

/**
 * Uploads a new document.
 * Note: File uploads often require 'multipart/form-data' Content-Type.
 * The base apiRequest might need adjustment or a dedicated upload function
 * if it strictly enforces 'application/json'.
 *
 * @param {FormData} formData - The FormData object containing the file and any associated metadata.
 * @returns {Promise<object>} A promise that resolves to the metadata of the uploaded document.
 */
export const uploadDocument = (formData) => {
  if (!(formData instanceof FormData)) {
    return Promise.reject(new Error('FormData is required for document upload.'));
  }
  // Example: Using fetch directly or a modified apiRequest for FormData
  // This might bypass the default JSON stringification in apiRequest
  // Adjust headers as needed, removing 'Content-Type': 'application/json'
  // return apiRequest(DOCUMENTS_ENDPOINT, {
  //   method: 'POST',
  //   body: formData,
  //   headers: {
  //     // Let the browser set the Content-Type for FormData
  //     'Content-Type': undefined, // Or remove it entirely depending on apiRequest implementation
  //     'Accept': 'application/json', // Still expect JSON response
  //   }
  // });

  // Placeholder using apiPost - REQUIRES api.js TO HANDLE FormData correctly
  // or a separate upload function. For now, assuming apiPost might work if
  // the Content-Type header override is handled properly in api.js or fetch.
  console.warn("uploadDocument assumes apiPost or underlying fetch handles FormData correctly. Review api.js if issues arise.");
  return apiPost(DOCUMENTS_ENDPOINT, formData, {
     headers: { 'Content-Type': null } // Attempt to let browser set Content-Type
  });
};


/**
 * Deletes a document by its ID.
 * @param {string} documentId - The ID of the document to delete.
 * @returns {Promise<null>} A promise that resolves when the document is deleted.
 */
export const deleteDocument = (documentId) => {
  if (!documentId) {
    return Promise.reject(new Error('Document ID is required.'));
  }
  return apiDelete(`${DOCUMENTS_ENDPOINT}/${documentId}`);
};

// Optional: Function to get a download URL if the API provides one
/**
 * Gets a download URL for a document. Assumes API returns URL in response.
 * @param {string} documentId - The ID of the document.
 * @returns {Promise<string>} A promise that resolves to the download URL.
 */
export const getDocumentDownloadUrl = async (documentId) => {
    if (!documentId) {
        return Promise.reject(new Error('Document ID is required.'));
    }
    // Example: API might have a specific endpoint or return URL in metadata
    const docInfo = await getDocumentById(documentId);
    if (!docInfo || !docInfo.downloadUrl) {
        throw new Error(`Download URL not found for document ${documentId}`);
    }
    return docInfo.downloadUrl;
};