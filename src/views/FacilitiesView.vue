<template>
  <div class="container mt-4">
    <h1 class="mb-4">Facilities List</h1>

    <!-- Workaround: Always show Add Facility button due to potential auth detection issues -->
    <div class="mb-3 d-flex justify-content-end align-items-center">
      <!-- Add Facility Button -->
      <!-- Add Facility Button - Show only when initialized and authenticated -->
      <router-link v-if="authStore.isInitialized && authStore.isAuthenticated" to="/facilities/new" class="btn btn-success">
        <i class="fas fa-plus"></i> Add New Facility
      </router-link>
    </div>

    <!-- Filter and Search Controls -->
    <div class="row mb-3 align-items-center">
      <div class="col-md-6 mb-2 mb-md-0">
        <div class="btn-group" role="group" aria-label="Filter by status">
          <button type="button" class="btn" :class="{'btn-primary': activeFilter === 'all', 'btn-outline-secondary': activeFilter !== 'all'}" @click="setFilter('all')">All</button>
          <button type="button" class="btn" :class="{'btn-primary': activeFilter === 'operating', 'btn-outline-secondary': activeFilter !== 'operating'}" @click="setFilter('operating')">Operating</button>
          <button type="button" class="btn" :class="{'btn-primary': activeFilter === 'construction', 'btn-outline-secondary': activeFilter !== 'construction'}" @click="setFilter('construction')">Construction</button>
          <button type="button" class="btn" :class="{'btn-primary': activeFilter === 'planned', 'btn-outline-secondary': activeFilter !== 'planned'}" @click="setFilter('planned')">Planned/Pilot</button>
        </div>
      </div>
      <div class="col-md-6">
        <input type="text" class="form-control" placeholder="Search by company, name, or location..." v-model="searchQuery">
      </div>
    </div>

    <!-- Facilities List -->
    <div v-if="loading" class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
    <div v-else-if="error" class="alert alert-danger text-center">
      {{ error }}
    </div>
    <div v-else-if="filteredFacilities.length === 0" class="alert alert-info text-center">
      No facilities match the current criteria.
    </div>
    <div v-else class="facilities-list-container">
       <!-- List Header -->
       <div class="facility-list-header d-none d-md-flex">
         <span class="col-company">Company</span>
         <span class="col-location">Location</span>
         <span class="col-volume">Capacity</span>
         <span class="col-method">Method</span>
         <span class="col-status">Status</span>
       </div>
       <!-- List Items -->
      <div v-for="facility in filteredFacilities" :key="facility.properties.id" class="facility-item">
         <div class="facility-item-content">
            <span class="col-company" data-label="Company:">
              <router-link :to="{ name: 'FacilityDetail', params: { id: facility.properties.id } }" class="facility-link">
                {{ facility.properties.company || 'N/A' }}
              </router-link>
            </span>
            <span class="col-location" data-label="Location:">{{ facility.properties.address || 'N/A' }}</span>
            <span class="col-volume" data-label="Capacity:">{{ formatCapacity(facility.properties.capacity) }}</span>
            <span class="col-method" data-label="Method:">{{ facility.properties.technology || 'N/A' }}</span>
            <span class="col-status" data-label="Status:">
              <FacilityStatusBadge :status="facility.properties.status" />
            </span>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'; // Added onUnmounted here
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore'; // Import the auth store
import FacilityStatusBadge from '@/components/FacilityStatusBadge.vue';

const router = useRouter();
const authStore = useAuthStore(); // Initialize the auth store
const allFacilities = ref([]);
const loading = ref(true);
const error = ref(null);
const activeFilter = ref('all'); // 'all', 'operating', 'construction', 'planned'
const searchQuery = ref('');
// Removed local isLoggedIn ref, will use authStore.isLoggedIn directly
// Fetch facilities data
const fetchFacilities = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch('/api/facilities');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data || !data.features) {
        console.error('Fetched data is not in the expected GeoJSON format:', data);
        throw new Error('Facility data format error.');
    }
    allFacilities.value = data.features;
  } catch (err) {
    console.error('Error fetching facility data:', err);
    error.value = 'Failed to load facilities list. Please try again later.';
  } finally {
    loading.value = false;
  }
};

