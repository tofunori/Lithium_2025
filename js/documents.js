// js/documents.js - Logic for the File Explorer Documents page

// --- State Variables ---
var currentSelectedFacilityId = null;
var currentFacilityName = null; // Store the name for display
var currentFilesystemData = null; // Holds the entire filesystem map for the selected facility
var currentFolderId = null; // ID of the folder currently being viewed
var isAllFacilitiesMode = false; // Flag for combined view
var allFacilitiesData = null; // Holds data for all facilities (features array)

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
var folderTreeViewContainer = null;
var folderTreeView = null;

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
    folderTreeViewContainer = document.getElementById('folderTreeViewContainer');
    folderTreeView = document.getElementById('folderTreeView');
    // --- End Query DOM Elements ---

    // Check if essential elements exist
    if (!facilitySelect || !documentManagementSection || !fileExplorerView || !breadcrumbList || !newFolderButton || !folderTreeViewContainer || !folderTreeView) {
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
    if(folderTreeView) folderTreeView.innerHTML = '<p class="text-muted small">Select a facility to view folders.</p>'; // Clear tree view
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
    folderTreeView?.removeEventListener('click', handleTreeViewClick);

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
    if (folderTreeView) {
        folderTreeView.addEventListener('click', handleTreeViewClick);
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
    if(folderTreeView) folderTreeView.innerHTML = '<p class="text-muted small">Loading folders...</p>'; // Clear tree view
    showError(''); showSuccess('');

    if (!selectedValue) {
        documentManagementSection.classList.add('d-none');
        return;
    }

    documentManagementSection.classList.remove('d-none');
    // --- Start Data Fetching Logic ---
    try {
        if (selectedValue === 'ALL') {
            // --- Handle "All Facilities" Mode ---
            console.log("Fetching data for ALL facilities...");
            isAllFacilitiesMode = true;
            allFacilitiesData = null; // Clear previous combined data
            currentFilesystemData = null; // Ensure single facility data is cleared
            currentFolderId = null; // No specific folder selected initially
            currentSelectedFacilityId = 'ALL'; // Set special ID
            currentFacilityName = 'All Facilities'; // Update display name

            if(selectedFacilityNameElement) selectedFacilityNameElement.textContent = `Files for: All Facilities`;
            // Clear breadcrumbs and main content view for 'All' mode initial state
            breadcrumbList.innerHTML = '';
            breadcrumbNav.style.display = 'none';
            fileExplorerView.innerHTML = '<p class="text-muted p-3">Select a folder from the tree view.</p>'; // Placeholder message
            if(emptyFolderMessage) emptyFolderMessage.classList.add('d-none');


            const response = await fetch('/api/facilities'); // Fetch all facilities
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `Error fetching all facilities`);
            }
            const facilitiesCollection = await response.json();

            if (!facilitiesCollection || !facilitiesCollection.features) {
                throw new Error("Invalid data format received for all facilities.");
            }

            allFacilitiesData = facilitiesCollection.features; // Store the array of facility features
            console.log("All facilities data loaded:", allFacilitiesData);

            // Render the combined tree view
            // Note: renderTreeView will need modification to handle this mode
            renderTreeView(null, null, folderTreeView); // Pass nulls for now, logic will check isAllFacilitiesMode

        } else {
            // --- Handle Single Facility Mode ---
            console.log(`Fetching details for facility: ${selectedValue}`);
            isAllFacilitiesMode = false;
            allFacilitiesData = null; // Clear combined data
            currentFilesystemData = null; // Clear previous single facility data
            currentFolderId = null;
            // currentSelectedFacilityId and currentFacilityName are already set above

            if(selectedFacilityNameElement) selectedFacilityNameElement.textContent = `Files for: ${currentFacilityName}`;

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
            console.log("Single facility filesystem data loaded:", currentFilesystemData);

            // Find the root folder ID
            const rootFolderId = `root-${currentSelectedFacilityId}`;
            if (!currentFilesystemData[rootFolderId] || currentFilesystemData[rootFolderId].type !== 'folder') {
                console.error("Root folder not found in filesystem data:", rootFolderId);
                throw new Error("Could not find root folder for this facility.");
            }

            currentFolderId = rootFolderId;
            console.log("Current folder set to root:", currentFolderId);

            // Initial render for single facility
            renderBreadcrumbs(currentFolderId, currentFilesystemData, currentFacilityName); // Pass filesystem and name
            renderFolderContents(currentFolderId, currentFilesystemData); // Pass filesystem
            breadcrumbNav.style.display = 'block'; // Show breadcrumbs
            renderTreeView(currentFilesystemData, rootFolderId, folderTreeView); // Render the single tree
        }

    } catch (error) {
        console.error('Error handling facility selection:', error);
        showError(`Failed to load data: ${error.message}`);
        documentManagementSection.classList.add('d-none');
        // Reset state variables on error
        currentFilesystemData = null;
        allFacilitiesData = null;
        currentFolderId = null;
        isAllFacilitiesMode = false;
    } finally {
         if(loadingMessage) loadingMessage.classList.add('d-none');
    }
    // --- End Data Fetching Logic ---
}

