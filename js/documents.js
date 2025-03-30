// js/documents.js - Logic for the Manage Documents page

// State variables (global within this module's scope)
let currentSelectedFacilityId = null;
let currentSelectedFacilityData = null;
let allFacilitiesData = null; // Cache for 'ALL' view

// DOM Element references (will be assigned in init)
let facilitySelect = null;
let documentManagementSection = null;
let selectedFacilityNameElement = null;
let documentUploadInput = null;
let uploadDocumentButton = null;
let uploadStatusMessage = null;
let linkUrlInput = null;
let linkDescriptionInput = null;
let addLinkButton = null;
let addLinkStatusMessage = null;
let documentList = null;
let noDocumentsMessage = null;
let uploadFormElements = null;
let addLinkFormElements = null;
let errorMessageDiv = null;
let successMessageDiv = null;

// NEW: Initialization function called by router
window.initDocumentsPage = function() {
    console.log("Initializing Documents Page...");

    // --- Query DOM Elements (important to do this *after* content is loaded) ---
    facilitySelect = document.getElementById('facilitySelect');
    documentManagementSection = document.getElementById('documentManagementSection');
    selectedFacilityNameElement = document.getElementById('selectedFacilityName');
    documentUploadInput = document.getElementById('documentUploadInput');
    uploadDocumentButton = document.getElementById('uploadDocumentButton');
    uploadStatusMessage = document.getElementById('uploadStatusMessage');
    linkUrlInput = document.getElementById('linkUrlInput');
    linkDescriptionInput = document.getElementById('linkDescriptionInput');
    addLinkButton = document.getElementById('addLinkButton');
    addLinkStatusMessage = document.getElementById('addLinkStatusMessage');
    documentList = document.getElementById('documentList');
    noDocumentsMessage = document.getElementById('noDocumentsMessage'); // May not exist initially if list populated
    uploadFormElements = document.querySelector('#documentManagementSection .card-body > div:nth-of-type(1)');
    addLinkFormElements = document.querySelector('#documentManagementSection .card-body > div:nth-of-type(3)');
    errorMessageDiv = document.getElementById('errorMessage');
    successMessageDiv = document.getElementById('successMessage');
    // --- End Query DOM Elements ---

    // Check if essential elements exist
    if (!facilitySelect || !documentManagementSection || !documentList) {
        console.error("Essential elements for Documents page not found. Aborting initialization.");
        return;
    }

    // --- Reset State and UI ---
    console.log("Resetting documents page state and UI...");
    currentSelectedFacilityId = null;
    currentSelectedFacilityData = null;
    allFacilitiesData = null; // Clear cache on re-init
    facilitySelect.innerHTML = '<option selected disabled value="">-- Select a Facility --</option><option value="ALL">-- All Facilities --</option>'; // Reset dropdown options
    facilitySelect.value = ''; // Reset selection
    documentList.innerHTML = ''; // Clear list
    if (noDocumentsMessage) noDocumentsMessage.remove(); // Remove old message if exists
    documentManagementSection.classList.add('d-none'); // Hide section
    showError(''); showSuccess(''); showUploadStatus(''); showAddLinkStatus(''); // Clear messages
    // --- End Reset State and UI ---


    // Removed initial login check - assuming handled elsewhere or user won't see page

    // Populate Facility Dropdown
    populateFacilityDropdown(); // Re-populate dropdown

    // Add Event Listeners
    setupDocumentsEventListeners();
}

// Function to setup event listeners, preventing duplicates
function setupDocumentsEventListeners() {
    console.log("Setting up documents event listeners...");

    if (facilitySelect && !facilitySelect.hasAttribute('data-listener-added')) {
        console.log("Adding listener to facilitySelect");
        facilitySelect.addEventListener('change', handleFacilitySelection);
        facilitySelect.setAttribute('data-listener-added', 'true');
    }
    if (uploadDocumentButton && !uploadDocumentButton.hasAttribute('data-listener-added')) {
         console.log("Adding listener to uploadDocumentButton");
        uploadDocumentButton.addEventListener('click', handleDocumentUpload);
        uploadDocumentButton.setAttribute('data-listener-added', 'true');
    }
    if (addLinkButton && !addLinkButton.hasAttribute('data-listener-added')) {
         console.log("Adding listener to addLinkButton");
        addLinkButton.addEventListener('click', handleAddLink);
        addLinkButton.setAttribute('data-listener-added', 'true');
    }
    // Note: The document click listener is added dynamically in populateDocumentList
}


