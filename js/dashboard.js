// Dashboard JavaScript - Map Page Logic

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
         // Removed list/chart error handling as they are on different pages
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

    // Set up event listeners (only map-related listeners remain)
    setupEventListeners();
}


// --- Helper Functions (Only those needed for Map) ---

// Get CSS class for facility status (needed for marker color)
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

// --- Capacity Parsing and Radius Calculation (Needed for Map Markers) ---
function parseCapacity(capacityStr) {
    if (!capacityStr || typeof capacityStr !== 'string') return null;
    // Remove commas, '+' signs, and non-numeric characters except the first number part
    const cleanedStr = capacityStr.replace(/,/g, '').replace(/\+/g, '');
    const match = cleanedStr.match(/(\d+)/); // Find the first sequence of digits
    if (match) {
        const num = parseInt(match[0], 10);
        return isNaN(num) ? null : num;
    }
    return null;
}

function calculateRadius(capacityNum) {
    const minRadius = 6;
    const maxRadius = 20;
    const scaleFactor = 0.0002; // Adjust this to control sensitivity

    if (capacityNum === null || capacityNum <= 0) {
        return minRadius; // Default size for unknown/zero capacity
    }
    // Simple linear scale, capped at maxRadius
    let radius = minRadius + capacityNum * scaleFactor;
    return Math.min(radius, maxRadius);
}


// --- Map Initialization (Adapted) ---
let mapInstance = null; // Store map instance
let currentGeoJsonLayer = null; // Store the GeoJSON layer to easily remove/re-add

function initializeMap(facilityCollection) {
    // If map already exists, just update markers, don't re-create map
    if (!mapInstance) {
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
        basemaps["Satellite"].addTo(mapInstance);
        L.control.layers(basemaps).addTo(mapInstance);
    }


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
    // Store the layer group so we can clear and redraw it
    if (currentGeoJsonLayer) {
        mapInstance.removeLayer(currentGeoJsonLayer); // Remove previous layer if updating
    }

    const sizeByCapacity = document.getElementById('sizeByCapacityToggle')?.checked || false;

    currentGeoJsonLayer = L.geoJSON(facilityCollection, {
        pointToLayer: function(feature, latlng) {
            const props = feature.properties;
            const status = props.status;
            const color = getMarkerColor(status);
            let radius = 8; // Default fixed radius

            if (sizeByCapacity) {
                const capacityNum = parseCapacity(props.capacity);
                radius = calculateRadius(capacityNum);
            }

            return L.circleMarker(latlng, {
                radius: radius, // Use dynamic or fixed radius
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
                    <a href="facilities/${props.id}.html" class="btn btn-sm btn-primary mt-2" style="color: #ffffff !important;">View Details</a>
                    <a href="${props.website}" target="_blank" class="btn btn-sm btn-outline-secondary mt-2">Visit Website</a>
                </div>
            `;

            layer.bindPopup(popupContent);

            // REMOVED click listener call to highlight facility in list
            // layer.on('click', function() {
            //     highlightFacilityInList(props.id);
            // });
        }
    }).addTo(mapInstance);
}


// --- Event Listeners (Only Map-Related) ---

function setupEventListeners() {
    // Size by Capacity Toggle Listener
    const sizeToggle = document.getElementById('sizeByCapacityToggle');
    if (sizeToggle) {
        sizeToggle.addEventListener('change', function() {
            // Redraw map markers with the new setting
            initializeMap(allFacilityData); // Re-initialize map markers
        });
    }

    // REMOVED Filter tabs listener
    // REMOVED Search input listener
}

// REMOVED populateFacilitiesList function
// REMOVED highlightFacilityInList function
// REMOVED filterFacilities function
// REMOVED searchFacilities function
// REMOVED initializeCharts function
// REMOVED createCapacityChart function
// REMOVED createTechnologiesChart function
// REMOVED createRegionsChart function
// REMOVED updateStatistics function
