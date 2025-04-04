<template>
  <div class="dashboard-view">
    <h1>Dashboard Overview</h1>

    <section class="map-preview">
      <FacilityMap />
    </section>
    <!-- Removed Summary Statistics and Quick Links sections -->
  </div>
</template>

<script setup>
import { onMounted } from 'vue'; // Removed unused computed
import { useFacilityStore } from '@/stores/facilityStore';
import { useRouter } from 'vue-router';
import FacilityMap from '@/components/FacilityMap.vue';

const facilitiesStore = useFacilityStore();
const router = useRouter(); // Keep router if needed for other actions, remove if not

// Fetch facilities data when the component mounts
onMounted(() => {
  if (facilitiesStore.facilities.length === 0) {
    facilitiesStore.fetchFacilities();
  }
});

// Removed unused computed properties totalFacilities and totalCapacity
</script>

<style scoped>
.dashboard-view {
  padding: 2rem;
  font-family: sans-serif;
  /* Consider making the view itself take full height if needed */
  /* display: flex; */
  /* flex-direction: column; */
  /* height: calc(100vh - 4rem); /* Example: Adjust based on header/footer */
}

h1, h2 {
  color: #333;
  margin-bottom: 1rem;
}

section { /* General section styling - kept for map-preview */
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.map-preview {
  /* Make map section take significant vertical space */
  height: 80vh; /* 80% of viewport height */
  /* Use flex to help inner map component expand */
  display: flex;
  flex-direction: column;
  padding: 0; /* Remove padding for full map bleed */
  background-color: transparent; /* Remove background */
  box-shadow: none; /* Remove shadow */
  border: none; /* Remove border if section had one */
}

/* Attempt to make the FacilityMap component fill the container */
/* This might require :deep() or specific styling within FacilityMap.vue */
/* Adjust the selector based on FacilityMap's root element */
.map-preview > :deep(div), /* Common case */
.map-preview > :deep(.facility-map-container), /* Example class */
.map-preview > :deep(#facilityMap) /* Example ID */
 {
  flex-grow: 1; /* Allow map to grow */
  height: 100%; /* Fill the height */
  width: 100%; /* Fill the width */
}


.map-placeholder { /* Kept in case FacilityMap uses it internally */
  height: 200px;
  background-color: #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #666;
  text-align: center;
}

/* Removed styles for .summary-stats, .stat-card, and .quick-links */
</style>