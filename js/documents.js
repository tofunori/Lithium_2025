// js/documents.js - Logic for the Manage Documents page

let currentSelectedFacilityId = null; // Can be 'ALL' or a specific ID
let currentSelectedFacilityData = null; // Store data for the selected facility (null if 'ALL')
let allFacilitiesData = null; // Store all facilities data when 'ALL' is selected

// DOM Elements
let facilitySelect = null;
let documentManagementSection = null;
let selectedFacilityNameElement = null;
// File Upload Elements
let documentUploadInput = null;
let uploadDocumentButton = null;
let uploadStatusMessage = null;
// Link Add Elements
let linkUrlInput = null;
let linkDescriptionInput = null;
let addLinkButton = null;
let addLinkStatusMessage = null;
// List Elements
let documentList = null;
let noDocumentsMessage = null;
// Section Elements
let uploadFormElements = null;
let addLinkFormElements = null;


document.addEventListener('DOMContentLoaded', async () => {
    // --- Get DOM Elements ---
    facilitySelect = document.getElementById('facilitySelect');
    documentManagementSection = document.getElementById('documentManagementSection');
    selectedFacilityNameElement = document.getElementById('selectedFacilityName');
    // File Upload
    documentUploadInput = document.getElementById('documentUploadInput');
    uploadDocumentButton = document.getElementById('uploadDocumentButton');
    uploadStatusMessage = document.getElementById('uploadStatusMessage');
    // Link Add
    linkUrlInput = document.getElementById('linkUrlInput');
    linkDescriptionInput = document.getElementById('linkDescriptionInput');
    addLinkButton = document.getElementById('addLinkButton');
    addLinkStatusMessage = document.getElementById('addLinkStatusMessage');
    // List
    documentList = document.getElementById('documentList');
    noDocumentsMessage = document.getElementById('noDocumentsMessage');
    // Sections for hiding/showing
    uploadFormElements = document.querySelector('#documentManagementSection .card-body > div:nth-of-type(1)'); // Assuming upload is first div
    addLinkFormElements = document.querySelector('#documentManagementSection .card-body > div:nth-of-type(3)'); // Assuming add link is third div (after hr)
    // --- End Get DOM Elements ---

    // 1. Check Login Status FIRST
    const isLoggedIn = await checkLogin(); // Now calls the function defined below
    if (!isLoggedIn) return; // Stop if not logged in

    // If logged in, proceed with page setup
    // 2. Populate Facility Dropdown
    await populateFacilityDropdown();

    // 3. Add Event Listeners
    if (facilitySelect) {
        facilitySelect.addEventListener('change', handleFacilitySelection);
    }
    if (uploadDocumentButton) {
        uploadDocumentButton.addEventListener('click', handleDocumentUpload);
    }
    if (addLinkButton) { // Add listener for the new button
        addLinkButton.addEventListener('click', handleAddLink);
    }

    // 4. Setup Header Auth Status
    checkAuthStatus(); // Now calls the function defined below
});