// --- Rendering Functions ---

function renderBreadcrumbs(folderId, filesystemToUse, facilityNameForContext = null) { // Added params
    console.log("Rendering breadcrumbs for folder:", folderId, "Facility Context:", facilityNameForContext);

    if (!filesystemToUse || !breadcrumbList) {
        console.warn("Filesystem data or breadcrumb list element missing for breadcrumb rendering.");
        if (breadcrumbList) breadcrumbList.innerHTML = ''; // Clear if possible
        if (breadcrumbNav) breadcrumbNav.style.display = 'none';
        return;
    }
    if (!folderId) { // Handle initial 'All Facilities' state where no folder is selected
         breadcrumbList.innerHTML = '';
         breadcrumbNav.style.display = 'none';
         return;
    }


    breadcrumbList.innerHTML = ''; // Clear existing
    const path = [];
    let currentId = folderId;

    // Traverse up to the root using the provided filesystem
    while (currentId) {
        const folder = filesystemToUse[currentId];
        if (!folder) break; // Should not happen in consistent data
        path.unshift(folder); // Add to beginning
        currentId = folder.parentId;
    }

    // Add Facility Name if in 'All Facilities' mode and not at the absolute root
    if (isAllFacilitiesMode && facilityNameForContext && path.length > 0) {
         const facilityLi = document.createElement('li');
         facilityLi.className = 'breadcrumb-item text-muted'; // Non-clickable facility name
         facilityLi.textContent = facilityNameForContext;
         breadcrumbList.appendChild(facilityLi);
    }


    // Create breadcrumb items from the path
    path.forEach((folder, index) => {
        const li = document.createElement('li');
        const isLast = index === path.length - 1;
        li.className = `breadcrumb-item ${isLast ? 'active' : ''}`;
        li.setAttribute('aria-current', isLast ? 'page' : 'false');

        const isRoot = folder.parentId === null;
        const displayName = isRoot ? 'Root' : folder.name;

        if (isLast) {
            // Last item (current folder) is not a link
             li.textContent = displayName;
        } else {
            const a = document.createElement('a');
            a.href = '#';
            a.dataset.folderId = folder.id;
             // Add facilityId to breadcrumb links if in 'All Facilities' mode
            if (isAllFacilitiesMode && currentSelectedFacilityId && currentSelectedFacilityId !== 'ALL') {
                a.dataset.facilityId = currentSelectedFacilityId;
            }

            if (isRoot) {
                 a.innerHTML = `<i class="fas fa-home"></i> ${displayName}`;
            } else {
                 a.textContent = displayName;
            }
            li.appendChild(a);
        }
        breadcrumbList.appendChild(li);
    });

    breadcrumbNav.style.display = path.length > 0 ? 'block' : 'none'; // Show only if path exists
}


