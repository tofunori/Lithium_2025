<template>
  <div class="map-container">
    <div v-if="mapError" class="alert alert-danger">
      Error initializing map: {{ mapError }}
    </div>
    <div ref="mapElement" class="map-element"></div>
    <div class="map-controls">
      <label>
        <input type="checkbox" v-model="scaleMarkersByVolume">
        Scale Markers by Volume
      </label>
      <label style="margin-left: 15px;">
        Filter by Technology:
        <select v-model="selectedTechnologyFilter" style="margin-left: 5px;">
          <option v-for="tech in availableTechnologies" :key="tech" :value="tech">
            {{ tech }}
          </option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useFacilityStore } from '@/stores/facilityStore';

const facilityStore = useFacilityStore();
const mapElement = ref(null);
const mapInstance = ref(null);
const mapError = ref(null);
const addedMarkers = ref([]); // To keep track of added markers for clearing
const selectedTechnologyFilter = ref('All'); // Reactive state for the technology filter

// --- Scaling Logic Helpers ---
const parseCapacity = (capacityString) => {
  if (!capacityString || typeof capacityString !== 'string') {
    return 0;
  }
  // Remove commas and extract the first number found
  const cleanedString = capacityString.replace(/,/g, '');
  const match = cleanedString.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[0]) : 0;
};

const calculateMarkerSize = (volume) => {
  const minSize = 12;
  const maxSize = 40; // Max pixel size
  const scaleFactor = 4; // Adjust sensitivity

  if (volume <= 0) {
    return [minSize, minSize];
  }

  // Using a logarithmic scale for better visual differentiation
  const logVolume = Math.log10(volume);
  // Simple linear scaling based on log - adjust formula as needed
  let size = minSize + logVolume * scaleFactor;

  size = Math.max(minSize, Math.min(maxSize, Math.round(size))); // Clamp between min/max and round
  return [size, size];
};
// --- End Scaling Logic Helpers ---

const scaleMarkersByVolume = ref(false); // Reactive state for the scaling toggle

// Compute unique technology types for the filter dropdown
const availableTechnologies = computed(() => {
  const technologies = new Set();
  facilityStore.facilities.forEach(facility => {
    if (facility.properties?.technology) {
      technologies.add(facility.properties.technology);
    }
  });
  // Convert Set to array and add 'All' option
  return ['All', ...Array.from(technologies).sort()];
});


// --- Add status mapping helper ---
const statusMap = {
    'Operating': { class: 'status-operating', label: 'Operating' },
    'Under Construction': { class: 'status-under-construction', label: 'Under Construction' },
    'Planned': { class: 'status-planned', label: 'Planned' },
    'Pilot': { class: 'status-pilot', label: 'Pilot' },
    'Closed': { class: 'status-closed', label: 'Closed/Idle' },
    'Idle': { class: 'status-closed', label: 'Closed/Idle' }, // Map Idle to the same style/label
    // Add any other statuses from your data if necessary
};

function getStatusInfo(statusString) {
    const normalizedStatus = statusString ? statusString.trim() : 'Unknown';
    const key = Object.keys(statusMap).find(k => k.toLowerCase() === normalizedStatus.toLowerCase());
    return key ? statusMap[key] : { class: 'status-unknown', label: 'Unknown' }; // Default to Unknown
}


