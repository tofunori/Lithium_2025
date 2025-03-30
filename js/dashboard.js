// Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData(); // Start by loading data
});

// --- Data Loading ---

let allFacilityData = null; // Store fetched data globally within this script's scope

async function loadDashboardData() {
    try {
        const response = await fetch('/api/facilities');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allFacilityData = await response.json(); // Store the fetched data

        if (!allFacilityData || !allFacilityData.features) {
             console.error('Fetched data is not in the expected format:', allFacilityData);
             // Display error message to user?
             return;
        }

        // Once data is loaded, initialize the dashboard components
        initializeDashboard();

    } catch (error) {
        console.error('Error fetching facility data:', error);
        // Display an error message on the page
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.innerHTML = '<p class="text-danger text-center">Failed to load facility data. Please try again later.</p>';
        }
         const listElement = document.getElementById('facilitiesList');
         if (listElement) {
             listElement.innerHTML = '<p class="text-danger text-center">Failed to load facility data.</p>';
         }
         // Could also disable charts or show error messages there
    }
}

// --- Initialization ---

function initializeDashboard() {
    if (!allFacilityData) {
        console.error("Facility data not loaded, cannot initialize dashboard.");
        return;
    }
    // Initialize the map
    initializeMap(allFacilityData);

    // Populate facilities list
    populateFacilitiesList(allFacilityData);

    // Initialize charts
    initializeCharts(allFacilityData);

    // Set up event listeners
    setupEventListeners(); // Event listeners might trigger filtering/searching which now need the data

    // Update statistics
    updateStatistics(allFacilityData);
}


// --- Helper Functions (Adapted from facilityData.js) ---

// Helper function to get a facility by ID
function getFacilityById(id, facilityCollection) {
  if (!facilityCollection || !facilityCollection.features) return null;
  return facilityCollection.features.find(feature => feature.properties.id === id);
}

// Helper function to count facilities by status
function getFacilitiesByStatus(facilityCollection) {
  const counts = {
    "Operating": 0,
    "Under Construction": 0,
    "Planned": 0,
    "Pilot": 0
  };
  if (!facilityCollection || !facilityCollection.features) return counts;

  facilityCollection.features.forEach(feature => {
    const status = feature.properties.status;
    if (counts[status] !== undefined) {
      counts[status]++;
    }
  });
  return counts;
}

// Helper function to count facilities by region
function getFacilitiesByRegion(facilityCollection) {
  const counts = {};
   if (!facilityCollection || !facilityCollection.features) return counts;

  facilityCollection.features.forEach(feature => {
    const region = feature.properties.region;
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
    const technology = feature.properties.technology;
    if (!counts[technology]) {
      counts[technology] = 0;
    }
    counts[technology]++;
  });
  return counts;
}

// Get CSS class for facility status (no change needed)
function getStatusClass(status) {
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


// --- Map Initialization (Adapted) ---
let mapInstance = null; // Store map instance
let markersLayer = null; // Store markers layer

function initializeMap(facilityCollection) {
    if (mapInstance) { // Avoid re-initializing map
       mapInstance.remove();
    }
    // Create map centered on North America
    mapInstance = L.map('map').setView([39.8283, -98.5795], 4);

    // Add OpenStreetMap as base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(mapInstance);

    // Add alternate basemaps
    const basemaps = {
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }),
        "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19
        }),
        "Terrain": L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        })
    };

    // Set default basemap
    basemaps["OpenStreetMap"].addTo(mapInstance);

    // Add layer control
    L.control.layers(basemaps).addTo(mapInstance);

    // REMOVED: Initialize marker cluster group
    // markersLayer = L.markerClusterGroup();

    // Function to get marker color based on status
    function getMarkerColor(status) {
        switch(status.toLowerCase()) {
            case 'operating':
                return '#4CAF50'; // Green
            case 'under construction':
                return '#FFC107'; // Amber
            case 'planned':
                return '#2196F3'; // Blue
            case 'pilot':
                return '#9C27B0'; // Purple
            default:
                return '#757575'; // Grey
        }
    }

    // Create markers for each facility using the fetched data
    L.geoJSON(facilityCollection, {
        pointToLayer: function(feature, latlng) {
            const status = feature.properties.status;
            const color = getMarkerColor(status);

            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: color,
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        },
        onEachFeature: function(feature, layer) {
            // Create popup content
            const props = feature.properties;
            const popupContent = `
                <div class="info-box">
                    <h3>${props.name}</h3>
                    <p class="info-company">Company: ${props.company}</p>
                    <p>Location: ${props.address}</p>
                    <p>Status: <strong>${props.status}</strong></p>
                    <p class="info-capacity">Capacity: ${props.capacity}</p>
                    <p>Technology: ${props.technology}</p>
                    <p>${props.description}</p>
                    <a href="facilities/${props.id}.html" class="btn btn-sm btn-primary mt-2">View Details</a>
                    <a href="${props.website}" target="_blank" class="btn btn-sm btn-outline-secondary mt-2">Visit Website</a>
                </div>
            `;

            layer.bindPopup(popupContent);

            // Add click listener to highlight facility in list
            layer.on('click', function() {
                highlightFacilityInList(props.id);
            });
        }
    }).addTo(mapInstance); // ADDED directly to mapInstance

    // REMOVED: Add marker cluster to map
    // mapInstance.addLayer(markersLayer);
}

// --- Facilities List (Adapted) ---

