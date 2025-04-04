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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

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
  return {
    labels: Object.keys(capacity),
    datasets: [{
      label: 'Capacity (t/yr)',
      data: Object.values(capacity),
      backgroundColor: ['#4CAF50', '#FFC107', '#2196F3', '#9C27B0', '#607D8B']
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
  capacityChartInstance.value?.destroy(); // Destroy previous instance if exists
  if (!capacityChartCanvas.value) { console.error("Capacity canvas ref not ready"); return; }
  try {
    const ctx = capacityChartCanvas.value.getContext('2d');
    if (!ctx) { console.error("Failed to get 2D context for capacity chart"); return; }
    capacityChartInstance.value = new Chart(ctx, {
      type: 'bar',
      data: capacityByStatusData.value,
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Capacity (t/yr)' } } }, plugins: { legend: { display: false } } }
    });
    console.log("Capacity chart created.");
  } catch (e) { console.error("Error rendering capacity chart:", e); }
};

const renderTechnologiesChart = () => {
  technologiesChartInstance.value?.destroy(); // Destroy previous instance if exists
  if (!technologiesChartCanvas.value) { console.error("Technologies canvas ref not ready"); return; }
   try {
    const ctx = technologiesChartCanvas.value.getContext('2d');
    if (!ctx) { console.error("Failed to get 2D context for technologies chart"); return; }
    technologiesChartInstance.value = new Chart(ctx, {
      type: 'doughnut',
      data: technologyDistributionData.value,
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    });
     console.log("Technologies chart created.");
  } catch (e) { console.error("Error rendering technologies chart:", e); }
};

const renderRegionsChart = () => {
  regionsChartInstance.value?.destroy(); // Destroy previous instance if exists
  if (!regionsChartCanvas.value) { console.error("Regions canvas ref not ready"); return; }
   try {
    const ctx = regionsChartCanvas.value.getContext('2d');
     if (!ctx) { console.error("Failed to get 2D context for regions chart"); return; }
    regionsChartInstance.value = new Chart(ctx, {
      type: 'pie',
      data: regionDistributionData.value,
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    });
     console.log("Regions chart created.");
  } catch (e) { console.error("Error rendering regions chart:", e); }
};

const renderAllCharts = () => {
    console.log("Attempting to render all charts...");
    renderCapacityChart();
    renderTechnologiesChart();
    renderRegionsChart();
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
  capacityChartInstance.value?.destroy();
  technologiesChartInstance.value?.destroy();
  regionsChartInstance.value?.destroy();
  console.log("Charts destroyed.");
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