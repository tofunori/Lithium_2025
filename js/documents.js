// js/documents.js - Logic for the File Explorer Documents page

// --- State Variables ---
var currentSelectedFacilityId = null;
var currentFacilityName = null; // Store the name for display
var currentFilesystemData = null; // Holds the entire filesystem map for the selected facility
var currentFolderId = null; // ID of the folder currently being viewed

// --- DOM Element References ---
// Will be assigned in initDocumentsPage
var facilitySelect = null;
var documentManagementSection = null;
var selectedFacilityNameElement = null;
var breadcrumbNav = null;
var breadcrumbList = null;
var fileExplorerView = null;
var loadingMessage = null;
var emptyFolderMessage = null;
var newFolderButton = null;
var uploadFileButton = null;
var addLinkButton = null;
var errorMessageDiv = null;
var successMessageDiv = null;

// --- Initialization ---
// Called by router when the documents page is loaded
window.initDocumentsPage = function() {
    console.log("Initializing File Explorer Documents Page...");

    // --- Query DOM Elements ---
    facilitySelect = document.getElementById('facilitySelect');
    documentManagementSection = document.getElementById('documentManagementSection');
    selectedFacilityNameElement = document.getElementById('selectedFacilityName');
    breadcrumbNav = document.getElementById('breadcrumbNav');
    breadcrumbList = document.getElementById('breadcrumbList');
    fileExplorerView = document.getElementById('fileExplorerView');
    loadingMessage = document.getElementById('loadingMessage');
    emptyFolderMessage = document.getElementById('emptyFolderMessage');
    newFolderButton = document.getElementById('newFolderButton');
    uploadFileButton = document.getElementById('uploadFileButton');
    addLinkButton = document.getElementById('addLinkButton');
    errorMessageDiv = document.getElementById('errorMessage');
    successMessageDiv = document.getElementById('successMessage');
    // --- End Query DOM Elements ---

    // Check if essential elements exist
    if (!facilitySelect || !documentManagementSection || !fileExplorerView || !breadcrumbList || !newFolderButton) {
        console.error("Essential elements for File Explorer page not found. Aborting initialization.");
        if (errorMessageDiv) showError("Error initializing page elements. Please refresh.");
        return;
    }

    // --- Reset State and UI ---
    console.log("Resetting file explorer state and UI...");
    currentSelectedFacilityId = null;
    currentFacilityName = null;
    currentFilesystemData = null;
    currentFolderId = null;
    facilitySelect.innerHTML = '<option selected disabled value="">-- Select a Facility --</option>'; // Keep only default
    facilitySelect.value = ''; // Reset selection
    breadcrumbList.innerHTML = ''; // Clear breadcrumbs
    fileExplorerView.innerHTML = ''; // Clear file view
    if(loadingMessage) loadingMessage.classList.remove('d-none');
    if(emptyFolderMessage) emptyFolderMessage.classList.add('d-none');
    documentManagementSection.classList.add('d-none'); // Hide section initially
    breadcrumbNav.style.display = 'none'; // Hide breadcrumbs initially
    showError(''); showSuccess(''); // Clear messages
    // --- End Reset State and UI ---

    // Populate Facility Dropdown
    populateFacilityDropdown(); // Re-populate dropdown

    // Add Event Listeners
    setupDocumentsEventListeners();
}

// Function to setup event listeners, preventing duplicates
function setupDocumentsEventListeners() {
    console.log("Setting up file explorer event listeners...");

    // Remove old listeners if they exist (simple approach)
    // A more robust approach might involve storing references and removing specific ones
    facilitySelect?.removeEventListener('change', handleFacilitySelection);
    breadcrumbNav?.removeEventListener('click', handleBreadcrumbClick);
    fileExplorerView?.removeEventListener('click', handleItemClick);
    newFolderButton?.removeEventListener('click', handleNewFolderClick);
    uploadFileButton?.removeEventListener('click', handleUploadFileClick);
    addLinkButton?.removeEventListener('click', handleAddLinkClick);

    // Add new listeners
    if (facilitySelect) {
        facilitySelect.addEventListener('change', handleFacilitySelection);
    }
    if (breadcrumbNav) {
        // Listen for clicks on breadcrumb links
        breadcrumbNav.addEventListener('click', handleBreadcrumbClick);
    }
     if (fileExplorerView) {
        // Use event delegation for items within the view
        fileExplorerView.addEventListener('click', handleItemClick);
    }
    if (newFolderButton) {
        newFolderButton.addEventListener('click', handleNewFolderClick);
    }
     if (uploadFileButton) {
        uploadFileButton.addEventListener('click', handleUploadFileClick);
    }
     if (addLinkButton) {
        addLinkButton.addEventListener('click', handleAddLinkClick);
    }
}