// --- Modify Legend Control Definition ---
const LegendControl = L.Control.extend({
  options: {
    position: 'bottomright'
  },

  onAdd: function (map) {
    this._container = L.DomUtil.create('div', 'leaflet-control-legend leaflet-control');
    this._list = L.DomUtil.create('ul', '', this._container); // Create ul for list items
    L.DomEvent.disableClickPropagation(this._container);
    this.update([]); // Initialize with empty state or default title
    return this._container;
  },

  update: function (filteredFacilities) {
    // Determine unique statuses present in the filtered facilities
    const presentStatuses = new Map(); // Use Map to store unique status info

    filteredFacilities.forEach(facility => {
        const status = facility.properties?.status;
        const statusInfo = getStatusInfo(status);
        if (!presentStatuses.has(statusInfo.label)) { // Use label as key to avoid duplicates like Closed/Idle
             presentStatuses.set(statusInfo.label, statusInfo);
        }
    });

    // Generate HTML for the legend
    let listHtml = '<h4>Facility Status</h4>'; // Keep the title
    if (presentStatuses.size > 0) {
        presentStatuses.forEach((info) => {
            listHtml += `<li><span class="legend-swatch ${info.class}"><div></div></span> ${info.label}</li>`;
        });
    } else {
        listHtml += '<li>No facilities match current filter.</li>'; // Message when no markers are shown
    }

    this._list.innerHTML = listHtml; // Update only the list content
  },


  onRemove: function (map) {
    // Nothing needed here
  }
});
// --- End Legend Control Definition ---

// --- Add ref for legend instance ---
const legendInstance = ref(null);


// Function to initialize the map
const initializeMap = () => {
  if (!mapElement.value) {
    mapError.value = 'Map container element not found.';
    console.error('[FacilityMap] Map container element not found.');
    console.error(mapError.value);
    return;
  }
  if (mapInstance.value) {
    mapInstance.value.remove(); // Remove existing map instance if re-initializing
  }
  mapError.value = null; // Clear previous errors

  try {
    // Set default icon paths (important for Vite/build tools)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/node_modules/leaflet/dist/images/marker-icon-2x.png', // Adjust path if needed
      iconUrl: '/node_modules/leaflet/dist/images/marker-icon.png',          // Adjust path if needed
      shadowUrl: '/node_modules/leaflet/dist/images/marker-shadow.png',      // Adjust path if needed
    });


    mapInstance.value = L.map(mapElement.value).setView([40, -95], 4); // Center on North America

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(mapInstance.value);

    // Markers will be added directly to the map instance now

    // Add Legend Control
    // Add Legend Control and store instance
    legendInstance.value = new LegendControl();
    legendInstance.value.addTo(mapInstance.value);

    // Add markers once map is ready and facilities are loaded
    addFacilityMarkers();

  } catch (error) {
    mapError.value = `Failed to initialize Leaflet map: ${error.message}`;
    console.error('[FacilityMap] Failed to initialize Leaflet map:', error);
    console.error(mapError.value, error);
  }
};

// Function to add facility markers to the map
const addFacilityMarkers = () => {
    console.log('[FacilityMap] Attempting to add markers. Map ready?', !!mapInstance.value, 'Store loading?', facilityStore.loading, 'Store error?', !!facilityStore.error);
    // TODO: Implement clearing existing markers if needed before adding new ones
    if (!mapInstance.value || facilityStore.loading || facilityStore.error) {
        return; // Wait for map and data
    }
// Clear existing markers before adding new ones
addedMarkers.value.forEach(m => mapInstance.value.removeLayer(m));
addedMarkers.value = []; // Reset the array

    console.log(`[FacilityMap] Adding ${facilityStore.facilities.length} facility markers.`);
    const filteredFacilities = facilityStore.facilities.filter(facility => {
        return selectedTechnologyFilter.value === 'All' || facility.properties?.technology === selectedTechnologyFilter.value;
    });

    console.log(`[FacilityMap] Adding ${filteredFacilities.length} filtered facility markers (Filter: ${selectedTechnologyFilter.value}).`);
    filteredFacilities.forEach(facility => {
        if (facility.geometry && facility.geometry.coordinates) {
            const [lng, lat] = facility.geometry.coordinates;
            if (typeof lat === 'number' && typeof lng === 'number') {
                console.log(`[FacilityMap] Adding marker for ${facility.properties.id} at [${lat}, ${lng}]`);
                const marker = L.marker([lat, lng], { icon: getMarkerIcon(facility.properties) }); // Pass full properties

                // Create popup content
                const popupContent = `
                    <b>${facility.properties.name || 'Unnamed Facility'}</b><br>
                    Company: ${facility.properties.company || 'N/A'}<br>
                    Status: ${facility.properties.status || 'N/A'}<br>
                    <a href="/facilities/${facility.properties.id}" target="_blank">Details</a>
                `;
                marker.bindPopup(popupContent);

                marker.addTo(mapInstance.value); // Add marker directly to the map
                addedMarkers.value.push(marker); // Track the added marker
            } else {
                console.warn(`[FacilityMap] Invalid coordinates for facility ${facility.properties.id}:`, facility.geometry.coordinates);
            }
        } else {
             console.warn(`[FacilityMap] Missing geometry or coordinates for facility ${facility.properties.id}`);
        }
    });
    // Update the legend with the statuses from the currently visible markers
    if (legendInstance.value) {
        legendInstance.value.update(filteredFacilities);
    }
};


