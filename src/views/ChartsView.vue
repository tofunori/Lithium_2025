<template>
  <div class="container mt-4">
    <!-- Page Title -->
    <h2>Charts &amp; Stats</h2>
    <hr>

    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading data...</span>
      </div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <!-- Stats Cards Row -->
      <div class="row mb-4 stats-row">
        <div class="col-md-3 col-sm-6 mb-3">
          <div class="stats-card text-center">
            <div class="icon text-primary"><i class="fas fa-industry"></i></div>
            <div class="number">{{ stats.total }}</div>
            <div class="label">Total Facilities</div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6 mb-3">
          <div class="stats-card text-center">
            <div class="icon text-success"><i class="fas fa-check-circle"></i></div>
            <div class="number">{{ stats.operating }}</div>
            <div class="label">Operating</div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6 mb-3">
          <div class="stats-card text-center">
            <div class="icon text-warning"><i class="fas fa-hard-hat"></i></div>
            <div class="number">{{ stats.construction }}</div>
            <div class="label">Under Construction</div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6 mb-3">
          <div class="stats-card text-center">
            <div class="icon text-info"><i class="fas fa-clipboard-list"></i></div>
            <div class="number">{{ stats.planned }}</div>
            <div class="label">Planned</div>
          </div>
        </div>
      </div>

      <!-- Charts Row 1 -->
      <div class="row mb-4">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header"><h5>Capacity by Status (tonnes per year)</h5></div>
            <div class="card-body">
              <canvas ref="capacityChartCanvas" style="width:100%; height:300px;"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row 2 -->
      <div class="row">
        <div class="col-md-6 mb-4">
          <div class="card">
            <div class="card-header"><h5>Recycling Technologies Distribution</h5></div>
            <div class="card-body">
              <canvas ref="technologiesChartCanvas" style="width:100%; height:300px;"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-6 mb-4">
          <div class="card">
            <div class="card-header"><h5>Geographic Distribution (by Region/Country)</h5></div>
            <div class="card-body">
              <canvas ref="regionsChartCanvas" style="width:100%; height:300px;"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onActivated, onDeactivated, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// Add safety patch for Chart.js to prevent operations on destroyed charts
// This helps prevent "Cannot read properties of null" errors
const originalDraw = Chart.prototype.draw;
Chart.prototype.draw = function() {
  try {
    // Check if the chart context is still valid before drawing
    if (!this.ctx || !this.canvas || !document.contains(this.canvas)) {
      console.warn(`Chart draw prevented - chart ${this.id} has invalid context or is not in DOM`);
      return;
    }
    return originalDraw.apply(this, arguments);
  } catch (error) {
    console.error(`Error in patched Chart.draw for chart ${this.id}:`, error);
    // Don't rethrow to prevent uncaught exceptions
  }
};

// Add similar safety patch for _drawDataset method which is involved in the error
const originalDrawDataset = Chart.prototype._drawDataset;
if (originalDrawDataset) {
  Chart.prototype._drawDataset = function(meta) {
    try {
      // Check if the chart is still valid before drawing dataset
      if (!this.ctx || !this.canvas || !document.contains(this.canvas)) {
        console.warn(`Chart _drawDataset prevented - chart ${this.id} has invalid context or is not in DOM`);
        return;
      }
      return originalDrawDataset.apply(this, arguments);
    } catch (error) {
      console.error(`Error in patched Chart._drawDataset for chart ${this.id}:`, error);
      // Don't rethrow to prevent uncaught exceptions
    }
  };
}

// --- State ---
const facilities = ref([]);
const loading = ref(true);
const error = ref(null);
const capacityChartInstance = ref(null);
const technologiesChartInstance = ref(null);
const regionsChartInstance = ref(null);

// --- Canvas Refs ---
const capacityChartCanvas = ref(null);
const technologiesChartCanvas = ref(null);
const regionsChartCanvas = ref(null);

// --- Computed Stats ---
const stats = computed(() => {
  const counts = { total: facilities.value.length, operating: 0, construction: 0, planned: 0, pilot: 0, closed: 0 };
  facilities.value.forEach(f => {
    const status = f.properties.status;
    if (status === 'Operating') counts.operating++;
    else if (status === 'Under Construction') counts.construction++;
    else if (status === 'Planned') counts.planned++;
    else if (status === 'Pilot') counts.pilot++;
    else if (status === 'Closed') counts.closed++;
  });
  return counts;
});

