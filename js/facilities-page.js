// facilities-page.js - Logic for the Facilities List page

document.addEventListener('DOMContentLoaded', function() {
    loadFacilitiesPageData(); // Load data and initialize
});

let facilitiesPageData = null;
let isLoggedIn = false; // Store login status

async function loadFacilitiesPageData() {
    isLoggedIn = await checkAuthStatus(); // Check login status first

    try {
        const response = await fetch('/api/facilities');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        facilitiesPageData = await response.json();

        if (!facilitiesPageData || !facilitiesPageData.features) {
             console.error('Fetched data is not in the expected format:', facilitiesPageData);
             // Display error message?
             return;
        }

        // Initialize components, passing login status
        console.log("Calling populateFacilitiesList with isLoggedIn:", isLoggedIn); // Log 4
        populateFacilitiesList(facilitiesPageData, isLoggedIn);
        setupListEventListeners(); // Setup listeners for this page

    } catch (error) {
        console.error('Error fetching facility data for list:', error);
        // Display error messages on the page if needed
         const listElement = document.getElementById('facilitiesList');
         if (listElement) {
             listElement.innerHTML = '<p class="text-danger text-center">Failed to load facilities list.</p>';
         }
    }
}

// --- Helper Functions (Copied/adapted from original dashboard.js) ---

// Helper function to get a facility by ID
function getFacilityById(id, facilityCollection) {
  if (!facilityCollection || !facilityCollection.features) return null;
  return facilityCollection.features.find(feature => feature.properties.id === id);
}

// Get CSS class for facility status
function getStatusClass(status) {
    if (!status) return '';
    switch(status.toLowerCase()) {
        case 'operating':
            return 'status-operating';
        case 'under construction':
            return 'status-construction';
        case 'planned':
            return 'status-planned';
        case 'pilot':
            return 'status-pilot';
        default:
            return '';
    }
}

// --- Facilities List ---

function populateFacilitiesList(facilityCollection, isLoggedIn) { // Added isLoggedIn parameter
    console.log("populateFacilitiesList received isLoggedIn:", isLoggedIn); // Log 5
    const facilitiesList = document.getElementById('facilitiesList');

    if (!facilitiesList) {
        console.error('Facilities list element not found');
        return;
    }
     if (!facilityCollection || !facilityCollection.features) {
         facilitiesList.innerHTML = '<p class="text-muted">No facilities to display.</p>';
         return;
     }

    // Clear existing content
    facilitiesList.innerHTML = '';

    // Create list items for each facility
    facilityCollection.features.forEach(feature => {
        const props = feature.properties;
        const statusClass = getStatusClass(props.status);

        const facilityItem = document.createElement('div');
        // Add data-id attribute for easier selection
        facilityItem.setAttribute('data-id', props.id);
        facilityItem.className = `facility-item`; // Removed ID from class for simplicity
        facilityItem.innerHTML = `
            <a href="facilities/${props.id}.html">
                <div class="d-flex align-items-center justify-content-between">
                    <div>
                        <h6 class="mb-0">${props.name}</h6>
                        <small class="text-muted">${props.company || ''}, ${props.address || ''}</small>
                    </div>
                    <div> <!-- Wrapper for status and potential edit button -->
                        <span class="status-badge ${statusClass}">${props.status}</span>
                        ${isLoggedIn === true ? `<a href="edit-facility.html?id=${props.id}" class="btn btn-sm btn-outline-secondary ms-2" title="Edit Facility"><i class="fas fa-edit"></i></a>` : ''}
                    </div>
                </div>
            </a> <!-- Main link still goes to detail page -->
        `;

        facilitiesList.appendChild(facilityItem);
    });
}

// --- Event Listeners and Filtering/Searching ---

function setupListEventListeners() {
    // Filter tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });

            // Add active class to clicked button
            this.classList.add('active');

            // Apply filter using the stored data
            const filter = this.getAttribute('data-filter');
            filterFacilities(filter, facilitiesPageData); // Pass data
        });
    });

    // Search input
    const searchInput = document.getElementById('facilitySearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchFacilities(this.value, facilitiesPageData); // Pass data
        });
    }
}

// Filter facilities by status
function filterFacilities(filter, facilityCollection) {
    const facilityItems = document.querySelectorAll('.facility-item');
     if (!facilityCollection || !facilityCollection.features) return; // Check if data exists

    facilityItems.forEach(item => {
        const facilityId = item.getAttribute('data-id'); // Get ID from data attribute
        const facility = getFacilityById(facilityId, facilityCollection); // Use helper with data

        if (!facility) return;

        const status = facility.properties.status.toLowerCase();

        if (filter === 'all' ||
            (filter === 'operating' && status === 'operating') ||
            (filter === 'construction' && status === 'under construction') ||
            // Combine Planned and Pilot for the 'Planned' tab
            (filter === 'planned' && (status === 'planned' || status === 'pilot'))) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Search facilities by name, company, or location
function searchFacilities(query, facilityCollection) {
    const facilityItems = document.querySelectorAll('.facility-item');
    const searchQuery = query.toLowerCase();
     if (!facilityCollection || !facilityCollection.features) return; // Check if data exists

    facilityItems.forEach(item => {
        const facilityId = item.getAttribute('data-id'); // Get ID from data attribute
        const facility = getFacilityById(facilityId, facilityCollection); // Use helper with data

        if (!facility) return;

        const props = facility.properties;
        const searchText = `${props.name || ''} ${props.company || ''} ${props.address || ''}`.toLowerCase();

        if (searchText.includes(searchQuery)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}


// --- Auth Check/Logout ---
async function checkAuthStatus() {
    console.log("Checking auth status..."); // Log 1
    try {
        const response = await fetch('/api/session');
        const sessionData = await response.json();
        console.log("Session API response:", sessionData); // Log 2
        updateHeaderAuthStatus(sessionData); // Update header based on status
        console.log("Returning loggedIn status:", sessionData.loggedIn); // Log 3
        return sessionData.loggedIn; // Return login status
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateHeaderAuthStatus({ loggedIn: false, error: true }); // Update header indicating error
        return false; // Assume not logged in on error
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
            window.location.reload();
        } else {
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('An error occurred during logout.');
    }
}