// Function to fetch all facilities and populate the dropdown
async function populateFacilityDropdown() {
    if (!facilitySelect) return;
    try {
        const response = await fetch('/api/facilities');
        if (!response.ok) throw new Error(`Error fetching facilities: ${response.statusText}`);
        const facilitiesData = await response.json();
        allFacilitiesData = facilitiesData;
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
    const selectedValue = event.target.value;
    currentSelectedFacilityId = selectedValue;
    currentSelectedFacilityData = null;

    if (!selectedValue) {
        documentManagementSection.classList.add('d-none');
        return;
    }

    showError(''); showSuccess(''); showUploadStatus(''); showAddLinkStatus('');
    populateDocumentList(null);
    documentManagementSection.classList.remove('d-none');

    try {
        if (selectedValue === 'ALL') {
            // --- Handle "All Facilities" ---
            if (!allFacilitiesData) {
                 const response = await fetch('/api/facilities');
                 if (!response.ok) throw new Error(`Error fetching facilities: ${response.statusText}`);
                 allFacilitiesData = await response.json();
            }
            const combinedDocuments = [];
            allFacilitiesData.features.forEach(facility => {
                if (facility.properties.documents && facility.properties.documents.length > 0) {
                    facility.properties.documents.forEach(doc => {
                        combinedDocuments.push({ ...doc, facilityId: facility.properties.id, facilityName: facility.properties.name });
                    });
                }
            });
            combinedDocuments.sort((a, b) => {
                const nameCompare = a.facilityName.localeCompare(b.facilityName);
                if (nameCompare !== 0) return nameCompare;
                // Sort by description for links, filename for files
                const textA = a.type === 'link' ? a.description : a.filename;
                const textB = b.type === 'link' ? b.description : b.filename;
                return textA.localeCompare(textB);
            });

            if (selectedFacilityNameElement) selectedFacilityNameElement.textContent = `Items for: All Facilities`;
            populateDocumentList(combinedDocuments);
            // Disable upload and add link forms for 'ALL' view
            if (uploadFormElements) uploadFormElements.classList.add('d-none');
            if (addLinkFormElements) addLinkFormElements.classList.add('d-none');

        } else {
            // --- Handle Specific Facility ---
            const response = await fetch(`/api/facilities/${selectedValue}`);
            if (!response.ok) throw new Error(`Error fetching details for facility ${selectedValue}: ${response.statusText}`);
            currentSelectedFacilityData = await response.json();

            if (selectedFacilityNameElement) selectedFacilityNameElement.textContent = `Items for: ${currentSelectedFacilityData.properties.name}`;
            populateDocumentList(currentSelectedFacilityData.properties.documents);
            // Enable upload and add link forms
             if (uploadFormElements) uploadFormElements.classList.remove('d-none');
             if (addLinkFormElements) addLinkFormElements.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Error handling facility selection:', error);
        showError(`Failed to load items: ${error.message}`);
        documentManagementSection.classList.add('d-none');
        currentSelectedFacilityData = null;
        allFacilitiesData = null;
    }
}

// Function to populate the list of documents and links
function populateDocumentList(items) { // Renamed parameter to 'items'
    if (!documentList || !noDocumentsMessage) return;

    documentList.innerHTML = '';
    const isCombinedList = items && items.length > 0 && items[0].facilityId;

    if (items && Array.isArray(items) && items.length > 0) {
        if (noDocumentsMessage) noDocumentsMessage.classList.add('d-none');

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center flex-wrap';

            const linkDiv = document.createElement('div');
            const link = document.createElement('a');
            const icon = document.createElement('i');
            icon.className = 'fas fa-fw me-2'; // Base icon classes

            if (item.type === 'link') {
                icon.classList.add('fa-link');
                link.href = item.url;
                link.target = '_blank'; // Open links in new tab
                link.textContent = item.description || item.url; // Show description or URL
                link.title = item.url; // Show URL on hover
                // No click listener needed for links, they work via href
            } else { // Assume 'file' or default to file behavior
                icon.classList.add('fa-file-alt'); // File icon
                link.href = '#';
                link.textContent = item.filename;
                link.dataset.filename = item.filename;
                link.dataset.type = 'file'; // Mark as file type
                if (isCombinedList) {
                    link.dataset.facilityId = item.facilityId;
                }
                link.addEventListener('click', handleDocumentClick); // Only add listener for files
            }

            linkDiv.appendChild(icon); // Add icon before link text
            linkDiv.appendChild(link);

            if (isCombinedList) {
                const facilitySpan = document.createElement('span');
                facilitySpan.className = 'badge bg-secondary ms-2';
                facilitySpan.textContent = item.facilityName;
                linkDiv.appendChild(facilitySpan);
            }

            const details = document.createElement('small');
            details.className = 'text-muted ms-md-2 mt-1 mt-md-0';
            let detailText = '';
            if (item.size) { // Only files have size
                 detailText += `(${(item.size / 1024 / 1024).toFixed(2)} MB)`;
            }
            const dateToShow = item.uploadedAt || item.addedAt; // Use appropriate date
            if (dateToShow) {
                 detailText += `${detailText ? ' - ' : ''}${new Date(dateToShow).toLocaleDateString()}`;
            }
            details.textContent = detailText;

            li.appendChild(linkDiv);
            li.appendChild(details);
            documentList.appendChild(li);
        });
    } else {
        if (noDocumentsMessage) {
             noDocumentsMessage.classList.remove('d-none');
             if (currentSelectedFacilityId === 'ALL') noDocumentsMessage.textContent = 'No items found across all facilities.';
             else if (currentSelectedFacilityId) noDocumentsMessage.textContent = 'No items added yet for this facility.';
             else noDocumentsMessage.textContent = 'Select a facility to see its items.';
             if (!documentList.contains(noDocumentsMessage)) documentList.appendChild(noDocumentsMessage);
        }
    }
}