function populateFacilitiesList(facilityCollection) {
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
                        <small class="text-muted">${props.company}, ${props.address}</small>
                    </div>
                    <span class="status-badge ${statusClass}">${props.status}</span>
                </div>
            </a>
        `;

        facilitiesList.appendChild(facilityItem);
    });
}

// Highlight a facility in the list (Adapted)
function highlightFacilityInList(facilityId) {
    // Remove highlight from all facilities
    document.querySelectorAll('.facility-item').forEach(item => {
        item.classList.remove('bg-light');
    });

    // Add highlight to selected facility using data-id
    const facilityItem = document.querySelector(`.facility-item[data-id="${facilityId}"]`);
    if (facilityItem) {
        facilityItem.classList.add('bg-light');
        // facilityItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // Removed scrolling behavior
    }
}

// --- Event Listeners and Filtering/Searching (Adapted) ---

function setupEventListeners() {
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
            filterFacilities(filter, allFacilityData); // Pass data
        });
    });

    // Search input
    const searchInput = document.getElementById('facilitySearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchFacilities(this.value, allFacilityData); // Pass data
        });
    }
}

// Filter facilities by status (Adapted)
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
            (filter === 'planned' && (status === 'planned' || status === 'pilot'))) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Search facilities by name, company, or location (Adapted)
function searchFacilities(query, facilityCollection) {
    const facilityItems = document.querySelectorAll('.facility-item');
    const searchQuery = query.toLowerCase();
     if (!facilityCollection || !facilityCollection.features) return; // Check if data exists

    facilityItems.forEach(item => {
        const facilityId = item.getAttribute('data-id'); // Get ID from data attribute
        const facility = getFacilityById(facilityId, facilityCollection); // Use helper with data

        if (!facility) return;

        const props = facility.properties;
        const searchText = `${props.name} ${props.company} ${props.address}`.toLowerCase();

        if (searchText.includes(searchQuery)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// --- Charts (Adapted) ---
let capacityChartInstance = null;
let technologiesChartInstance = null;
let regionsChartInstance = null;

function initializeCharts(facilityCollection) {
    createCapacityChart(facilityCollection);
    createTechnologiesChart(facilityCollection);
    createRegionsChart(facilityCollection);
}

// Create capacity by status chart (Adapted)
function createCapacityChart(facilityCollection) {
    const ctx = document.getElementById('capacityChart');
    if (!ctx) return;
    if (capacityChartInstance) capacityChartInstance.destroy(); // Destroy previous chart if exists

    // Calculate capacities by status
    const capacities = {
        'Operating': 0,
        'Under Construction': 0,
        'Planned': 0,
        'Pilot': 0
    };
     if (!facilityCollection || !facilityCollection.features) {
         // Handle case where data isn't available for chart
         console.warn("No data for capacity chart.");
         return;
     }

    facilityCollection.features.forEach(feature => {
        const props = feature.properties;
        const capacityStr = props.capacity;
        const status = props.status;

        if (capacityStr && capacityStr.includes('tonnes') && capacities[status] !== undefined) {
            const match = capacityStr.match(/(\d+),?(\d+)?/);
            if (match) {
                const capacityNum = parseInt(match[0].replace(',', ''));
                if (!isNaN(capacityNum)) {
                    capacities[status] += capacityNum;
                }
            }
        }
    });

    // Create chart
    capacityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(capacities),
            datasets: [{
                label: 'Processing Capacity (tonnes/year)',
                data: Object.values(capacities),
                backgroundColor: [
                    '#4CAF50',
                    '#FFC107',
                    '#2196F3',
                    '#9C27B0'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Tonnes per Year'
                    }
                }
            }
        }
    });
}

// Create technologies distribution chart (Adapted)
function createTechnologiesChart(facilityCollection) {
    const ctx = document.getElementById('technologiesChart');
    if (!ctx) return;
     if (technologiesChartInstance) technologiesChartInstance.destroy();

    const techCounts = getFacilitiesByTechnology(facilityCollection); // Use helper with data
     if (Object.keys(techCounts).length === 0) {
         console.warn("No data for technologies chart.");
         return;
     }

    // Create chart
    technologiesChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(techCounts),
            datasets: [{
                data: Object.values(techCounts),
                backgroundColor: [
                    '#4CAF50',
                    '#FFC107',
                    '#2196F3',
                    '#9C27B0',
                    '#FF5722',
                    '#607D8B'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Create regions distribution chart (Adapted)
function createRegionsChart(facilityCollection) {
    const ctx = document.getElementById('regionsChart');
    if (!ctx) return;
     if (regionsChartInstance) regionsChartInstance.destroy();

    const regionCounts = getFacilitiesByRegion(facilityCollection); // Use helper with data
     if (Object.keys(regionCounts).length === 0) {
         console.warn("No data for regions chart.");
         return;
     }

    // Create chart
    regionsChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(regionCounts),
            datasets: [{
                data: Object.values(regionCounts),
                backgroundColor: [
                    '#4CAF50',
                    '#FFC107',
                    '#2196F3',
                    '#9C27B0',
                    '#FF5722',
                    '#607D8B'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// --- Statistics Update (Adapted) ---

function updateStatistics(facilityCollection) {
    const statusCounts = getFacilitiesByStatus(facilityCollection); // Use helper with data
    const totalFacilities = facilityCollection?.features?.length ?? 0;

    // Update counters
    const totalEl = document.querySelector('.total-facilities');
    const operatingEl = document.querySelector('.operating-facilities');
    const constructionEl = document.querySelector('.construction-facilities');
    const plannedEl = document.querySelector('.planned-facilities');

    if (totalEl) totalEl.textContent = totalFacilities;
    if (operatingEl) operatingEl.textContent = statusCounts['Operating'];
    if (constructionEl) constructionEl.textContent = statusCounts['Under Construction'];
    if (plannedEl) plannedEl.textContent = statusCounts['Planned'] + (statusCounts['Pilot'] || 0);
}
