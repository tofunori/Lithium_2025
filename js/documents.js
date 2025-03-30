// js/documents.js - Logic for the Manage Documents page

let currentSelectedFacilityId = null;
let currentSelectedFacilityData = null; // Store data for the selected facility

// DOM Elements
let facilitySelect = null;
let documentManagementSection = null;
let selectedFacilityNameElement = null;
let documentUploadInput = null;
let uploadDocumentButton = null;
let uploadStatusMessage = null;
let documentList = null;
let noDocumentsMessage = null;

document.addEventListener('DOMContentLoaded', async () => {
    // --- Get DOM Elements ---
    facilitySelect = document.getElementById('facilitySelect');
    documentManagementSection = document.getElementById('documentManagementSection');
    selectedFacilityNameElement = document.getElementById('selectedFacilityName');
    documentUploadInput = document.getElementById('documentUploadInput');
    uploadDocumentButton = document.getElementById('uploadDocumentButton');
    uploadStatusMessage = document.getElementById('uploadStatusMessage');
    documentList = document.getElementById('documentList');
    noDocumentsMessage = document.getElementById('noDocumentsMessage');
    // --- End Get DOM Elements ---

    // 1. Check Login Status
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) return; // Stop if not logged in

    // 2. Populate Facility Dropdown
    await populateFacilityDropdown();

    // 3. Add Event Listeners
    if (facilitySelect) {
        facilitySelect.addEventListener('change', handleFacilitySelection);
    }
    if (uploadDocumentButton) {
        uploadDocumentButton.addEventListener('click', handleDocumentUpload);
    }

    // 4. Setup Header Auth Status
    checkAuthStatus(); // Assuming this function exists globally or is imported
});