// Function to handle clicking on a document *file* link
async function handleDocumentClick(event) {
    event.preventDefault();
    const linkElement = event.target;
    // Check if it's actually a file type we should handle
    if (linkElement.dataset.type !== 'file') return;

    const filename = linkElement.dataset.filename;
    const facilityIdForLink = linkElement.dataset.facilityId || currentSelectedFacilityId;

    if (!filename || !facilityIdForLink || facilityIdForLink === 'ALL') {
        console.error('Missing filename or facility ID for file click.', { filename, facilityIdForLink });
        showError('Could not get file link. Ensure a specific facility context exists.');
        return;
    }

    showError('');
    linkElement.textContent = `Loading ${filename}...`;

    try {
        // Fetch signed URL only for files
        const response = await fetch(`/api/facilities/${facilityIdForLink}/documents/${filename}/url`);
        const result = await response.json();
        if (response.ok && result.url) {
            window.open(result.url, '_blank');
            linkElement.textContent = filename;
        } else {
            throw new Error(result.message || `Failed to get download URL (Status: ${response.status})`);
        }
    } catch (error) {
        console.error('Error fetching document URL:', error);
        showError(`Error getting file link: ${error.message}`);
        linkElement.textContent = filename;
    }
}

// Function to handle the document file upload process
async function handleDocumentUpload() {
    if (currentSelectedFacilityId === 'ALL' || !currentSelectedFacilityId) {
         showUploadStatus('Please select a specific facility first.', 'text-warning'); return;
    }
    if (!documentUploadInput?.files?.length) {
        showUploadStatus('Please select a file to upload.', 'text-danger'); return;
    }
    const file = documentUploadInput.files[0];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
        showUploadStatus(`File is too large. Max ${MAX_FILE_SIZE / 1024 / 1024} MB.`, 'text-danger'); return;
    }

    showUploadStatus(`Uploading ${file.name}...`, 'text-info');
    uploadDocumentButton.disabled = true;
    const formData = new FormData();
    formData.append('document', file);

    try {
        const response = await fetch(`/api/facilities/${currentSelectedFacilityId}/documents`, { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Upload failed (Status: ${response.status})`);

        showUploadStatus(`Successfully uploaded ${file.name}.`, 'text-success');
        if (currentSelectedFacilityData?.properties) {
             currentSelectedFacilityData.properties.documents = result.documents;
             populateDocumentList(currentSelectedFacilityData.properties.documents);
        }
        documentUploadInput.value = ''; // Clear input
    } catch (error) {
        console.error('Error uploading document:', error);
        showUploadStatus(`Error uploading file: ${error.message}`, 'text-danger');
    } finally {
        uploadDocumentButton.disabled = false;
        setTimeout(() => showUploadStatus(''), 5000);
    }
}

// Function to handle adding a new link
async function handleAddLink() {
    if (currentSelectedFacilityId === 'ALL' || !currentSelectedFacilityId) {
         showAddLinkStatus('Please select a specific facility first.', 'text-warning'); return;
    }
    const url = linkUrlInput.value.trim();
    const description = linkDescriptionInput.value.trim();

    if (!url || !description) {
        showAddLinkStatus('Please enter both a URL and a description.', 'text-danger'); return;
    }
    // Basic URL validation (optional, backend does some too)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
         showAddLinkStatus('Please enter a valid URL starting with http:// or https://', 'text-danger'); return;
    }


    showAddLinkStatus('Adding link...', 'text-info');
    addLinkButton.disabled = true;

    try {
        const response = await fetch(`/api/facilities/${currentSelectedFacilityId}/links`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, description })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Failed to add link (Status: ${response.status})`);

        showAddLinkStatus('Link added successfully!', 'text-success');
        if (currentSelectedFacilityData?.properties) {
             currentSelectedFacilityData.properties.documents = result.documents; // Update local data
             populateDocumentList(currentSelectedFacilityData.properties.documents); // Refresh list
        }
        linkUrlInput.value = ''; // Clear inputs
        linkDescriptionInput.value = '';
    } catch (error) {
        console.error('Error adding link:', error);
        showAddLinkStatus(`Error adding link: ${error.message}`, 'text-danger');
    } finally {
        addLinkButton.disabled = false;
        setTimeout(() => showAddLinkStatus(''), 5000);
    }
}