// Function to get a styled marker icon, potentially scaled by volume
const getMarkerIcon = (facilityProperties) => {
  const status = facilityProperties?.status;
  const capacity = facilityProperties?.capacity; // Assuming 'capacity' is the property name
  const statusClass = status ? status.toLowerCase().replace(/\s+/g, '-') : 'unknown';
  const validStatuses = ['operating', 'under-construction', 'planned', 'pilot', 'closed', 'idle'];
  const finalStatusClass = validStatuses.includes(statusClass) ? statusClass : 'unknown';

  let size = [20, 20]; // Default size (Increased again)
  let anchor = [12, 12]; // Default anchor (Adjusted again)

  if (scaleMarkersByVolume.value) {
    const volume = parseCapacity(capacity);
    if (volume > 0) {
        size = calculateMarkerSize(volume);
        anchor = [Math.round(size[0] / 2), Math.round(size[1] / 2)]; // Center anchor
        console.log(`[FacilityMap] Scaling marker for ${facilityProperties.id} (Volume: ${volume}) to size: ${size}`);
    }
  }

  return L.divIcon({
    className: `status-marker status-${finalStatusClass}`,
    html: `<div style="width: ${size[0]}px; height: ${size[1]}px;"></div>`, // Apply size directly for simplicity, or adjust CSS
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1]] // Adjust popup anchor
  });
};


// Watch for changes in facilities data to update markers
watch(() => facilityStore.facilities, (newFacilities) => {
  if (mapInstance.value && newFacilities.length > 0) {
    console.log('[FacilityMap] Watcher: facilityStore.facilities changed.', newFacilities);
    addFacilityMarkers();
  }
}, { deep: true });

// Watch for loading state changes
watch(() => facilityStore.loading, (isLoading) => {
    console.log('[FacilityMap] Watcher: facilityStore.loading changed to', isLoading);
    if (!isLoading && !facilityStore.error) {
        addFacilityMarkers(); // Add markers when loading finishes successfully
    }
});

// Watcher for the toggle state
watch(scaleMarkersByVolume, () => {
    console.log(`[FacilityMap] Scaling toggled: ${scaleMarkersByVolume.value}. Refreshing markers.`);
    addFacilityMarkers(); // Re-add markers with new sizes
});

// Watcher for the technology filter
watch(selectedTechnologyFilter, () => {
    console.log(`[FacilityMap] Technology filter changed: ${selectedTechnologyFilter.value}. Refreshing markers.`);
    addFacilityMarkers(); // Re-add markers based on the new filter
});


onMounted(() => {
  console.log('[FacilityMap] Component mounted.');
  // Ensure facilities are fetched if not already loaded
  if (facilityStore.facilities.length === 0 && !facilityStore.loading) {
    console.log('[FacilityMap] Facilities store empty or not loading, calling fetchFacilities.');
    facilityStore.fetchFacilities();
  }
  // Initialize map after the component is mounted and DOM is ready
  console.log('[FacilityMap] Calling initializeMap.');
  initializeMap();
}); // Close onMounted

onUnmounted(() => {
  if (mapInstance.value) {
    console.log('[FacilityMap] Component unmounted, removing map instance.');
    mapInstance.value.remove();
    mapInstance.value = null; // Clean up the ref
  }
});
</script>

