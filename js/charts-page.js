// charts-page.js - Logic for the Charts & Stats page

document.addEventListener('DOMContentLoaded', function() {
    loadChartsPageData();
    checkAuthStatus(); // Also check login status for header
});

let chartsPageData = null;

async function loadChartsPageData() {
    try {
        const response = await fetch('/api/facilities');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        chartsPageData = await response.json();

        if (!chartsPageData || !chartsPageData.features) {
             console.error('Fetched data is not in the expected format:', chartsPageData);
             // Display error message?
             return;
        }

        // Initialize components
        updateStatistics(chartsPageData);
        initializeCharts(chartsPageData);

    } catch (error) {
        console.error('Error fetching facility data for charts:', error);
        // Display error messages on the page if needed
        document.querySelector('.total-facilities').textContent = 'Err';
        // Could add error messages to chart canvases
    }
}

// --- Helper Functions (Copied/adapted from original dashboard.js) ---

// Helper function to count facilities by status
function getFacilitiesByStatus(facilityCollection) {
  const counts = {
    "Operating": 0,
    "Under Construction": 0,
    "Planned": 0,
    "Pilot": 0,
    "Closed": 0 // Added Closed status if needed
  };
  if (!facilityCollection || !facilityCollection.features) return counts;

  facilityCollection.features.forEach(feature => {
    const status = feature.properties.status;
    if (counts[status] !== undefined) {
      counts[status]++;
    } else {
        console.warn("Unknown status found:", status); // Log unknown statuses
    }
  });
  return counts;
}

// Helper function to count facilities by region
function getFacilitiesByRegion(facilityCollection) {
  const counts = {};
   if (!facilityCollection || !facilityCollection.features) return counts;

  facilityCollection.features.forEach(feature => {
    const region = feature.properties.region || "Unknown"; // Handle missing region
    if (!counts[region]) {
      counts[region] = 0;
    }
    counts[region]++;
  });
  return counts;
}

// Helper function to count facilities by technology
function getFacilitiesByTechnology(facilityCollection) {
  const counts = {};
   if (!facilityCollection || !facilityCollection.features) return counts;

  facilityCollection.features.forEach(feature => {
    const technology = feature.properties.technology || "Unknown"; // Handle missing technology
    if (!counts[technology]) {
      counts[technology] = 0;
    }
    counts[technology]++;
  });
  return counts;
}

// --- Statistics Update ---

function updateStatistics(facilityCollection) {
    const statusCounts = getFacilitiesByStatus(facilityCollection);
    const totalFacilities = facilityCollection?.features?.length ?? 0;

    // Update counters
    const totalEl = document.querySelector('.total-facilities');
    const operatingEl = document.querySelector('.operating-facilities');
    const constructionEl = document.querySelector('.construction-facilities');
    const plannedEl = document.querySelector('.planned-facilities');

    if (totalEl) totalEl.textContent = totalFacilities;
    if (operatingEl) operatingEl.textContent = statusCounts['Operating'];
    if (constructionEl) constructionEl.textContent = statusCounts['Under Construction'];
    // Combine Planned and Pilot for the card display as before
    if (plannedEl) plannedEl.textContent = (statusCounts['Planned'] || 0) + (statusCounts['Pilot'] || 0);
}


// --- Charts Initialization ---
let capacityChartInstance = null;
let technologiesChartInstance = null;
let regionsChartInstance = null;

function initializeCharts(facilityCollection) {
    createCapacityChart(facilityCollection);
    createTechnologiesChart(facilityCollection);
    createRegionsChart(facilityCollection);
}

// Create capacity by status chart
function createCapacityChart(facilityCollection) {
    const ctx = document.getElementById('capacityChart');
    if (!ctx) return;
    if (capacityChartInstance) capacityChartInstance.destroy();

    const capacities = {
        'Operating': 0,
        'Under Construction': 0,
        'Planned': 0,
        'Pilot': 0
    };
     if (!facilityCollection || !facilityCollection.features) {
         console.warn("No data for capacity chart.");
         return;
     }

    // Helper to parse capacity (copied from dashboard.js)
    function parseCapacity(capacityStr) {
        if (!capacityStr || typeof capacityStr !== 'string') return null;
        const cleanedStr = capacityStr.replace(/,/g, '').replace(/\+/g, '');
        const match = cleanedStr.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[0], 10);
            return isNaN(num) ? null : num;
        }
        return null;
    }

    facilityCollection.features.forEach(feature => {
        const props = feature.properties;
        const capacityNum = parseCapacity(props.capacity);
        const status = props.status;
        if (capacityNum !== null && capacities[status] !== undefined) {
             capacities[status] += capacityNum;
        }
    });

    capacityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(capacities),
            datasets: [{
                label: 'Processing Capacity (tonnes/year)',
                data: Object.values(capacities),
                backgroundColor: ['#4CAF50', '#FFC107', '#2196F3', '#9C27B0'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Tonnes per Year' } } }
        }
    });
}

// Create technologies distribution chart
function createTechnologiesChart(facilityCollection) {
    const ctx = document.getElementById('technologiesChart');
    if (!ctx) return;
     if (technologiesChartInstance) technologiesChartInstance.destroy();

    const techCounts = getFacilitiesByTechnology(facilityCollection);
     if (Object.keys(techCounts).length === 0) {
         console.warn("No data for technologies chart.");
         return;
     }

    technologiesChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(techCounts),
            datasets: [{
                data: Object.values(techCounts),
                backgroundColor: ['#4CAF50', '#FFC107', '#2196F3', '#9C27B0', '#FF5722', '#607D8B', '#795548', '#E91E63'] // Added more colors
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
}

// Create regions distribution chart
function createRegionsChart(facilityCollection) {
    const ctx = document.getElementById('regionsChart');
    if (!ctx) return;
     if (regionsChartInstance) regionsChartInstance.destroy();

    const regionCounts = getFacilitiesByRegion(facilityCollection);
     if (Object.keys(regionCounts).length === 0) {
         console.warn("No data for regions chart.");
         return;
     }

    regionsChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(regionCounts),
            datasets: [{
                data: Object.values(regionCounts),
                 backgroundColor: ['#4CAF50', '#FFC107', '#2196F3', '#9C27B0', '#FF5722', '#607D8B', '#795548', '#E91E63'] // Added more colors
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
}

// --- Auth Check/Logout (Copied from index.html script) ---
async function checkAuthStatus() {
    const authStatusElement = document.getElementById('authStatus');
    if (!authStatusElement) return;
    try {
        const response = await fetch('/api/session');
        const sessionData = await response.json();
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
    } catch (error) {
        console.error('Error checking auth status:', error);
        authStatusElement.innerHTML = '<span class="text-danger small">Session check failed</span>';
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