// Helper to show add link status messages
function showAddLinkStatus(message, className = 'text-muted') {
     if (addLinkStatusMessage) {
         addLinkStatusMessage.textContent = message;
         addLinkStatusMessage.className = `form-text mt-1 ${className}`;
     }
}

// Helper to show upload status messages
function showUploadStatus(message, className = 'text-muted') {
     if (uploadStatusMessage) {
         uploadStatusMessage.textContent = message;
         uploadStatusMessage.className = `form-text mt-1 ${className}`;
     }
}

// --- Utility Functions ---
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

// --- Auth Check/Logout Functions ---
async function checkLogin() {
    try {
        const response = await fetch('/api/session');
        const sessionData = await response.json();
        if (!sessionData.loggedIn) {
            window.location.href = 'login.html'; return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking session status:', error);
        window.location.href = 'login.html'; return false;
    }
}

async function checkAuthStatus() {
    const authStatusElement = document.getElementById('authStatus');
    if (!authStatusElement) return;
    try {
        const response = await fetch('/api/session');
        const sessionData = await response.json();
        updateHeaderAuthStatus(sessionData);
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateHeaderAuthStatus({ loggedIn: false, error: true });
    }
}

function updateHeaderAuthStatus(sessionData) {
     const authStatusElement = document.getElementById('authStatus');
     if (!authStatusElement) return;
     if (sessionData.loggedIn) {
         authStatusElement.innerHTML = `
             <span class="navbar-text me-3">Welcome, ${sessionData.user.username}!</span>
             <a href="new-facility.html" class="btn btn-sm btn-success me-2"><i class="fas fa-plus"></i> Add Facility</a>
             <a href="#" id="logoutLink" class="btn btn-sm btn-outline-danger">Logout</a>
         `;
         const logoutLink = document.getElementById('logoutLink');
         if(logoutLink) logoutLink.addEventListener('click', handleLogout);
     } else {
         authStatusElement.innerHTML = `<a href="login.html" class="btn btn-sm btn-outline-success">Admin Login</a>`;
     }
     if (sessionData.error) {
          authStatusElement.innerHTML += ' <span class="text-danger small">(Session check failed)</span>';
     }
}

async function handleLogout(event) {
    event.preventDefault();
    try {
        const response = await fetch('/api/logout');
        const result = await response.json();
        if (result.success) {
            window.location.href = 'index.html';
        } else {
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('An error occurred during logout.');
    }
}