// Removed local checkLoginStatus function

// Computed property for filtered and searched facilities
const filteredFacilities = computed(() => {
  let facilities = allFacilities.value;

  // Apply status filter
  if (activeFilter.value !== 'all') {
    facilities = facilities.filter(facility => {
      const status = facility.properties.status?.toLowerCase() || '';
      if (activeFilter.value === 'operating') return status === 'operating';
      if (activeFilter.value === 'construction') return status === 'under construction';
      if (activeFilter.value === 'planned') return status === 'planned' || status === 'pilot';
      return false; // Should not happen
    });
  }

  // Apply search query
  if (searchQuery.value.trim() !== '') {
    const query = searchQuery.value.toLowerCase().trim();
    facilities = facilities.filter(facility => {
      const props = facility.properties;
      const searchText = `${props.name || ''} ${props.company || ''} ${props.address || ''}`.toLowerCase();
      return searchText.includes(query);
    });
  }

  return facilities;
});

// Method to set the active filter
const setFilter = (filter) => {
  activeFilter.value = filter;
};

// Helper to format capacity
const formatCapacity = (capacity) => {
  return capacity ? capacity.split(' ')[0] : 'N/A';
};

// Fetch data and check login status when component is mounted
onMounted(() => {
  fetchFacilities();
  authStore.initializeAuthListener(); // Initialize Firebase auth listener
  // Removed checkLoginStatus() call and storage listener setup
});

// Optional: Clean up listener on unmount
// Removed onUnmounted hook for storage listener cleanup

</script>

<style scoped>
.facilities-list-container {
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  overflow: hidden; /* Ensures rounded corners contain children */
}

.facility-list-header,
.facility-item-content {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #dee2e6;
  background-color: #fff; /* Ensure background for items */
}

.facility-list-header {
  background-color: #f8f9fa; /* Light grey header */
  font-weight: 600;
  border-top: none; /* Remove double border at the top */
}

.facility-item:last-child .facility-item-content {
  border-bottom: none; /* Remove border from last item */
}

/* Column widths - adjust as needed */
.col-company { flex: 0 0 20%; padding-right: 1rem; }
.col-location { flex: 0 0 20%; padding-right: 1rem; }
.col-volume { flex: 0 0 12%; text-align: right; padding-right: 1rem; }
.col-method { flex: 0 0 20%; padding-right: 1rem; }
.col-status { flex: 0 0 13%; text-align: center; }

.facility-link {
  text-decoration: none;
  color: inherit;
  font-weight: 500;
}
.facility-link:hover {
  text-decoration: underline;
  color: var(--bs-primary); /* Use Bootstrap primary color */
}

.edit-link i {
    pointer-events: none; /* Prevent icon from interfering with link click */
}

/* Responsive adjustments for smaller screens */
@media (max-width: 767.98px) {
  .facility-list-header {
    display: none; /* Hide header on small screens */
  }

  .facility-item-content {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
  }

  .facility-item-content span[class^="col-"] {
    flex-basis: auto; /* Reset flex basis */
    width: 100%;      /* Take full width */
    padding-right: 0; /* Remove right padding */
    margin-bottom: 0.5rem; /* Add spacing between items */
    text-align: left !important; /* Force left align */
    display: flex; /* Use flex for label/value alignment */
    justify-content: space-between; /* Space out label and value */
  }

  .facility-item-content span[class^="col-"]::before {
    content: attr(data-label); /* Use data-label for pseudo-element */
    font-weight: 600;
    margin-right: 0.5rem;
    display: inline-block; /* Ensure label is displayed */
  }

   .facility-item-content .col-status .status-badge {
      margin-left: auto; /* Push badge to the right */
   }

}
</style>