// Function to fetch all facilities and populate the dropdown
async function populateFacilityDropdown() {
    if (!facilitySelect) return;
    console.log("Populating facility dropdown...");
    try {
        const response = await fetch('/api/facilities');
        if (!response.ok) throw new Error(`Error fetching facilities: ${response.statusText}`);
        const facilitiesData = await response.json();
        // Don't cache here, cache in the main state variable if needed for 'ALL'
        // allFacilitiesData = facilitiesData;
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
    console.log("Facility selected:", selectedValue);
    currentSelectedFacilityId = selectedValue;
    currentSelectedFacilityData = null; // Reset specific facility data

    if (!selectedValue) {
        documentManagementSection.classList.add('d-none');
        return;
    }

    showError(''); showSuccess(''); showUploadStatus(''); showAddLinkStatus('');
    populateDocumentList(null); // Clear list while loading
    documentManagementSection.classList.remove('d-none');

    try {
        if (selectedValue === 'ALL') {
            console.log("Handling 'ALL' selection...");
            // --- Handle "All Facilities" ---
            // Fetch if not cached
            if (!allFacilitiesData) {
                 console.log("Fetching all facilities data for 'ALL' view...");
                 const response = await fetch('/api/facilities');
                 if (!response.ok) throw new Error(`Error fetching facilities: ${response.statusText}`);
                 allFacilitiesData = await response.json();
            } else {
                 console.log("Using cached all facilities data for 'ALL' view.");
            }

            const combinedDocuments = [];
            if (allFacilitiesData && allFacilitiesData.features) {
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
                    const textA = a.type === 'link' ? a.description : a.filename;
                    const textB = b.type === 'link' ? b.description : b.filename;
                    return textA.localeCompare(textB);
                });
            }

            if (selectedFacilityNameElement) selectedFacilityNameElement.textContent = `Items for: All Facilities`;
            populateDocumentList(combinedDocuments);
            // Disable upload and add link forms for 'ALL' view
            if (uploadFormElements) uploadFormElements.classList.add('d-none');
            if (addLinkFormElements) addLinkFormElements.classList.add('d-none');

        } else {
            console.log(`Handling specific facility selection: ${selectedValue}`);
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
        // Consider if allFacilitiesData should be cleared on error too
        // allFacilitiesData = null;
    }
}

// Function to populate the list of documents and links
function populateDocumentList(items) { // Renamed parameter to 'items'
    if (!documentList) {
        console.error("Document list element not found in populateDocumentList");
        return;
    }

    console.log("Populating document list with items:", items);
    documentList.innerHTML = ''; // Clear previous items
    // Ensure noDocumentsMessage element is queried correctly or created if needed
    noDocumentsMessage = document.getElementById('noDocumentsMessage');
    if (!noDocumentsMessage) {
        noDocumentsMessage = document.createElement('li');
        noDocumentsMessage.id = 'noDocumentsMessage';
        noDocumentsMessage.className = 'list-group-item text-muted';
        // Don't append here, append only if needed
    } else {
        noDocumentsMessage.remove(); // Remove from DOM if it exists
    }


    const isCombinedList = items && items.length > 0 && items[0].facilityId;

    if (items && Array.isArray(items) && items.length > 0) {
        // Items exist, ensure message is hidden/removed
        noDocumentsMessage.classList.add('d-none');

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
                link.href = '#'; // Prevent default link behavior
                link.textContent = item.filename;
                link.dataset.filename = item.filename;
                link.dataset.type = 'file'; // Mark as file type
                if (isCombinedList) {
                    link.dataset.facilityId = item.facilityId;
                }
                // Add listener ONLY for files
                link.addEventListener('click', handleDocumentClick);
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
        // No items, show the message
        noDocumentsMessage.classList.remove('d-none');
        if (currentSelectedFacilityId === 'ALL') noDocumentsMessage.textContent = 'No items found across all facilities.';
        else if (currentSelectedFacilityId) noDocumentsMessage.textContent = 'No items added yet for this facility.';
        else noDocumentsMessage.textContent = 'Select a facility to see its items.';
        documentList.appendChild(noDocumentsMessage); // Append the message element
    }
}