// --- Data Fetching & Handling ---

// Function to fetch all facilities and populate the dropdown
async function populateFacilityDropdown() {
    if (!facilitySelect) return;
    console.log("Populating facility dropdown...");
    try {
        // This endpoint now reads from Firestore via api/index.js
        const response = await fetch('/api/facilities');
        if (!response.ok) throw new Error(`Error fetching facilities: ${response.statusText}`);
        const facilitiesData = await response.json(); // Expects { type: "FeatureCollection", features: [...] }

        if (!facilitiesData || !facilitiesData.features) {
             throw new Error("Invalid data format received for facilities.");
        }

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

    // Reset view
    currentSelectedFacilityId = selectedValue;
    currentFacilityName = facilitySelect.options[facilitySelect.selectedIndex]?.text || 'Selected Facility';
    currentFilesystemData = null;
    currentFolderId = null;
    fileExplorerView.innerHTML = '';
    breadcrumbList.innerHTML = '';
    breadcrumbNav.style.display = 'none';
    if(loadingMessage) loadingMessage.classList.remove('d-none');
    if(emptyFolderMessage) emptyFolderMessage.classList.add('d-none');
    showError(''); showSuccess('');

    if (!selectedValue) {
        documentManagementSection.classList.add('d-none');
        return;
    }

    documentManagementSection.classList.remove('d-none');
    if(selectedFacilityNameElement) selectedFacilityNameElement.textContent = `Files for: ${currentFacilityName}`;

    try {
        console.log(`Fetching details for facility: ${selectedValue}`);
        // Fetch the specific facility data (which includes the filesystem)
        const response = await fetch(`/api/facilities/${selectedValue}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Error fetching details for facility ${selectedValue}`);
        }
        const facilityFeature = await response.json();

        if (!facilityFeature || !facilityFeature.properties || !facilityFeature.properties.filesystem) {
             throw new Error("Invalid data format received for facility details or filesystem missing.");
        }

        currentFilesystemData = facilityFeature.properties.filesystem;
        console.log("Filesystem data loaded:", currentFilesystemData);

        // Find the root folder ID (assuming convention 'root-facilityId')
        const rootFolderId = `root-${currentSelectedFacilityId}`;
        if (!currentFilesystemData[rootFolderId] || currentFilesystemData[rootFolderId].type !== 'folder') {
            console.error("Root folder not found in filesystem data:", rootFolderId);
            throw new Error("Could not find root folder for this facility.");
        }

        currentFolderId = rootFolderId;
        console.log("Current folder set to root:", currentFolderId);

        // Initial render
        renderBreadcrumbs(currentFolderId);
        renderFolderContents(currentFolderId);
        breadcrumbNav.style.display = 'block'; // Show breadcrumbs

    } catch (error) {
        console.error('Error handling facility selection:', error);
        showError(`Failed to load facility data: ${error.message}`);
        documentManagementSection.classList.add('d-none');
        currentFilesystemData = null;
        currentFolderId = null;
    } finally {
         if(loadingMessage) loadingMessage.classList.add('d-none');
    }
}

// --- Rendering Functions ---

function renderBreadcrumbs(folderId) {
    console.log("Rendering breadcrumbs for folder:", folderId);
    if (!currentFilesystemData || !breadcrumbList) return;

    breadcrumbList.innerHTML = ''; // Clear existing
    const path = [];
    let currentId = folderId;

    // Traverse up to the root
    while (currentId) {
        const folder = currentFilesystemData[currentId];
        if (!folder) break; // Should not happen in consistent data
        path.unshift(folder); // Add to beginning
        currentId = folder.parentId;
    }

    // Create breadcrumb items
    path.forEach((folder, index) => {
        const li = document.createElement('li');
        li.className = `breadcrumb-item ${index === path.length - 1 ? 'active' : ''}`;
        li.setAttribute('aria-current', index === path.length - 1 ? 'page' : 'false');

        if (index === path.length - 1) {
            // Last item (current folder) is not a link
             li.textContent = folder.name === '/' ? 'Root' : folder.name;
        } else {
            const a = document.createElement('a');
            a.href = '#';
            a.dataset.folderId = folder.id; // Store folder ID for click handling
            a.textContent = folder.name === '/' ? 'Root' : folder.name;
            // Add home icon for root
            if (folder.parentId === null) {
                 a.innerHTML = '<i class="fas fa-home"></i> Root';
            }
            li.appendChild(a);
        }
        breadcrumbList.appendChild(li);
    });
     breadcrumbNav.style.display = 'block';
}