// --- Computed Chart Data ---
const parseCapacity = (capacityStr) => {
  if (!capacityStr || typeof capacityStr !== 'string') return 0;
  const match = capacityStr.match(/([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
};

const capacityByStatusData = computed(() => {
  const capacity = { 'Operating': 0, 'Under Construction': 0, 'Planned': 0, 'Pilot': 0, 'Closed': 0 };
  facilities.value.forEach(f => {
    const status = f.properties.status || 'Unknown';
    const cap = parseCapacity(f.properties.capacity);
    if (capacity.hasOwnProperty(status)) {
      capacity[status] += cap;
    }
  });

  // Filter out 'Pilot' and 'Closed' statuses
  const filteredCapacity = {
    'Operating': capacity['Operating'],
    'Under Construction': capacity['Under Construction'],
    'Planned': capacity['Planned']
  };

  return {
    labels: Object.keys(filteredCapacity),
    datasets: [{
      label: 'Capacity (t/yr)',
      data: Object.values(filteredCapacity),
      // Update colors to match the filtered statuses
      backgroundColor: ['#4CAF50', '#FFC107', '#2196F3']
    }]
  };
});

const technologyDistributionData = computed(() => {
  const techCounts = {};
  facilities.value.forEach(f => {
    const tech = f.properties.technology || 'Unknown';
    const techClean = tech.toLowerCase().includes('hydro') ? 'Hydrometallurgical'
                    : tech.toLowerCase().includes('pyro') ? 'Pyrometallurgical'
                    : tech.toLowerCase().includes('direct') ? 'Direct Recycling'
                    : 'Other/Unknown';
    techCounts[techClean] = (techCounts[techClean] || 0) + 1;
  });
  return {
    labels: Object.keys(techCounts),
    datasets: [{
      label: 'Technology Types',
      data: Object.values(techCounts),
      // Add background colors if desired for pie/doughnut
      backgroundColor: [ '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40' ],
    }]
  };
});

const regionDistributionData = computed(() => {
  const regionCounts = {};
  facilities.value.forEach(f => {
    const region = f.properties.region || f.properties.country || 'Unknown';
    regionCounts[region] = (regionCounts[region] || 0) + 1;
  });
  return {
    labels: Object.keys(regionCounts),
    datasets: [{
      label: 'Facilities by Region/Country',
      data: Object.values(regionCounts),
      backgroundColor: [ '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#8A2BE2' ], // Example colors
    }]
  };
});

// --- Methods ---
const fetchFacilities = async () => {
  loading.value = true;
  error.value = null;
  console.log("ChartsView: Fetching facilities...");
  try {
    const response = await fetch('/api/facilities');
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    facilities.value = data.features || [];
    console.log(`ChartsView: Fetched ${facilities.value.length} facilities.`);
  } catch (err) {
    console.error('ChartsView: Error fetching facilities:', err);
    error.value = `Failed to load data for charts: ${err.message}`;
    facilities.value = [];
  } finally {
    loading.value = false;
  }
};

const renderCapacityChart = () => {
  console.log("renderCapacityChart called, current instance:", capacityChartInstance.value ? "exists" : "null");
  
  // Safely destroy previous instance if it exists
  if (capacityChartInstance.value) {
    try {
      capacityChartInstance.value.destroy();
      console.log("Previous capacity chart instance destroyed successfully");
    } catch (e) {
      console.error("Error destroying previous capacity chart:", e);
    }
    capacityChartInstance.value = null;
  }
  
  // Check if canvas is available
  if (!capacityChartCanvas.value) {
    console.error("Capacity canvas ref not ready");
    return;
  }
  
  try {
    const ctx = capacityChartCanvas.value.getContext('2d');
    if (!ctx) {
      console.error("Failed to get 2D context for capacity chart");
      return;
    }
    
    // Create new chart instance
    capacityChartInstance.value = new Chart(ctx, {
      type: 'bar',
      data: capacityByStatusData.value,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Capacity (t/yr)'
            }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
    console.log("Capacity chart created successfully with ID:", capacityChartInstance.value.id);
  } catch (e) {
    console.error("Error rendering capacity chart:", e);
    capacityChartInstance.value = null; // Ensure reference is null if creation fails
  }
};

const renderTechnologiesChart = () => {
  console.log("renderTechnologiesChart called, current instance:", technologiesChartInstance.value ? "exists" : "null");
  
  // Safely destroy previous instance if it exists
  if (technologiesChartInstance.value) {
    try {
      technologiesChartInstance.value.destroy();
      console.log("Previous technologies chart instance destroyed successfully");
    } catch (e) {
      console.error("Error destroying previous technologies chart:", e);
    }
    technologiesChartInstance.value = null;
  }
  
  // Check if canvas is available
  if (!technologiesChartCanvas.value) {
    console.error("Technologies canvas ref not ready");
    return;
  }
  
  try {
    const ctx = technologiesChartCanvas.value.getContext('2d');
    if (!ctx) {
      console.error("Failed to get 2D context for technologies chart");
      return;
    }
    
    // Create new chart instance
    technologiesChartInstance.value = new Chart(ctx, {
      type: 'doughnut',
      data: technologyDistributionData.value,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
    console.log("Technologies chart created successfully with ID:", technologiesChartInstance.value.id);
  } catch (e) {
    console.error("Error rendering technologies chart:", e);
    technologiesChartInstance.value = null; // Ensure reference is null if creation fails
  }
};

const renderRegionsChart = () => {
  console.log("renderRegionsChart called, current instance:", regionsChartInstance.value ? "exists" : "null");
  
  // Safely destroy previous instance if it exists
  if (regionsChartInstance.value) {
    try {
      regionsChartInstance.value.destroy();
      console.log("Previous regions chart instance destroyed successfully");
    } catch (e) {
      console.error("Error destroying previous regions chart:", e);
    }
    regionsChartInstance.value = null;
  }
  
  // Check if canvas is available
  if (!regionsChartCanvas.value) {
    console.error("Regions canvas ref not ready");
    return;
  }
  
  try {
    const ctx = regionsChartCanvas.value.getContext('2d');
    if (!ctx) {
      console.error("Failed to get 2D context for regions chart");
      return;
    }
    
    // Create new chart instance
    regionsChartInstance.value = new Chart(ctx, {
      type: 'pie',
      data: regionDistributionData.value,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
    console.log("Regions chart created successfully with ID:", regionsChartInstance.value.id);
  } catch (e) {
    console.error("Error rendering regions chart:", e);
    regionsChartInstance.value = null; // Ensure reference is null if creation fails
  }
};

const renderAllCharts = () => {
    console.log("Attempting to render all charts...");
    
    // Check if component is still mounted before rendering
    // This helps prevent rendering after the component has been unmounted
    if (document.contains(capacityChartCanvas.value) &&
        document.contains(technologiesChartCanvas.value) &&
        document.contains(regionsChartCanvas.value)) {
        
        renderCapacityChart();
        renderTechnologiesChart();
        renderRegionsChart();
        console.log("All charts rendered successfully");
    } else {
        console.warn("Skipping chart rendering - canvas elements are no longer in the DOM");
    }
};

// --- Lifecycle Hooks ---
onMounted(async () => {
  console.log("ChartsView mounted.");
  await fetchFacilities();
  // Ensure DOM is ready and data is loaded before rendering charts
  if (!loading.value && !error.value) {
    nextTick(() => {
        console.log("Data loaded and DOM ready, rendering charts via onMounted + nextTick.");
        if (capacityChartCanvas.value && technologiesChartCanvas.value && regionsChartCanvas.value) {
            renderAllCharts();
        } else {
            console.error("One or more canvas refs are not available after nextTick.");
        }
    });
  } else if (error.value) {
      console.error("Skipping chart rendering due to fetch error.");
  } else {
      console.log("Still loading data, chart rendering deferred."); // Should ideally not happen if await fetchFacilities() finished
  }
});

onBeforeUnmount(() => {
  console.log("ChartsView unmounting. Destroying charts safely...");
  // Destroy charts and explicitly set instances to null
  if (capacityChartInstance.value) {
    capacityChartInstance.value.destroy();
    capacityChartInstance.value = null;
    console.log("Capacity chart destroyed and reference nullified.");
  }
  
  if (technologiesChartInstance.value) {
    technologiesChartInstance.value.destroy();
    technologiesChartInstance.value = null;
    console.log("Technologies chart destroyed and reference nullified.");
  }
  
  if (regionsChartInstance.value) {
    regionsChartInstance.value.destroy();
    regionsChartInstance.value = null;
    console.log("Regions chart destroyed and reference nullified.");
  }
  
  console.log("All charts destroyed and references nullified.");
});

// Add activated/deactivated hooks for route reuse scenarios
onActivated(() => {
  console.log("ChartsView activated. Checking if charts need to be recreated...");
  // Only recreate charts if they don't exist (were previously destroyed)
  if (!capacityChartInstance.value && !loading.value && !error.value) {
    console.log("Charts don't exist, recreating them on activation...");
    nextTick(() => {
      if (capacityChartCanvas.value && technologiesChartCanvas.value && regionsChartCanvas.value) {
        renderAllCharts();
      } else {
        console.error("One or more canvas refs are not available on activation.");
      }
    });
  } else {
    console.log("Charts already exist or data still loading, skipping recreation on activation.");
  }
});

onDeactivated(() => {
  console.log("ChartsView deactivated. Performing cleanup...");
  // Additional cleanup if needed when component is deactivated but not unmounted
});

</script>

<style scoped>
.stats-row .col-md-3 {
    padding-left: 8px;
    padding-right: 8px;
}
.stats-card {
  background-color: #fff;
  border-radius: 0.375rem; /* Match card style */
  padding: 1.5rem 1rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  transition: transform 0.2s ease-in-out;
  height: 100%; /* Make cards in a row equal height */
}
.stats-card:hover {
    transform: translateY(-3px);
}
.stats-card .icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}
.stats-card .number {
  font-size: 2rem;
  font-weight: bold;
  line-height: 1.2;
}
.stats-card .label {
  font-size: 0.9rem;
  color: #6c757d;
}

.card {
    overflow: hidden; /* Prevent canvas overflow */
}

canvas {
    max-width: 100%;
    /* height is set inline */
}
</style>