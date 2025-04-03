// js/pages/DashboardPage.js

// Assuming Leaflet (L) and MarkerCluster are loaded globally via CDN or dynamically
// Assuming authService is available if needed for future API calls

const DashboardPage = {
  template: `
    <div>
      <!-- Hidden Subtitle (managed by router/app now, but kept for reference) -->
      <!-- <p id="page-subtitle-main" style="display: none;">Interactive Map of Recycling Facilities</p> -->
      
      <div class="row">
        <div class="col-12"> 
          <div class="map-container card mb-4"> <!-- Added card and mb-4 -->
             <div class="card-header"> <!-- Temporarily removed d-flex justify-content-between align-items-center -->
                 <span>Facility Map</span>
                 <div class="form-check form-switch form-check-sm">
                    <input class="form-check-input" type="checkbox" role="switch" id="sizeByCapacityToggle" v-model="sizeByCapacity"> <!-- Removed @change -->
                    <label class="form-check-label small" for="sizeByCapacityToggle">Size by Capacity</label>
                 </div>
             </div>
             <div class="card-body p-0" style="position: relative;"> <!-- p-0 for map edge-to-edge -->
                <div id="map" style="height: 65vh;"></div> <!-- Adjusted height -->
                <div class="legend card position-absolute bottom-0 end-0 m-2 p-2 bg-light shadow-sm" style="z-index: 1000;"> <!-- Positioned legend -->
                    <h6 class="mb-1 small">Status</h6>
                    <div class="legend-item small"><div class="legend-color" style="background-color: #4CAF50;"></div>Operating</div>
                    <div class="legend-item small"><div class="legend-color" style="background-color: #FFC107;"></div>Construction</div>
                    <div class="legend-item small"><div class="legend-color" style="background-color: #2196F3;"></div>Planned</div>
                    <div class="legend-item small"><div class="legend-color" style="background-color: #9C27B0;"></div>Pilot</div>
                </div>
             </div>
          </div>
        </div>
      </div>
      <!-- Placeholder for stats or other dashboard elements if needed -->
       <div v-if="loading" class="text-center">Loading map data...</div>
       <div v-if="error" class="alert alert-danger">{{ error }}</div>
    </div>
  `,
  data() {
    return {
      facilities: [],
      loading: true,
      error: null,
      map: null,
      markers: null,
      sizeByCapacity: false, // State for the toggle
      statusColors: { // Define colors for markers
          'Operating': '#4CAF50',
          'Under Construction': '#FFC107',
          'Planned': '#2196F3',
          'Pilot': '#9C27B0',
          'Closed': '#607D8B' // Added color for closed
      }
    };
  },
  // Removed watch block for sizeByCapacity - using @change in template instead
  async mounted() {
    this.loading = true;
    this.error = null;
    try {
      // Leaflet and MarkerCluster should be loaded globally via script tags in <head>
      if (typeof L === 'undefined' || typeof L.markerClusterGroup === 'undefined') {
           // If still not loaded, throw error - indicates issue with script loading in index.html
           console.error("Leaflet or MarkerCluster failed to load from CDN.");
           throw new Error("Leaflet libraries not available.");
      }
      
      this.initMap();
      await this.fetchFacilities();
      
    } catch (err) {
        console.error("Error initializing dashboard:", err);
        this.error = "Failed to load map data. Please try refreshing.";
    } finally {
        this.loading = false;
        // Wait for next tick to ensure DOM is updated after initial render/fetch
        this.$nextTick(() => {
            const toggleElement = document.getElementById('sizeByCapacityToggle');
            if (toggleElement) {
                // Store the bound listener function so we can remove it later
                this._boundToggleListener = this.handleToggleChange.bind(this);
                toggleElement.addEventListener('change', this._boundToggleListener);
                console.log("Programmatic event listener added to toggle.");
            } else {
                console.error("Could not find toggle element to attach listener programmatically.");
            }
        });
    }
  },
  beforeUnmount() {
    // Clean up map instance and listener when component is destroyed
    if (this.map) {
        this.map.remove();
        this.map = null;
        console.log("Map instance removed.");
    }
    // Remove the programmatically added listener
    const toggleElement = document.getElementById('sizeByCapacityToggle');
    if (toggleElement && this._boundToggleListener) {
        toggleElement.removeEventListener('change', this._boundToggleListener);
        console.log("Programmatic event listener removed from toggle.");
        this._boundToggleListener = null; // Clear reference
    }
  },
  methods: {
    initMap() {
      if (this.map) return; // Avoid re-initializing
      
      try {
        this.map = L.map('map').setView([39.8283, -98.5795], 4); // Centered on US

        // --- Define Basemaps ---
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        });

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19
        });

        // --- Add Default Basemap and Layer Control ---
        satelliteLayer.addTo(this.map); // Add Satellite by default

        const baseMaps = {
            "OpenStreetMap": osmLayer,
            "Satellite": satelliteLayer
        };

        L.control.layers(baseMaps).addTo(this.map);

        // --- Initialize Marker Layer Group (Removed Clustering) ---
        this.markers = L.layerGroup(); // Use standard layer group instead of MarkerClusterGroup
        // this.markers = L.markerClusterGroup({ // Optional: Marker cluster options here }); // <-- Keep old code commented for reference
        this.map.addLayer(this.markers);
        console.log("Map initialized with Satellite default and layer control");
      } catch (e) {
         console.error("Error initializing Leaflet map:", e);
         this.error = "Failed to initialize the map.";
         if (this.map) { this.map.remove(); this.map = null; } // Cleanup on error
      }
    },
    async fetchFacilities() {
      console.log("Fetching facilities...");
      try {
        const response = await fetch('/api/facilities'); // Use relative path
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        const data = await response.json();
        this.facilities = data.features || [];
        console.log(`Fetched ${this.facilities.length} facilities.`);
        this.addMarkersToMap();
      } catch (err) {
        console.error('Error fetching facilities:', err);
        this.error = `Failed to fetch facility data: ${err.message}`;
        this.facilities = []; // Clear facilities on error
      }
    },
    // Method to parse capacity string like "10,000 tonnes per year"
    parseCapacity(capacityStr) {
        if (!capacityStr || typeof capacityStr !== 'string') return 0;
        const match = capacityStr.match(/([\d,]+)/); // Extract number part
        return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
    },
    // Calculate marker radius based on capacity
    calculateRadius(capacity) {
        console.log(`CALC_RADIUS: sizeByCapacity=${this.sizeByCapacity}, capacity=${capacity}`); // Debug log
        if (!this.sizeByCapacity || capacity <= 0) {
            console.log(`CALC_RADIUS: Returning default radius (6)`); // Debug log
            return 6; // Default radius
        }
        // Simple scaling - adjust as needed
        const scaleFactor = 0.0005; 
        const minRadius = 5;
        const maxRadius = 30;
        let radius = Math.sqrt(capacity * scaleFactor) + minRadius;
        const finalRadius = Math.min(radius, maxRadius); // Cap radius
        console.log(`CALC_RADIUS: Calculated radius=${finalRadius}`); // Debug log
        return finalRadius;
    },
    addMarkersToMap() {
        if (!this.map || !this.markers) {
            console.error("Map or markers layer not initialized.");
            return;
        }
        console.log("Adding markers to map. Size by capacity:", this.sizeByCapacity);
        this.markers.clearLayers(); // Clear existing markers

        this.facilities.forEach(facility => {
            if (facility.geometry && facility.geometry.coordinates) {
                const [lng, lat] = facility.geometry.coordinates;
                const props = facility.properties;
                const status = props.status || 'Unknown';
                const color = this.statusColors[status] || '#808080'; // Default grey
                const capacity = this.parseCapacity(props.capacity);
                const radius = this.calculateRadius(capacity);

                // Create CircleMarker for status and capacity visualization
                const marker = L.circleMarker([lat, lng], {
                    radius: radius,
                    fillColor: color,
                    color: "#000", // Border color
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.7
                });

                // Create Popup Content
                let popupContent = `<strong>${props.name || 'Unnamed Facility'}</strong><br>Status: ${status}`;
                if (props.company) popupContent += `<br>Company: ${props.company}`;
                if (props.capacity) popupContent += `<br>Capacity: ${props.capacity}`;
                popupContent += `<br><a href="#" @click.prevent="navigateToDetail('${props.id}')">View Details</a>`; // Use router navigation

                marker.bindPopup(popupContent);
                this.markers.addLayer(marker);
            } else {
                console.warn("Facility missing geometry data:", facility.properties?.name);
            }
        });
        
        console.log(`Added ${this.facilities.length} markers.`);
        // Don't fit bounds here automatically, let user pan/zoom
        // if (this.facilities.length > 0) {
        //    this.map.fitBounds(this.markers.getBounds().pad(0.1)); 
        // }
    },
    // New method to handle the change event explicitly
    handleToggleChange() {
        console.log("HANDLE_TOGGLE_CHANGE: Toggle changed, calling addMarkersToMap..."); // Debug log
        this.addMarkersToMap();
    },
     // Method to navigate using Vue Router (called from popup)
     navigateToDetail(facilityId) {
         if (facilityId) {
            this.$router.push({ name: 'FacilityDetail', params: { id: facilityId } });
         }
     }
  }
};

// Make available for import in app.js
export default DashboardPage;