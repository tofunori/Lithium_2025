// src/services/facilities.js
import { apiGet, apiPost, apiPut, apiDelete } from './api';

const FACILITIES_ENDPOINT = '/facilities';

/**
 * Fetches a list of all facilities.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of facility objects.
 */
export const getFacilities = () => {
  return apiGet(FACILITIES_ENDPOINT);
};

/**
 * Fetches a single facility by its ID.
 * @param {string} facilityId - The ID of the facility to fetch.
 * @returns {Promise<object>} A promise that resolves to the facility object.
 */
export const getFacilityById = (facilityId) => {
  if (!facilityId) {
    return Promise.reject(new Error('Facility ID is required.'));
  }
  return apiGet(`${FACILITIES_ENDPOINT}/${facilityId}`);
};

/**
 * Creates a new facility.
 * @param {object} facilityData - The data for the new facility.
 * @returns {Promise<object>} A promise that resolves to the newly created facility object.
 */
export const createFacility = (facilityData) => {
  if (!facilityData) {
    return Promise.reject(new Error('Facility data is required.'));
  }
  return apiPost(FACILITIES_ENDPOINT, facilityData);
};

/**
 * Updates an existing facility.
 * @param {string} facilityId - The ID of the facility to update.
 * @param {object} facilityData - The updated data for the facility.
 * @returns {Promise<object>} A promise that resolves to the updated facility object.
 */
export const updateFacility = (facilityId, facilityData) => {
  if (!facilityId || !facilityData) {
    return Promise.reject(new Error('Facility ID and data are required.'));
  }
  return apiPut(`${FACILITIES_ENDPOINT}/${facilityId}`, facilityData);
};

/**
 * Deletes a facility by its ID.
 * @param {string} facilityId - The ID of the facility to delete.
 * @returns {Promise<null>} A promise that resolves when the facility is deleted (typically null for 204 response).
 */
export const deleteFacility = (facilityId) => {
  if (!facilityId) {
    return Promise.reject(new Error('Facility ID is required.'));
  }
  return apiDelete(`${FACILITIES_ENDPOINT}/${facilityId}`);
};