function renderFolderContents(folderId) {
    console.log("Rendering contents for folder:", folderId);
    if (!currentFilesystemData || !fileExplorerView) return;

    fileExplorerView.innerHTML = ''; // Clear existing view
    if(loadingMessage) loadingMessage.classList.add('d-none');
    if(emptyFolderMessage) emptyFolderMessage.classList.add('d-none');

    const folder = currentFilesystemData[folderId];
    if (!folder || folder.type !== 'folder') {
        console.error("Invalid folder ID or item is not a folder:", folderId);
        showError("Could not load folder contents.");
        return;
    }

    const childrenIds = folder.children || [];
    if (childrenIds.length === 0) {
        if(emptyFolderMessage) emptyFolderMessage.classList.remove('d-none');
        fileExplorerView.appendChild(emptyFolderMessage);
        return;
    }

    // --- Create Table Structure (Example) ---
    const table = document.createElement('table');
    table.className = 'table table-hover table-sm'; // Bootstrap table classes
    const thead = table.createTHead();
    const tbody = table.createTBody();
    const headerRow = thead.insertRow();
    headerRow.innerHTML = `
        <th scope="col" style="width: 40px;">Type</th>
        <th scope="col">Name</th>
        <th scope="col">Date Modified/Added</th>
        <th scope="col">Size</th>
        <th scope="col" style="width: 100px;">Actions</th>
    `;

    // --- Populate Table Rows ---
    childrenIds.forEach(itemId => {
        const item = currentFilesystemData[itemId];
        if (!item) {
            console.warn("Child item not found in filesystem data:", itemId);
            return; // Skip if data is inconsistent
        }

        const row = tbody.insertRow();
        row.dataset.itemId = item.id; // Store item ID on the row
        row.dataset.itemType = item.type;

        let iconClass = 'fa-question-circle'; // Default icon
        let itemLink = '#';
        let nameContent = item.name;
        let dateContent = '';
        let sizeContent = '';

        if (item.type === 'folder') {
            iconClass = 'fa-folder text-warning'; // Folder icon
            itemLink = '#'; // Folders handled by click listener on name
            dateContent = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-';
            sizeContent = '-';
             row.classList.add('folder-row'); // Add class for styling/event handling
        } else if (item.type === 'file') {
            iconClass = 'fa-file-alt text-secondary'; // File icon
            itemLink = '#'; // Files handled by click listener on name
            dateContent = item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : '-';
            sizeContent = item.size ? `${(item.size / 1024).toFixed(1)} KB` : '-'; // Format size
             row.classList.add('file-row');
        } else if (item.type === 'link') {
            iconClass = 'fa-link text-info'; // Link icon
            itemLink = item.url; // Links open directly
            nameContent = `${item.name} <i class="fas fa-external-link-alt fa-xs"></i>`; // Add external link icon
            dateContent = item.addedAt ? new Date(item.addedAt).toLocaleDateString() : '-';
            sizeContent = '-';
             row.classList.add('link-row');
        }

        // Cell: Type Icon
        const cellType = row.insertCell();
        cellType.innerHTML = `<i class="fas ${iconClass} fa-fw"></i>`;

        // Cell: Name (with link/action trigger)
        const cellName = row.insertCell();
        if (item.type === 'folder' || item.type === 'file') {
            // Folders and files trigger actions via click listener
            cellName.innerHTML = `<a href="#" class="item-link" data-item-id="${item.id}" data-item-type="${item.type}">${item.name}</a>`;
        } else if (item.type === 'link') {
            // Links open directly
            cellName.innerHTML = `<a href="${itemLink}" target="_blank" class="item-link" title="${item.url}">${nameContent}</a>`;
        } else {
             cellName.textContent = item.name;
        }


        // Cell: Date
        const cellDate = row.insertCell();
        cellDate.textContent = dateContent;
        cellDate.classList.add('text-muted', 'small');

        // Cell: Size
        const cellSize = row.insertCell();
        cellSize.textContent = sizeContent;
        cellSize.classList.add('text-muted', 'small');

        // Cell: Actions (Dropdown Example)
        const cellActions = row.insertCell();
        cellActions.classList.add('text-end');
        cellActions.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="actionsDropdown-${item.id}" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="actionsDropdown-${item.id}">
                    <li><a class="dropdown-item action-rename" href="#" data-item-id="${item.id}"><i class="fas fa-edit fa-fw me-2"></i>Rename</a></li>
                    <li><a class="dropdown-item action-move" href="#" data-item-id="${item.id}"><i class="fas fa-folder-open fa-fw me-2"></i>Move</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item action-delete text-danger" href="#" data-item-id="${item.id}"><i class="fas fa-trash-alt fa-fw me-2"></i>Delete</a></li>
                </ul>
            </div>
        `;
    });

    fileExplorerView.appendChild(table);
}


// --- Event Handlers ---

function handleItemClick(event) {
    event.preventDefault(); // Prevent default link behavior

    const target = event.target;
    const itemLink = target.closest('a.item-link'); // Click might be on icon inside link
    const actionLink = target.closest('a.dropdown-item'); // Click on action menu item

    if (itemLink) {
        const itemId = itemLink.dataset.itemId;
        const itemType = itemLink.dataset.itemType;
        console.log(`Item link clicked: ID=${itemId}, Type=${itemType}`);

        if (itemType === 'folder') {
            handleFolderClick(itemId);
        } else if (itemType === 'file') {
            handleFileClick(itemId);
        }
        // Links are handled by href, no JS needed here unless we add tracking etc.

    } else if (actionLink) {
        const itemId = actionLink.dataset.itemId;
        console.log(`Action link clicked for item ID=${itemId}`);

        if (actionLink.classList.contains('action-rename')) {
            handleRenameClick(itemId);
        } else if (actionLink.classList.contains('action-move')) {
            handleMoveClick(itemId);
        } else if (actionLink.classList.contains('action-delete')) {
            handleDeleteClick(itemId);
        }
    }
}

function handleFolderClick(folderId) {
    console.log("Navigating to folder:", folderId);
    if (!currentFilesystemData || !currentFilesystemData[folderId] || currentFilesystemData[folderId].type !== 'folder') {
        console.error("Invalid folder ID clicked:", folderId);
        showError("Cannot navigate to invalid folder.");
        return;
    }
    currentFolderId = folderId;
    renderBreadcrumbs(currentFolderId);
    renderFolderContents(currentFolderId);
}

async function handleFileClick(fileId) {
    console.log("File clicked:", fileId);
     if (!currentSelectedFacilityId || !currentFilesystemData || !currentFilesystemData[fileId] || currentFilesystemData[fileId].type !== 'file') {
        console.error("Invalid file ID clicked or missing context:", fileId);
        showError("Cannot get file link.");
        return;
    }
    const fileData = currentFilesystemData[fileId];

    // Show loading indicator?
    showSuccess(`Getting download link for ${fileData.name}...`);
    showError('');

    try {
        // Use the new API endpoint
        const response = await fetch(`/api/facilities/${currentSelectedFacilityId}/files/${fileId}/url`);
        const result = await response.json();
        if (response.ok && result.url) {
            showSuccess(''); // Clear loading message
            window.open(result.url, '_blank');
        } else {
            throw new Error(result.message || `Failed to get download URL (Status: ${response.status})`);
        }
    } catch (error) {
        console.error('Error fetching document URL:', error);
        showError(`Error getting file link: ${error.message}`);
        showSuccess(''); // Clear loading message
    }
}

function handleBreadcrumbClick(event) {
    const target = event.target.closest('a'); // Find the clicked anchor tag
    if (target && target.dataset.folderId) {
        event.preventDefault();
        const folderId = target.dataset.folderId;
        console.log("Breadcrumb clicked, navigating to folder:", folderId);
        handleFolderClick(folderId); // Reuse folder navigation logic
    }
}

// --- Action Button Handlers (Placeholders/Basic Implementation) ---

function handleNewFolderClick() {
    console.log("New Folder button clicked. Current Parent:", currentFolderId);
    if (!currentSelectedFacilityId || !currentFolderId) {
        showError("Please select a facility and navigate to a folder first.");
        return;
    }

    const folderName = prompt("Enter name for the new folder:");
    if (!folderName || folderName.trim().length === 0) {
        showError("Folder name cannot be empty.");
        return;
    }

    // TODO: Add loading state indication
    showSuccess(`Creating folder '${folderName}'...`);
    showError('');

    fetch(`/api/facilities/${currentSelectedFacilityId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: currentFolderId, name: folderName.trim() })
    })
    .then(async response => {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Failed to create folder (Status: ${response.status})`);
        }
        return response.json();
    })
    .then(result => {
        console.log("Folder created successfully:", result);
        showSuccess(`Folder '${folderName}' created successfully.`);
        // Refresh the view by updating local data and re-rendering
        if (result.updatedFilesystem) {
             currentFilesystemData = result.updatedFilesystem;
             renderFolderContents(currentFolderId); // Re-render current folder
        } else {
            // Fallback: Re-fetch facility data if filesystem wasn't returned
            handleFacilitySelection({ target: { value: currentSelectedFacilityId } });
        }
    })
    .catch(error => {
        console.error("Error creating folder:", error);
        showError(`Error creating folder: ${error.message}`);
        showSuccess(''); // Clear loading message
    });
}

function handleUploadFileClick() {
    console.log("Upload File button clicked. Current Parent:", currentFolderId);
    if (!currentSelectedFacilityId || !currentFolderId) {
        showError("Please select a facility and navigate to a folder first.");
        return;
    }
    // TODO: Implement a proper file upload modal/dialog
    // For now, use a simple input - THIS IS TEMPORARY
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // TODO: Add loading state indication
        showSuccess(`Uploading ${file.name}...`);
        showError('');

        const formData = new FormData();
        formData.append('document', file); // API expects 'document' field
        formData.append('parentId', currentFolderId); // Send parent folder ID

        try {
            const response = await fetch(`/api/facilities/${currentSelectedFacilityId}/files`, {
                method: 'POST',
                // No 'Content-Type' header needed for FormData, browser sets it
                body: formData
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: response.statusText }));
                 throw new Error(errorData.message || `Upload failed (Status: ${response.status})`);
            }
            const result = await response.json();
            console.log("File uploaded successfully:", result);
            showSuccess(`File '${file.name}' uploaded successfully.`);
             // Refresh the view
            if (result.updatedFilesystem) {
                 currentFilesystemData = result.updatedFilesystem;
                 renderFolderContents(currentFolderId);
            } else {
                handleFacilitySelection({ target: { value: currentSelectedFacilityId } });
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            showError(`Error uploading file: ${error.message}`);
            showSuccess(''); // Clear loading message
        }
    };
    fileInput.click(); // Trigger the file selection dialog
}

function handleAddLinkClick() {
    console.log("Add Link button clicked. Current Parent:", currentFolderId);
     if (!currentSelectedFacilityId || !currentFolderId) {
        showError("Please select a facility and navigate to a folder first.");
        return;
    }
    // TODO: Implement a proper modal/dialog for adding links
    const url = prompt("Enter the URL:");
    if (!url || !url.trim().startsWith('http')) {
        showError("Invalid URL provided.");
        return;
    }
    const name = prompt("Enter a name/description for the link:");
     if (!name || name.trim().length === 0) {
        showError("Link name cannot be empty.");
        return;
    }

    // TODO: Add loading state indication
    showSuccess(`Adding link '${name}'...`);
    showError('');

    fetch(`/api/facilities/${currentSelectedFacilityId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: currentFolderId, url: url.trim(), name: name.trim() })
    })
    .then(async response => {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Failed to add link (Status: ${response.status})`);
        }
        return response.json();
    })
    .then(result => {
        console.log("Link added successfully:", result);
        showSuccess(`Link '${name}' added successfully.`);
        // Refresh the view
        if (result.updatedFilesystem) {
             currentFilesystemData = result.updatedFilesystem;
             renderFolderContents(currentFolderId);
        } else {
            handleFacilitySelection({ target: { value: currentSelectedFacilityId } });
        }
    })
    .catch(error => {
        console.error("Error adding link:", error);
        showError(`Error adding link: ${error.message}`);
        showSuccess(''); // Clear loading message
    });
}

function handleRenameClick(itemId) {
    console.log("Rename action clicked for item:", itemId);
    if (!currentSelectedFacilityId || !currentFilesystemData || !currentFilesystemData[itemId]) {
        showError("Cannot rename item: context missing.");
        return;
    }
    const item = currentFilesystemData[itemId];
    const currentName = item.name;

    const newName = prompt(`Enter new name for '${currentName}':`, currentName);
    if (!newName || newName.trim().length === 0 || newName.trim() === currentName) {
        showError("Invalid or unchanged name provided.");
        return;
    }

    // TODO: Add loading state
    showSuccess(`Renaming '${currentName}' to '${newName}'...`);
    showError('');

    fetch(`/api/facilities/${currentSelectedFacilityId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', newName: newName.trim() })
    })
    .then(async response => {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Failed to rename item (Status: ${response.status})`);
        }
        return response.json();
    })
    .then(result => {
        console.log("Item renamed successfully:", result);
        showSuccess(`Item renamed to '${newName}' successfully.`);
        // Refresh view
        if (result.updatedFilesystem) {
             currentFilesystemData = result.updatedFilesystem;
             renderFolderContents(currentFolderId); // Re-render current folder
        } else {
            handleFacilitySelection({ target: { value: currentSelectedFacilityId } });
        }
    })
    .catch(error => {
        console.error("Error renaming item:", error);
        showError(`Error renaming item: ${error.message}`);
        showSuccess('');
    });
}

function handleMoveClick(itemId) {
    console.log("Move action clicked for item:", itemId);
    // TODO: Implement a folder selection modal/UI
    alert("Move functionality requires a folder selection UI (Not Implemented Yet).");
    // Example steps:
    // 1. Show modal to select target folder.
    // 2. Get target folder ID (`newParentId`).
    // 3. Call API: fetch(`/api/facilities/${currentSelectedFacilityId}/items/${itemId}`, { method: 'PUT', ..., body: JSON.stringify({ action: 'move', newParentId: newParentId }) })
    // 4. Refresh view on success.
}

function handleDeleteClick(itemId) {
    console.log("Delete action clicked for item:", itemId);
     if (!currentSelectedFacilityId || !currentFilesystemData || !currentFilesystemData[itemId]) {
        showError("Cannot delete item: context missing.");
        return;
    }
    const item = currentFilesystemData[itemId];
    const itemType = item.type;
    const itemName = item.name;

    const confirmationMessage = itemType === 'folder'
        ? `Are you sure you want to delete the folder '${itemName}' and ALL its contents? This cannot be undone.`
        : `Are you sure you want to delete the ${itemType} '${itemName}'? This cannot be undone.`;

    if (!confirm(confirmationMessage)) {
        return; // User cancelled
    }

    // TODO: Add loading state
    showSuccess(`Deleting ${itemType} '${itemName}'...`);
    showError('');

    fetch(`/api/facilities/${currentSelectedFacilityId}/items/${itemId}`, {
        method: 'DELETE'
    })
     .then(async response => {
        // Check for 200 OK or 204 No Content for successful deletion
        if (!response.ok && response.status !== 204) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Failed to delete item (Status: ${response.status})`);
        }
        // No JSON body expected on successful DELETE usually
        return null;
    })
    .then(() => {
        console.log("Item deleted successfully:", itemId);
        showSuccess(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} '${itemName}' deleted successfully.`);
        // Refresh view - IMPORTANT: Need to re-fetch data as filesystem structure changed
        // Re-selecting the facility triggers a full refresh
        handleFacilitySelection({ target: { value: currentSelectedFacilityId } });
        // A more optimized approach would be to update the local state and re-render,
        // but re-fetching is safer after deletion.
    })
    .catch(error => {
        console.error("Error deleting item:", error);
        showError(`Error deleting item: ${error.message}`);
        showSuccess('');
    });
}


// --- Utility Functions ---
function showError(message) {
    if (!errorMessageDiv) return;
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.toggle('d-none', !message);
}

function showSuccess(message) {
     if (!successMessageDiv) return;
     successMessageDiv.textContent = message;
     successMessageDiv.classList.toggle('d-none', !message);
     // Optional: Auto-hide success message after a delay
     if (message) {
         setTimeout(() => {
             if (successMessageDiv.textContent === message) { // Avoid hiding newer messages
                 showSuccess('');
             }
         }, 4000);
     }
}

// --- REMOVED Old/Unused Functions ---
// Removed handleDocumentUpload
// Removed handleAddLink
// Removed populateDocumentList
// Removed handleDocumentClick
// Removed showUploadStatus
// Removed showAddLinkStatus