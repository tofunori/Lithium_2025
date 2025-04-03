// js/pages/ChartsPage.js

// Assuming Vue and Chart.js (Chart) are loaded globally via CDN

const ChartsPage = {
  template: `
    <div class="container mt-4">
      <!-- Page Title -->
      <h2>Charts & Stats</h2>
      <hr>

      <div v-if="loading" class="text-center my-5">
          <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading data...</span>
          </div>
      </div>
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
      
      <div v-else>
          <!-- Stats Cards Row -->
          <div class="row mb-4">
              <div class="col-md-3">
                  <div class="stats-card text-center">
                      <div class="icon text-primary"><i class="fas fa-industry"></i></div>
                      <div class="number">{{ stats.total }}</div>
                      <div class="label">Total Facilities</div>
                  </div>
              </div>
              <div class="col-md-3">
                  <div class="stats-card text-center">
                      <div class="icon text-success"><i class="fas fa-check-circle"></i></div>
                      <div class="number">{{ stats.operating }}</div>
                      <div class="label">Operating</div>
                  </div>
              </div>
              <div class="col-md-3">
                  <div class="stats-card text-center">
                      <div class="icon text-warning"><i class="fas fa-hard-hat"></i></div>
                      <div class="number">{{ stats.construction }}</div>
                      <div class="label">Under Construction</div>
                  </div>
              </div>
              <div class="col-md-3">
                  <div class="stats-card text-center">
                      <div class="icon text-info"><i class="fas fa-clipboard-list"></i></div>
                      <div class="number">{{ stats.planned }}</div>
                      <div class="label">Planned</div>
                  </div>
              </div>
              <!-- Add Pilot/Closed if needed -->
          </div>

          <!-- Charts Row 1 -->
          <div class="row mb-4">
              <div class="col-md-12">
                  <div class="card">
                      <div class="card-header"><h5>Capacity by Status (tonnes per year)</h5></div>
                      <div class="card-body">
                          <canvas ref="capacityChartCanvas" style="width:100%; height:300px;"></canvas> <!-- Use ref with explicit dimensions -->
                      </div>
                  </div>
              </div>
          </div>

          <!-- Charts Row 2 -->
          <div class="row">
              <div class="col-md-6 mb-4"> <!-- Added mb-4 for spacing on small screens -->
                  <div class="card">
                      <div class="card-header"><h5>Recycling Technologies Distribution</h5></div>
                      <div class="card-body">
                          <canvas ref="technologiesChartCanvas" style="width:100%; height:300px;"></canvas> <!-- Use ref with explicit dimensions -->
                      </div>
                  </div>
              </div>
              <div class="col-md-6 mb-4"> <!-- Added mb-4 -->
                  <div class="card">
                      <div class="card-header"><h5>Geographic Distribution (by Region/Country)</h5></div>
                      <div class="card-body">
                          <canvas ref="regionsChartCanvas" style="width:100%; height:300px;"></canvas> <!-- Use ref with explicit dimensions -->
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  `,
  data() {
    return {
      facilities: [],
      loading: true,
      error: null,
      // Chart instances - store them to destroy later
      capacityChartInstance: null,
      technologiesChartInstance: null,
      regionsChartInstance: null,
      _isBeingDestroyed: false, // Flag to track component unmounting
    };
  },
  computed: {
    // Calculate statistics based on fetched facilities
    stats() {
      const counts = {
        total: this.facilities.length,
        operating: 0,
        construction: 0,
        planned: 0,
        pilot: 0,
        closed: 0,
      };
      this.facilities.forEach(f => {
        const status = f.properties.status;
        if (status === 'Operating') counts.operating++;
        else if (status === 'Under Construction') counts.construction++;
        else if (status === 'Planned') counts.planned++;
        else if (status === 'Pilot') counts.pilot++;
        else if (status === 'Closed') counts.closed++;
      });
      return counts;
    },
    // --- Data processing for charts ---
    capacityByStatusData() {
        const capacity = { 'Operating': 0, 'Under Construction': 0, 'Planned': 0, 'Pilot': 0, 'Closed': 0 };
        this.facilities.forEach(f => {
            const status = f.properties.status || 'Unknown';
            const cap = this.parseCapacity(f.properties.capacity);
            if (capacity.hasOwnProperty(status)) {
                capacity[status] += cap;
            }
        });
        // Prepare for Chart.js bar chart
        return {
            labels: Object.keys(capacity),
            datasets: [{
                label: 'Capacity (t/yr)',
                data: Object.values(capacity),
                backgroundColor: [ // Match status colors if possible
                    '#4CAF50', // Operating
                    '#FFC107', // Construction
                    '#2196F3', // Planned
                    '#9C27B0', // Pilot
                    '#607D8B'  // Closed
                ]
            }]
        };
    },
    technologyDistributionData() {
        const techCounts = {};
        this.facilities.forEach(f => {
            const tech = f.properties.technology || 'Unknown';
            // Basic grouping - might need refinement based on actual data variations
            const techClean = tech.toLowerCase().includes('hydro') ? 'Hydrometallurgical' 
                            : tech.toLowerCase().includes('pyro') ? 'Pyrometallurgical' 
                            : tech.toLowerCase().includes('direct') ? 'Direct Recycling' 
                            : 'Other/Unknown';
            techCounts[techClean] = (techCounts[techClean] || 0) + 1;
        });
         // Prepare for Chart.js pie/doughnut chart
        return {
            labels: Object.keys(techCounts),
            datasets: [{
                label: 'Technology Types',
                data: Object.values(techCounts),
                // Add background colors if desired
            }]
        };
    },
    regionDistributionData() {
        const regionCounts = {};
        this.facilities.forEach(f => {
            const region = f.properties.region || f.properties.country || 'Unknown'; // Fallback to country
            regionCounts[region] = (regionCounts[region] || 0) + 1;
        });
         // Prepare for Chart.js pie/doughnut chart
        return {
            labels: Object.keys(regionCounts),
            datasets: [{
                label: 'Facilities by Region/Country',
                data: Object.values(regionCounts),
            }]
        };
    }
  },
  methods: {
    // Fetch facility data (needed for stats and charts)
    async fetchFacilities() {
      this.loading = true;
      this.error = null;
      console.log("ChartsPage: Fetching facilities...");
      try {
        // No auth needed for public facility data
        const response = await fetch('/api/facilities'); 
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        this.facilities = data.features || [];
        console.log(`ChartsPage: Fetched ${this.facilities.length} facilities.`);
        // Don't render charts here, let mounted hook handle it after await

      } catch (err) {
        console.error('ChartsPage: Error fetching facilities:', err);
        this.error = `Failed to load data for charts: ${err.message}`;
        this.facilities = [];
      } finally {
        this.loading = false;
      }
    },
     // Helper to parse capacity string
     parseCapacity(capacityStr) {
        if (!capacityStr || typeof capacityStr !== 'string') return 0;
        const match = capacityStr.match(/([\d,]+)/);
        return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
    },
    // Initialize/Update all charts
    renderCharts() {
        console.log("Rendering charts...");
        try {
            // Check if Chart.js is still available
            if (typeof Chart === 'undefined') {
                console.error("Chart.js not available when rendering charts");
                return;
            }
            
            // Add a flag to track if component is being unmounted
            if (this._isBeingDestroyed) {
                console.warn("Component is being unmounted, skipping chart rendering");
                return;
            }
            
            // Check if refs are available
            if (!this.$refs.capacityChartCanvas) {
                console.error("Canvas refs not available. DOM might not be ready.");
                // Try again after a short delay
                setTimeout(() => {
                    if (!this._isBeingDestroyed && this.$refs.capacityChartCanvas) {
                        console.log("Retrying chart rendering after delay...");
                        this.renderCapacityChart();
                        this.renderTechnologiesChart();
                        this.renderRegionsChart();
                    }
                }, 500);
                return;
            }
            // We will destroy individual charts in their respective render methods
            // this.destroyCharts(); // REMOVED - Don't destroy all charts here
            
            
            // Render each chart with individual try/catch blocks
            try {
                this.renderCapacityChart();
            } catch (e) {
                console.error("Error rendering capacity chart:", e);
            }
            
            try {
                this.renderTechnologiesChart();
            } catch (e) {
                console.error("Error rendering technologies chart:", e);
            }
            
            try {
                this.renderRegionsChart();
            } catch (e) {
                console.error("Error rendering regions chart:", e);
            }
            
            console.log("All charts rendered successfully");
        } catch (err) {
            console.error("Error in main renderCharts method:", err);
        }
    },
    // Render Capacity Chart
    renderCapacityChart() {
        try {
            // Skip if component is being unmounted
            if (this._isBeingDestroyed) {
                console.warn("Component is being unmounted, skipping capacity chart rendering");
                return;
            }
            
            const canvas = this.$refs.capacityChartCanvas;
            if (!canvas) {
                console.error("Capacity chart canvas ref not found.");
                return;
            }
            
            if (!this.capacityByStatusData) {
                console.warn("Capacity chart data not ready.");
                return;
            }
            
            // Get canvas context and check if it's valid
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error("Failed to get 2D context for capacity chart");
                return;
            }
            
            // Destroy previous instance if it exists
            if (this.capacityChartInstance) {
                try {
                    this.capacityChartInstance.destroy();
                } catch (e) {
                    console.warn("Error destroying previous capacity chart:", e);
                }
                this.capacityChartInstance = null;
            }
            
            // Create new chart with error handling
            console.log("Creating new capacity chart...");
            this.capacityChartInstance = new Chart(ctx, {
                type: 'bar',
                data: this.capacityByStatusData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Capacity (t/yr)' } }
                    },
                    plugins: {
                        legend: { display: false },
                        // Add animation configuration to reduce potential issues
                        animation: {
                            duration: 500 // Shorter animation duration
                        }
                    }
                }
            });
            
            console.log("Capacity chart created successfully");
        } catch (err) {
            console.error("Error in renderCapacityChart:", err);
        }
    },
     // Render Technologies Chart
     renderTechnologiesChart() {
        try { // Add try/catch block
            // Skip if component is being unmounted
            if (this._isBeingDestroyed) {
                console.warn("Component is being unmounted, skipping technologies chart rendering");
                return;
            }
            
            const canvas = this.$refs.technologiesChartCanvas;
             if (!canvas) {
                 console.error("Technologies chart canvas ref not found.");
                 return;
            }
            if (!this.technologyDistributionData) {
                console.warn("Technology chart data not ready.");
                return;
            }
            
            // Get canvas context and check if it's valid
            const ctx = canvas.getContext('2d'); // Add this line to define ctx
            if (!ctx) {
                console.error("Failed to get 2D context for technologies chart");
                return;
            }
            
        // Destroy previous instance if it exists
        if (this.technologiesChartInstance) {
            try {
                this.technologiesChartInstance.destroy();
            } catch (e) {
                console.warn("Error destroying previous technologies chart:", e);
            }
            this.technologiesChartInstance = null;
        }

        console.log("Creating new technologies chart...");
        this.technologiesChartInstance = new Chart(ctx, { // Use ctx
            type: 'doughnut', // Or 'pie'
            data: this.technologyDistributionData,
             options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    animation: { duration: 500 }
                }
            }
        });
        console.log("Technologies chart created successfully");
        } catch (err) {
            console.error("Error in renderTechnologiesChart:", err);
        }
    },
     // Render Regions Chart
     renderRegionsChart() {
        try { // Added try block
            // Skip if component is being unmounted
            if (this._isBeingDestroyed) {
                console.warn("Component is being unmounted, skipping regions chart rendering");
                return;
            }
            
            const canvas = this.$refs.regionsChartCanvas;
            if (!canvas) {
                console.error("Regions chart canvas ref not found.");
                return;
            }
            if (!this.regionDistributionData) {
                console.warn("Region chart data not ready.");
                return;
            }
            
            // Get canvas context and check if it's valid
            const ctx = canvas.getContext('2d'); // Added context retrieval
            if (!ctx) {
                console.error("Failed to get 2D context for regions chart");
                return;
            }
            
            // Destroy previous instance if it exists
            if (this.regionsChartInstance) {
                try {
                    this.regionsChartInstance.destroy();
                } catch (e) {
                    console.warn("Error destroying previous regions chart:", e);
                }
                this.regionsChartInstance = null;
            }
            
            console.log("Creating new regions chart...");
            this.regionsChartInstance = new Chart(ctx, { // Use ctx
                type: 'pie', // Or 'doughnut'
                data: this.regionDistributionData,
                 options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        animation: { duration: 500 }
                    }
                }
            });
            console.log("Regions chart created successfully"); // Added success log
        } catch (err) {
            console.error("Error in renderRegionsChart:", err); // Added catch block
        }
    },
    // Destroy chart instances when component is unmounted
    destroyCharts() {
        // Cancel any pending animation frames to prevent post-unmount rendering attempts
        if (window.cancelAnimationFrame) {
            // Store the current requestAnimationFrame ID
            const id = window.requestAnimationFrame(() => {});
            // Cancel all animation frames up to that ID
            for (let i = id; i >= 0; i--) {
                window.cancelAnimationFrame(i);
            }
            console.log(`Canceled animation frames up to ID ${id}`);
        }
        
        // Destroy chart instances
        if (this.capacityChartInstance) this.capacityChartInstance.destroy();
        if (this.technologiesChartInstance) this.technologiesChartInstance.destroy();
        if (this.regionsChartInstance) this.regionsChartInstance.destroy();
        
        // Clear references
        this.capacityChartInstance = null;
        this.technologiesChartInstance = null;
        this.regionsChartInstance = null;
        
        console.log("Chart instances destroyed.");
    }
  },
  async mounted() { // Make mounted async
      console.log("VUE ChartsPage component mounted - this should only happen in the Vue router flow"); // Debug log
      
      // Reset state for clean initialization
      this._isBeingDestroyed = false;
      this.capacityChartInstance = null;
      this.technologiesChartInstance = null;
      this.regionsChartInstance = null;
      
      // Ensure Chart.js is loaded
      if (typeof Chart === 'undefined') {
          console.error("Chart.js not loaded. Charts cannot be rendered.");
          this.error = "Chart library failed to load.";
          this.loading = false;
          return;
      }
      
      try {
          // Fetch data when component is mounted and wait for it
          await this.fetchFacilities();
          
          // Only render charts *after* data is fetched and component is mounted
          if (!this.error) {
              // Use nextTick to ensure DOM is fully updated
              this.$nextTick(() => {
                  // Add a slightly longer delay to ensure DOM is fully rendered
                  setTimeout(() => {
                      console.log("Rendering charts after delay...");
                      if (!this._isBeingDestroyed) {
                          this.renderCharts();
                      }
                  }, 250);
              });
          }
      } catch (err) {
          console.error("Error in mounted hook:", err);
          this.error = `Error initializing charts: ${err.message}`;
      }
  },
  beforeUnmount() {
    console.log("VUE ChartsPage component unmounting - this should happen when navigating away"); // Debug log
    // Set the flag to prevent any pending chart renders
    this._isBeingDestroyed = true;
    // Destroy charts before component is unmounted to prevent memory leaks
    this.destroyCharts();
  }
};

// Make available for import in app.js
export default ChartsPage;