// Function to fetch all facilities and populate the dropdown
async function populateFacilityDropdown() {
    if (!facilitySelect) return;

    try {
        const response = await fetch('/api/facilities');
        if (!response.ok) {
            throw new Error(`Error fetching facilities: ${response.statusText}`);
        }
        const facilitiesData = await response.json();

        // Sort facilities by name for better usability
        facilitiesData.features.sort((a, b) => a.properties.name.localeCompare(b.properties.name));

        facilitiesData.features.forEach(facility => {
            const option = document.createElement('option');
            option.value = facility.properties.id;
            option.textContent = facility.properties.name;
            facilitySelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error populating facility dropdown:', error);
        showError(`Failed to load facility list: ${error.message}`);
    }
}

// Function to handle when a facility is selected from the dropdown
async function handleFacilitySelection(event) {
    currentSelectedFacilityId = event.target.value;
    if (!currentSelectedFacilityId) {
        documentManagementSection.classList.add('d-none'); // Hide section if no selection
        currentSelectedFacilityData = null;
        return;
    }

    showError(''); // Clear previous errors
    showSuccess('');
    showUploadStatus('');
    populateDocumentList(null); // Clear list while loading

    try {
        // Fetch the selected facility's details (needed for the documents array)
        const response = await fetch(`/api/facilities/${currentSelectedFacilityId}`);
        if (!response.ok) {
            throw new Error(`Error fetching details for facility ${currentSelectedFacilityId}: ${response.statusText}`);
        }
        currentSelectedFacilityData = await response.json();

        // Update UI
        if (selectedFacilityNameElement) {
            selectedFacilityNameElement.textContent = `Documents for: ${currentSelectedFacilityData.properties.name}`;
        }
        populateDocumentList(currentSelectedFacilityData.properties.documents);
        documentManagementSection.classList.remove('d-none'); // Show the management section

    } catch (error) {
        console.error('Error fetching selected facility data:', error);
        showError(`Failed to load documents for selected facility: ${error.message}`);
        documentManagementSection.classList.add('d-none'); // Hide section on error
        currentSelectedFacilityData = null;
    }
}


// Function to populate the list of uploaded documents (Copied/Adapted from edit-facility.js)
function populateDocumentList(documents) {
    if (!documentList || !noDocumentsMessage) return;

    documentList.innerHTML = ''; // Clear existing list items

    if (documents && Array.isArray(documents) && documents.length > 0) {
        noDocumentsMessage.classList.add('d-none');

        documents.forEach(doc => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';

            const link = document.createElement('a');
            link.href = '#';
            link.textContent = doc.filename;
            link.dataset.filename = doc.filename;
            link.addEventListener('click', handleDocumentClick);

            const details = document.createElement('small');
            details.className = 'text-muted ms-2';
            let detailText = '';
            if (doc.size) {
                 detailText += `(${(doc.size / 1024 / 1024).toFixed(2)} MB)`;
            }
            if (doc.uploadedAt) {
                 detailText += ` - ${new Date(doc.uploadedAt).toLocaleDateString()}`;
            }
            details.textContent = detailText;

            li.appendChild(link);
            li.appendChild(details);
            documentList.appendChild(li);
        });
    } else {
        // Show the 'no documents' message
        noDocumentsMessage.classList.remove('d-none');
        noDocumentsMessage.textContent = currentSelectedFacilityId ? 'No documents uploaded yet for this facility.' : 'Select a facility to see its documents.';
        documentList.appendChild(noDocumentsMessage); // Re-add if cleared
    }
}

// Function to handle clicking on a document link (Copied/Adapted from edit-facility.js)
async function handleDocumentClick(event) {
    event.preventDefault();
    const filename = event.target.dataset.filename;
    if (!filename || !currentSelectedFacilityId) {
        console.error('Missing filename or facility ID for document click.');
        showError('Could not get document link.');
        return;
    }

    showError('');
    event.target.textContent = `Loading ${filename}...`;

    try {
        const response = await fetch(`/api/facilities/${currentSelectedFacilityId}/documents/${filename}/url`);
        const result = await response.json();

        if (response.ok && result.url) {
            window.open(result.url, '_blank');
            event.target.textContent = filename;
        } else {
            throw new Error(result.message || `Failed to get download URL (Status: ${response.status})`);
        }
    } catch (error) {
        console.error('Error fetching document URL:', error);
        showError(`Error getting document link: ${error.message}`);
        event.target.textContent = filename;
    }
}


// Function to handle the document upload process (Copied/Adapted from edit-facility.js)
async function handleDocumentUpload() {
    if (!currentSelectedFacilityId) {
         showUploadStatus('Please select a facility first.', 'text-warning');
         return;
    }
    if (!documentUploadInput || !documentUploadInput.files || documentUploadInput.files.length === 0) {
        showUploadStatus('Please select a file to upload.', 'text-danger');
        return;
    }

    const file = documentUploadInput.files[0];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    if (file.size > MAX_FILE_SIZE) {
        showUploadStatus(`File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`, 'text-danger');
        return;
    }

    showUploadStatus(`Uploading ${file.name}...`, 'text-info');
    uploadDocumentButton.disabled = true;

    const formData = new FormData();
    formData.append('document', file);

    try {
        const response = await fetch(`/api/facilities/${currentSelectedFacilityId}/documents`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showUploadStatus(`Successfully uploaded ${file.name}.`, 'text-success');
            // Update the local data and refresh the list
            if (currentSelectedFacilityData && currentSelectedFacilityData.properties) {
                 currentSelectedFacilityData.properties.documents = result.documents;
                 populateDocumentList(currentSelectedFacilityData.properties.documents);
            }
            documentUploadInput.value = ''; // Clear the file input
        } else {
            throw new Error(result.message || `Upload failed (Status: ${response.status})`);
        }

    } catch (error) {
        console.error('Error uploading document:', error);
        showUploadStatus(`Error uploading file: ${error.message}`, 'text-danger');
    } finally {
        uploadDocumentButton.disabled = false;
        setTimeout(() => showUploadStatus(''), 5000);
    }
}

// Helper to show upload status messages (Copied/Adapted from edit-facility.js)
function showUploadStatus(message, className = 'text-muted') {
     if (uploadStatusMessage) {
         uploadStatusMessage.textContent = message;
         uploadStatusMessage.className = `form-text mt-1 ${className}`;
     }
}

// --- Utility Functions (Copied from edit-facility.js) ---
function showError(message) {
    const errorMessageDiv = document.getElementById('errorMessage');
    if (!errorMessageDiv) return;
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.toggle('d-none', !message);
}

function showSuccess(message) {
     const successMessageDiv = document.getElementById('successMessage');
     if (!successMessageDiv) return;
     successMessageDiv.textContent = message;
     successMessageDiv.classList.toggle('d-none', !message);
}


// --- Auth Check/Logout (Assume these are globally available or loaded via another script) ---
// Make sure checkLogin, checkAuthStatus, updateHeaderAuthStatus, handleLogout are accessible
// If not, copy them here or load them from a shared utility script.
// For now, assuming they exist from other page scripts. Need to ensure they are loaded correctly.

// Placeholder checkLogin if not globally available
if (typeof checkLogin === 'undefined') {
    async function checkLogin() {
        console.warn("checkLogin function not found, assuming logged in for dev.");
        // In a real scenario, load this from a shared script or copy the implementation
        return true;
    }
}
// Placeholder checkAuthStatus if not globally available
if (typeof checkAuthStatus === 'undefined') {
    async function checkAuthStatus() {
        console.warn("checkAuthStatus function not found.");
        // In a real scenario, load this from a shared script or copy the implementation
    }
}