function renderFolderContents(folderId, filesystemToUse) { // Added filesystemToUse param
    console.log("Rendering contents for folder:", folderId);

    if (!fileExplorerView) {
        console.error("File explorer view element not found.");
        return;
    }
    fileExplorerView.innerHTML = ''; // Clear existing view
    if(loadingMessage) loadingMessage.classList.add('d-none');
    if(emptyFolderMessage) emptyFolderMessage.classList.add('d-none');

    // Handle initial state for "All Facilities" where no folder is selected
    if (isAllFacilitiesMode && !folderId) {
        fileExplorerView.innerHTML = '<p class="text-muted p-3">Select a folder from the tree view.</p>';
        return;
    }

    // Validate filesystem data
    if (!filesystemToUse) {
        console.error("Filesystem data missing for rendering folder contents.");
        showError("Could not load folder data.");
        return;
    }

    // Validate folderId and get folder data from the provided filesystem
    const folder = filesystemToUse[folderId];
    if (!folder || folder.type !== 'folder') {
        console.error("Invalid folder ID or item is not a folder in the provided filesystem:", folderId);
        // Avoid showing generic error if it's just the initial 'All Facilities' state
        if (!isAllFacilitiesMode || folderId) {
             showError("Could not load folder contents.");
        }
        fileExplorerView.innerHTML = '<p class="text-danger p-3">Error loading folder contents.</p>';
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
        // Use the provided filesystem
        const item = filesystemToUse[itemId];
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


// Helper function to recursively build the tree HTML
function buildTreeHtmlRecursive(folderId, filesystemData, currentSelectedFolderId, facilityId) { // Added facilityId
    const folderData = filesystemData[folderId];
    if (!folderData || folderData.type !== 'folder') {
        return null; // Should not happen with valid data
    }

    const ul = document.createElement('ul');
    ul.className = 'list-unstyled ps-3'; // Indentation for nested levels

    // Sort children folders alphabetically by name
    const childrenFolders = (folderData.children || [])
        .map(id => filesystemData[id])
        .filter(item => item && item.type === 'folder')
        .sort((a, b) => a.name.localeCompare(b.name));

    childrenFolders.forEach(childFolder => {
        const li = document.createElement('li');
        li.className = 'tree-node';

        // Highlight the currently selected folder
        const isActive = childFolder.id === currentSelectedFolderId;
        const link = document.createElement('a');
        link.href = '#';
        link.dataset.folderId = childFolder.id;
        if (facilityId) { // Add facilityId if provided
            link.dataset.facilityId = facilityId;
        }
        link.className = `tree-link d-block p-1 rounded ${isActive ? 'active bg-primary text-white' : 'text-dark'}`;
        link.innerHTML = `<i class="fas fa-folder fa-fw me-1 ${isActive ? '' : 'text-warning'}"></i> ${childFolder.name}`;

        li.appendChild(link);

        // Recursively build for children if they exist
        if (childFolder.children && childFolder.children.length > 0) {
            // Pass facilityId down in the recursive call
            const childUl = buildTreeHtmlRecursive(childFolder.id, filesystemData, currentSelectedFolderId, facilityId);
            if (childUl) {
                // Basic expand/collapse structure (can be enhanced with CSS/JS)
                // Add a toggle icon/button if needed
                li.appendChild(childUl);
            }
        }
        ul.appendChild(li);
    });

    return ul.children.length > 0 ? ul : null;
}

// Main function to render the tree view (handles both single and all facilities mode)
function renderTreeView(filesystemData, rootFolderId, containerElement) {
    if (!containerElement) {
        console.error("Tree view container element not found.");
        return;
    }
    containerElement.innerHTML = ''; // Clear previous tree

    if (isAllFacilitiesMode) {
        // --- Render Combined Tree for All Facilities ---
        console.log("Rendering combined tree view for ALL facilities...");
        if (!allFacilitiesData || allFacilitiesData.length === 0) {
            console.warn("No data available for all facilities mode.");
            containerElement.innerHTML = '<p class="text-muted small">No facilities found or data not loaded.</p>';
            return;
        }

        const rootUl = document.createElement('ul');
        rootUl.className = 'list-unstyled'; // No padding for the absolute root

        // Sort facilities alphabetically by name
        const sortedFacilities = [...allFacilitiesData].sort((a, b) =>
            a.properties.name.localeCompare(b.properties.name)
        );

        sortedFacilities.forEach(facilityFeature => {
            const facilityId = facilityFeature.properties.id;
            const facilityName = facilityFeature.properties.name;
            const facilityFilesystem = facilityFeature.properties.filesystem;

            if (!facilityId || !facilityName) {
                 console.warn("Skipping facility due to missing ID or name:", facilityFeature.properties);
                 return; // Skip this facility
            }
            if (!facilityFilesystem) {
                console.warn(`Skipping facility '${facilityName}' (ID: ${facilityId}) due to missing filesystem data.`);
                // Optionally render a placeholder for this facility
                // const facilityLi = document.createElement('li');
                // facilityLi.className = 'tree-node';
                // facilityLi.innerHTML = `<span class="tree-facility-header d-block p-1 fw-bold text-muted"><i class="fas fa-building fa-fw me-1 text-secondary"></i> ${facilityName} (No documents)</span>`;
                // rootUl.appendChild(facilityLi);
                return; // Skip rendering tree for this facility
            }

            const facilityRootFolderId = `root-${facilityId}`;
            if (!facilityFilesystem[facilityRootFolderId] || facilityFilesystem[facilityRootFolderId].type !== 'folder') {
                console.warn(`Root folder '${facilityRootFolderId}' not found or invalid for facility '${facilityName}' (ID: ${facilityId}).`);
                // Optionally render a placeholder
                // const facilityLi = document.createElement('li');
                // facilityLi.className = 'tree-node';
                // facilityLi.innerHTML = `<span class="tree-facility-header d-block p-1 fw-bold text-muted"><i class="fas fa-building fa-fw me-1 text-secondary"></i> ${facilityName} (Error loading root)</span>`;
                // rootUl.appendChild(facilityLi);
                return; // Skip rendering tree for this facility
            }

            // Create top-level list item for the facility
            const facilityLi = document.createElement('li');
            facilityLi.className = 'tree-node mb-2'; // Add margin between facilities

            // Add facility header (not clickable itself)
            const facilityHeader = document.createElement('span');
            facilityHeader.className = 'tree-facility-header d-block p-1 fw-bold';
            facilityHeader.innerHTML = `<i class="fas fa-building fa-fw me-1 text-secondary"></i> ${facilityName}`;
            facilityLi.appendChild(facilityHeader);

            // Build the folder tree for this facility, starting from its root
            // Pass currentFolderId for potential highlighting within the sub-tree
            // Pass facilityId to be added to data attributes
            const childrenUl = buildTreeHtmlRecursive(facilityRootFolderId, facilityFilesystem, currentFolderId, facilityId);
            if (childrenUl) {
                // Add indentation for the facility's folder structure
                childrenUl.classList.remove('ps-3'); // Remove default indent if buildTreeHtmlRecursive adds it
                childrenUl.classList.add('ps-3'); // Ensure indentation under facility header
                facilityLi.appendChild(childrenUl);
            } else {
                 // Optionally add a note if a facility has a root but no subfolders
                 const noFoldersNote = document.createElement('p');
                 noFoldersNote.className = 'text-muted small ps-3';
                 noFoldersNote.textContent = '(No folders)';
                 facilityLi.appendChild(noFoldersNote);
            }

            rootUl.appendChild(facilityLi);
        });

        containerElement.appendChild(rootUl);
        console.log("Combined tree view rendering complete.");

    } else {
        // --- Render Tree for Single Selected Facility ---
        console.log("Rendering tree view for single facility:", currentSelectedFacilityId);
        if (!filesystemData || !rootFolderId) {
            console.error("Missing data for single facility tree view rendering.");
            containerElement.innerHTML = '<p class="text-danger small">Error loading folder tree data.</p>';
            return;
        }

        const rootFolderData = filesystemData[rootFolderId];
        if (!rootFolderData || rootFolderData.type !== 'folder') {
             console.error("Root folder data invalid for single facility:", rootFolderId);
             containerElement.innerHTML = '<p class="text-danger small">Could not load root folder.</p>';
             return;
        }

        // Create the top-level container for the root folder itself
        const rootUl = document.createElement('ul');
        rootUl.className = 'list-unstyled'; // No padding for the absolute root

        const rootLi = document.createElement('li');
        rootLi.className = 'tree-node';

        const isActive = rootFolderId === currentFolderId;
        const rootLink = document.createElement('a');
        rootLink.href = '#';
        rootLink.dataset.folderId = rootFolderId;
        // Add facilityId for single facility mode root as well
        if (currentSelectedFacilityId && currentSelectedFacilityId !== 'ALL') {
             rootLink.dataset.facilityId = currentSelectedFacilityId;
        }
        rootLink.className = `tree-link d-block p-1 rounded ${isActive ? 'active bg-primary text-white' : 'text-dark'}`;
        rootLink.innerHTML = `<i class="fas fa-home fa-fw me-1 ${isActive ? '' : 'text-warning'}"></i> Root`; // Use Home icon for root

        rootLi.appendChild(rootLink);

        // Build the rest of the tree recursively starting from the root's children
        // Pass facilityId for single facility mode as well
        const childrenUl = buildTreeHtmlRecursive(rootFolderId, filesystemData, currentFolderId, currentSelectedFacilityId);
        if (childrenUl) {
            rootLi.appendChild(childrenUl);
        }

        rootUl.appendChild(rootLi);
        containerElement.appendChild(rootUl);
        console.log("Single facility tree view rendering complete.");
    }
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

function handleFolderClick(folderId, facilityIdFromClick = null) { // Added facilityIdFromClick
    console.log("Navigating to folder:", folderId, "Facility context:", facilityIdFromClick || currentSelectedFacilityId);

    let filesystemToUse = null;
    let facilityIdForContext = null;
    let facilityNameForContext = null;
    let rootIdForTreeRender = null;

    if (isAllFacilitiesMode) {
        // --- All Facilities Mode ---
        if (!facilityIdFromClick) {
            console.error("Facility ID missing in click handler for 'All Facilities' mode.");
            showError("Cannot determine facility context.");
            return;
        }
        facilityIdForContext = facilityIdFromClick;
        const facilityData = allFacilitiesData?.find(f => f.properties.id === facilityIdForContext);

        if (!facilityData || !facilityData.properties || !facilityData.properties.filesystem) {
            console.error("Could not find facility data or filesystem for ID:", facilityIdForContext);
            showError("Error finding facility data.");
            return;
        }
        filesystemToUse = facilityData.properties.filesystem;
        facilityNameForContext = facilityData.properties.name;
        // Update the global state to reflect the facility context of the clicked folder
        currentSelectedFacilityId = facilityIdForContext;
        currentFacilityName = facilityNameForContext;
        rootIdForTreeRender = null; // Tree re-render in 'ALL' mode doesn't need specific root/fs

    } else {
        // --- Single Facility Mode ---
        filesystemToUse = currentFilesystemData;
        facilityIdForContext = currentSelectedFacilityId; // Already set
        facilityNameForContext = currentFacilityName; // Already set
        rootIdForTreeRender = `root-${facilityIdForContext}`;

        if (!filesystemToUse) {
             console.error("Filesystem data is missing for single facility mode.");
             showError("Facility data not loaded correctly.");
             return;
        }
    }

    // Validate the clicked folder within the determined filesystem
    if (!filesystemToUse[folderId] || filesystemToUse[folderId].type !== 'folder') {
        console.error("Invalid folder ID clicked within its filesystem context:", folderId);
        showError("Cannot navigate to invalid folder.");
        return;
    }

    // Update the current folder ID
    currentFolderId = folderId;

    // Update the main section title (especially useful when switching context in 'ALL' mode)
    if(selectedFacilityNameElement) {
        selectedFacilityNameElement.textContent = `Files for: ${facilityNameForContext}`;
    }


    // Render main content and breadcrumbs using the correct filesystem
    renderBreadcrumbs(currentFolderId, filesystemToUse, facilityNameForContext); // Pass filesystem & name
    renderFolderContents(currentFolderId, filesystemToUse); // Pass filesystem

    // Re-render tree view to update active state
    if (folderTreeView) {
         if (isAllFacilitiesMode) {
             // Re-render combined tree (uses global state: allFacilitiesData, currentFolderId)
             renderTreeView(null, null, folderTreeView);
         } else {
             // Re-render single tree
             if (filesystemToUse && rootIdForTreeRender) {
                 renderTreeView(filesystemToUse, rootIdForTreeRender, folderTreeView);
             }
         }
    }
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
        const facilityId = target.dataset.facilityId; // Get facility ID from breadcrumb link (might be undefined)
        console.log("Breadcrumb clicked, navigating to folder:", folderId, "Facility ID:", facilityId);
        // Pass facilityId (will be null/undefined if not in 'All Facilities' mode or clicking root)
        handleFolderClick(folderId, facilityId);
    }
}

function handleTreeViewClick(event) {
    const target = event.target;
    // Example: Find the closest element with a folder ID (adjust selector as needed)
    const folderLink = target.closest('[data-folder-id]');

    if (folderLink && folderLink.dataset.folderId) {
        event.preventDefault();
        const folderId = folderLink.dataset.folderId;
        const facilityId = folderLink.dataset.facilityId; // Get facility ID
        console.log("Tree view folder clicked:", folderId, "Facility ID:", facilityId);
        // Pass both folderId and facilityId (facilityId might be undefined in single mode, handleFolderClick needs to check)
        handleFolderClick(folderId, facilityId);
    }
    // TODO: Add logic for expand/collapse clicks if needed
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
            let filesystemForRender = null;
            let rootIdForTree = null;

            if (isAllFacilitiesMode) {
                // Update the specific facility's data within allFacilitiesData
                const facilityIndex = allFacilitiesData?.findIndex(f => f.properties.id === currentSelectedFacilityId);
                if (facilityIndex !== -1 && allFacilitiesData) {
                    allFacilitiesData[facilityIndex].properties.filesystem = result.updatedFilesystem;
                    filesystemForRender = allFacilitiesData[facilityIndex].properties.filesystem;
                    console.log(`Updated filesystem for ${currentFacilityName} in allFacilitiesData`);
                } else {
                    console.error("Could not find facility in allFacilitiesData to update filesystem.");
                    // Fallback to refetching all data might be needed here, or show error
                     showError("Error updating local data. Please refresh.");
                     return; // Avoid rendering with inconsistent data
                }
                // No specific rootId needed for combined tree render
            } else {
                // Update single facility data
                currentFilesystemData = result.updatedFilesystem;
                filesystemForRender = currentFilesystemData;
                rootIdForTree = `root-${currentSelectedFacilityId}`;
                console.log("Updated currentFilesystemData");
            }

            // Ensure we have valid data before rendering
            if (filesystemForRender && currentFolderId) {
                 renderFolderContents(currentFolderId, filesystemForRender); // Pass updated filesystem

                 // Re-render tree view
                 if (folderTreeView) {
                     if (isAllFacilitiesMode) {
                         renderTreeView(null, null, folderTreeView); // Re-render combined tree
                     } else if (rootIdForTree) {
                         renderTreeView(filesystemForRender, rootIdForTree, folderTreeView); // Re-render single tree
                     }
                 }
            } else {
                 console.error("Filesystem data or current folder ID became invalid after update.");
                 showError("Error refreshing view after folder creation.");
            }

        } else {
            console.warn("API did not return updated filesystem. Falling back to re-fetch.");
            // Fallback: Re-fetch data (handles both modes)
            handleFacilitySelection({ target: { value: currentSelectedFacilityId } }); // currentSelectedFacilityId is 'ALL' or specific ID
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