<style scoped>
/* Map Controls Styling */
.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 5px 10px;
  border-radius: 4px;
  z-index: 1000; /* Ensure it's above map tiles */
  font-size: 0.85rem;
}

.map-controls label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.map-controls input[type="checkbox"] {
  margin-right: 5px;
}

.map-container {
  height: 400px; /* Default height, can be adjusted */
  width: 100%;
  position: relative; /* Needed for absolute positioning of error message if desired */
}

.map-element {
  height: 100%;
  width: 100%;
  border-radius: 6px; /* Match dashboard card style */
}

.alert {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000; /* Ensure error is visible above map tiles */
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

/* Style adjustments for marker cluster popups if needed */
:deep(.leaflet-popup-content-wrapper) {
  border-radius: 4px;
}
:deep(.leaflet-popup-content) {
    font-size: 0.85rem;
    line-height: 1.4;
}
:deep(.leaflet-popup-content b) {
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
    display: block;
}
:deep(.leaflet-popup-content a) {
    color: #007bff;
    text-decoration: none;
}
:deep(.leaflet-popup-content a:hover) {
    text-decoration: underline;
}



/* Override default Leaflet marker background */
:deep(.leaflet-marker-icon) {
  background-color: transparent !important;
  border: none !important; /* Also remove default border if any */
}

/* New Status Marker Styles */
/* Style the inner div created by L.DivIcon's html */
:deep(.status-marker div) {
  width: 24px;  /* Increased default size again */
  height: 24px; /* Increased default size again */
  border-radius: 50%;
  border: 1px solid black;
  box-sizing: border-box; /* Include border in the element's total width and height */
}

/* Status-specific background colors */
:deep(.status-operating div) {
  background-color: #28a745; /* Green */
}
:deep(.status-under-construction div) {
  background-color: #ffc107; /* Orange/Yellow */
}
:deep(.status-planned div) {
  background-color: #007bff; /* Blue */
}
:deep(.status-pilot div) {
  background-color: #6f42c1; /* Purple */
}
:deep(.status-closed div),
:deep(.status-idle div) {
  background-color: #dc3545; /* Red - Keeping existing logic for these */
}
:deep(.status-unknown div) {
  background-color: #6c757d; /* Grey */
}

/* Legend Control Styling */
:deep(.leaflet-control-legend) {
  background-color: rgba(255, 255, 255, 0.85);
  padding: 10px 15px;
  border-radius: 5px;
  box-shadow: 0 1px 5px rgba(0,0,0,0.4);
  line-height: 1.4;
  font-size: 0.8rem;
}

:deep(.leaflet-control-legend h4) {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: bold;
  text-align: center;
}

:deep(.leaflet-control-legend ul) {
  list-style: none;
  padding: 0;
  margin: 0;
}

:deep(.leaflet-control-legend li) {
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

:deep(.leaflet-control-legend .legend-swatch) {
  display: inline-block; /* Use inline-block for proper alignment */
  width: 18px; /* Match marker size */
  height: 18px; /* Match marker size */
  margin-right: 8px;
  vertical-align: middle; /* Align swatch with text */
  background-color: transparent !important; /* Ensure span itself is transparent */
}

/* Ensure the inner div within the swatch takes the color and shape */
:deep(.leaflet-control-legend .legend-swatch div) {
   width: 100%;
   height: 100%;
   border-radius: 50%; /* Keep it circular */
   border: 1px solid black; /* Match marker border */
   box-sizing: border-box;
}

/* Apply status colors to the inner div of the swatch */
:deep(.leaflet-control-legend .status-operating div) { background-color: #28a745; }
:deep(.leaflet-control-legend .status-under-construction div) { background-color: #ffc107; }
:deep(.leaflet-control-legend .status-planned div) { background-color: #007bff; }
:deep(.leaflet-control-legend .status-pilot div) { background-color: #6f42c1; }
:deep(.leaflet-control-legend .status-closed div) { background-color: #dc3545; } /* Covers idle too */
:deep(.leaflet-control-legend .status-unknown div) { background-color: #6c757d; }

</style>