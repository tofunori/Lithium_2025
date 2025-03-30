// edit-facility.js - Logic for the Edit Facility page

let currentFacilityId = null;
let currentFacilityData = null; // Store the original fetched data

// Removed Document DOM Element variables

document.addEventListener('DOMContentLoaded', async () => {
    // Removed getting Document DOM Elements

    // 1. Check Login Status
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) return; // Stop if not logged in

    // 2. Get Facility ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentFacilityId = urlParams.get('id');

    const pageTitleElement = document.getElementById('editPageTitle');
    const cancelButton = document.getElementById('cancelButton');
    const form = document.getElementById('editFacilityForm');

    if (!currentFacilityId) {
        showError('No facility ID provided in the URL.');
        if (pageTitleElement) pageTitleElement.textContent = 'Error Loading Facility';
        if (form) form.style.display = 'none'; // Hide form if no ID
        return;
    }

    // 3. Fetch Existing Facility Data
    try {
        const response = await fetch(`/api/facilities/${currentFacilityId}`);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Facility with ID "${currentFacilityId}" not found.`);
            } else {
                throw new Error(`Error fetching facility data: ${response.statusText}`);
            }
        }
        currentFacilityData = await response.json();

        // 4. Populate the Form
        populateForm(currentFacilityData);
        if (pageTitleElement) pageTitleElement.textContent = `Edit: ${currentFacilityData.properties.name}`;

        // Set Cancel button link AFTER data is loaded and ID is confirmed
        if (cancelButton) {
            cancelButton.href = `facilities/${currentFacilityId}.html`;
        }

        // Removed Upload Button Listener

    } catch (error) {
        console.error('Error loading facility data:', error);
        showError(`Failed to load facility data: ${error.message}`);
         if (pageTitleElement) pageTitleElement.textContent = 'Error Loading Facility';
         if (form) form.style.display = 'none'; // Hide form on error
    }

    // 5. Add Form Submit Listener (for facility properties update)
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // 6. Setup Header Auth Status
    checkAuthStatus();
});

// Function to populate form fields
function populateForm(facility) {
    const props = facility.properties;
    const geometry = facility.geometry;

    // Basic Info
    document.getElementById('facilityName').value = props.name || '';
    document.getElementById('facilityId').value = props.id || ''; // Should always exist, but good practice
    document.getElementById('company').value = props.company || '';
    document.getElementById('status').value = props.status || 'Operating';
    document.getElementById('address').value = props.address || '';
    document.getElementById('region').value = props.region || '';
    document.getElementById('country').value = props.country || '';

    // Location
    if (geometry && geometry.type === 'Point' && geometry.coordinates) {
        document.getElementById('longitude').value = geometry.coordinates[0];
        document.getElementById('latitude').value = geometry.coordinates[1];
    }

    // Technical Details
    document.getElementById('capacity').value = props.capacity || '';
    document.getElementById('technology').value = props.technology || '';
    // Use yearStarted or yearPlanned depending on status
    document.getElementById('yearStarted').value = props.yearStarted || props.yearPlanned || '';
    document.getElementById('size').value = props.size || '';
    document.getElementById('feedstock').value = props.feedstock || '';
    document.getElementById('products').value = props.products || '';
    document.getElementById('technologyDetails').value = props.technologyDetails || '';

    // Description & Media
    document.getElementById('description').value = props.description || '';
    document.getElementById('website').value = props.website || '';
    document.getElementById('companyLogo').value = props.companyLogo || '';
    document.getElementById('facilityImage').value = props.facilityImage || '';
    document.getElementById('fundingSource').value = props.fundingSource || '';

    // Timeline (Convert array back to JSON string for textarea)
    if (props.timeline && Array.isArray(props.timeline)) {
        try {
            document.getElementById('timeline').value = JSON.stringify(props.timeline, null, 2); // Pretty print
        } catch (e) {
            console.error("Error stringifying timeline JSON", e);
            document.getElementById('timeline').value = '[]'; // Default to empty array on error
        }
    } else {
        document.getElementById('timeline').value = '';
    }

    // Removed call to populateDocumentList
}

// Removed populateDocumentList function
// Removed handleDocumentClick function
// Removed handleDocumentUpload function
// Removed showUploadStatus function


// Function to handle form submission (for facility properties)
async function handleFormSubmit(event) {
    event.preventDefault();
    showError(''); // Clear previous errors
    showSuccess(''); // Clear previous success

    // --- Gather data from form ---
    const updatedProperties = {
        // Basic Info
        name: document.getElementById('facilityName').value,
        id: document.getElementById('facilityId').value, // ID is read-only but needed
        company: document.getElementById('company').value || undefined,
        address: document.getElementById('address').value || undefined,
        status: document.getElementById('status').value,
        region: document.getElementById('region').value || undefined,
        country: document.getElementById('country').value || undefined,
        // Technical Details
        capacity: document.getElementById('capacity').value || undefined,
        technology: document.getElementById('technology').value || undefined,
        yearStarted: document.getElementById('yearStarted').value || undefined,
        size: document.getElementById('size').value || undefined,
        feedstock: document.getElementById('feedstock').value || undefined,
        products: document.getElementById('products').value || undefined,
        technologyDetails: document.getElementById('technologyDetails').value || undefined,
        // Description & Media
        description: document.getElementById('description').value || undefined,
        website: document.getElementById('website').value || undefined,
        companyLogo: document.getElementById('companyLogo').value || undefined,
        facilityImage: document.getElementById('facilityImage').value || undefined,
        fundingSource: document.getElementById('fundingSource').value || undefined,
        // IMPORTANT: Preserve existing documents array from currentFacilityData
        documents: currentFacilityData?.properties?.documents || []
    };

     // Handle potentially missing yearStarted/yearPlanned based on status
     if (updatedProperties.status === 'Planned' && updatedProperties.yearStarted) {
         updatedProperties.yearPlanned = updatedProperties.yearStarted;
         delete updatedProperties.yearStarted;
     } else if (updatedProperties.status !== 'Planned') {
         delete updatedProperties.yearPlanned; // Ensure yearPlanned is not set if not Planned status
     } else if (updatedProperties.status === 'Planned' && !updatedProperties.yearStarted) {
         // If status is Planned but year field is empty, remove both year properties
         delete updatedProperties.yearStarted;
         delete updatedProperties.yearPlanned;
     }


    // Handle Timeline JSON
    let timelineArray = [];
    const timelineInput = document.getElementById('timeline').value.trim();
    if (timelineInput) {
        try {
            timelineArray = JSON.parse(timelineInput);
            if (!Array.isArray(timelineArray)) throw new Error("Timeline must be a JSON array.");
        } catch (e) {
            showError(`Invalid Timeline JSON: ${e.message}`);
            return;
        }
    }
    updatedProperties.timeline = timelineArray.length > 0 ? timelineArray : undefined;


    // Handle Geometry
    const longitude = parseFloat(document.getElementById('longitude').value);
    const latitude = parseFloat(document.getElementById('latitude').value);
    if (isNaN(longitude) || isNaN(latitude)) {
         showError('Valid Longitude and Latitude are required.');
         return;
    }
    // Geometry is not updated via this form/endpoint currently, but keep it for potential future use
    // const geometry = {
    //     type: "Point",
    //     coordinates: [longitude, latitude]
    // };

    // --- Send data to API ---
    try {
        const response = await fetch(`/api/facilities/${currentFacilityId}`, { // Use PUT and ID
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedProperties), // Send only properties
        });

        const result = await response.json();

        if (response.ok) {
            showSuccess(`Facility "${updatedProperties.name}" updated successfully! Redirecting...`);
            // Update local data in case user stays on page somehow
            currentFacilityData.properties = result; // Backend returns updated properties
            setTimeout(() => {
                // Redirect back to the detail page
                window.location.href = `facilities/${currentFacilityId}.html`;
            }, 2000);
        } else {
            showError(result.message || `Error updating facility (Status: ${response.status}).`);
        }
    } catch (error) {
        console.error('Error submitting facility update:', error);
        showError('An unexpected error occurred. Please try again.');
    }
}

// --- Utility Functions ---
function showError(message) {
    const errorMessageDiv = document.getElementById('errorMessage');
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.toggle('d-none', !message);
}

function showSuccess(message) {
     const successMessageDiv = document.getElementById('successMessage');
     successMessageDiv.textContent = message;
     successMessageDiv.classList.toggle('d-none', !message);
}


// --- Auth Check/Logout (Copied) ---
async function checkLogin() {
    try {
        const response = await fetch('/api/session');
        const sessionData = await response.json();
        if (!sessionData.loggedIn) {
            window.location.href = 'login.html'; // Redirect to login if not authenticated
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking session status:', error);
        window.location.href = 'login.html'; // Redirect on error
        return false;
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
            window.location.href = 'index.html'; // Go to dashboard after logout
        } else {
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('An error occurred during logout.');
    }
}