// Function to handle clicking on a document *file* link
async function handleDocumentClick(event) {
    event.preventDefault();
    const linkElement = event.target.closest('a'); // Ensure we get the anchor
    if (!linkElement || linkElement.dataset.type !== 'file') return; // Check type on anchor

    const filename = linkElement.dataset.filename;
    // Use facilityId from link dataset if present (for 'ALL' view), otherwise use current state
    const facilityIdForLink = linkElement.dataset.facilityId || currentSelectedFacilityId;

    if (!filename || !facilityIdForLink || facilityIdForLink === 'ALL') {
        console.error('Missing filename or facility ID for file click.', { filename, facilityIdForLink });
        showError('Could not get file link. Ensure a specific facility context exists.');
        return;
    }

    showError('');
    const originalText = linkElement.textContent; // Store original text
    linkElement.textContent = `Loading ${filename}...`;
    linkElement.style.pointerEvents = 'none'; // Disable link temporarily

    try {
        // Fetch signed URL only for files
        const response = await fetch(`/api/facilities/${facilityIdForLink}/documents/${filename}/url`);
        const result = await response.json();
        if (response.ok && result.url) {
            window.open(result.url, '_blank');
        } else {
            throw new Error(result.message || `Failed to get download URL (Status: ${response.status})`);
        }
    } catch (error) {
        console.error('Error fetching document URL:', error);
        showError(`Error getting file link: ${error.message}`);
    } finally {
         linkElement.textContent = originalText; // Restore original text
         linkElement.style.pointerEvents = ''; // Re-enable link
    }
}

// Function to handle the document file upload process
async function handleDocumentUpload() {
    if (!documentUploadInput || !uploadDocumentButton) return; // Check elements exist

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
        // Update local data cache if it exists for the current facility
        if (currentSelectedFacilityData?.properties && currentSelectedFacilityId !== 'ALL') {
             currentSelectedFacilityData.properties.documents = result.documents;
             populateDocumentList(currentSelectedFacilityData.properties.documents);
        } else {
            // If 'ALL' was selected or cache is missing, force refresh on next selection
            currentSelectedFacilityData = null;
            allFacilitiesData = null; // Invalidate 'ALL' cache too
            // Optionally, re-trigger handleFacilitySelection if needed, but might be complex
            console.log("Upload successful, list will refresh on next selection.");
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
     if (!linkUrlInput || !linkDescriptionInput || !addLinkButton) return; // Check elements exist

    if (currentSelectedFacilityId === 'ALL' || !currentSelectedFacilityId) {
         showAddLinkStatus('Please select a specific facility first.', 'text-warning'); return;
    }
    const url = linkUrlInput.value.trim();
    const description = linkDescriptionInput.value.trim();

    if (!url || !description) {
        showAddLinkStatus('Please enter both a URL and a description.', 'text-danger'); return;
    }
    // Basic URL validation
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
        // Update local data cache if it exists
        if (currentSelectedFacilityData?.properties && currentSelectedFacilityId !== 'ALL') {
             currentSelectedFacilityData.properties.documents = result.documents; // Update local data
             populateDocumentList(currentSelectedFacilityData.properties.documents); // Refresh list
        } else {
             currentSelectedFacilityData = null; // Invalidate cache
             allFacilitiesData = null;
             console.log("Link added, list will refresh on next selection.");
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
    // const errorMessageDiv = document.getElementById('errorMessage'); // Query inside if needed
    if (!errorMessageDiv) return;
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.toggle('d-none', !message);
}

function showSuccess(message) {
    // const successMessageDiv = document.getElementById('successMessage'); // Query inside if needed
     if (!successMessageDiv) return;
     successMessageDiv.textContent = message;
     successMessageDiv.classList.toggle('d-none', !message);
}

// --- REMOVED Auth Check/Logout Functions ---
// REMOVED checkLogin
// REMOVED checkAuthStatus
// REMOVED updateHeaderAuthStatus
// REMOVED handleLogout