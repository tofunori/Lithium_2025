// js/pages/FacilityDetailPage.js
import { ref, computed, watch, onMounted, onBeforeUnmount, inject, nextTick } from 'vue'; // Import Composition API functions
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './FacilityDetailPage.css'; // Import component-specific styles
import { authService } from '../services/authService.js'; // Import authService
import { useRouter } from 'vue-router'; // Import useRouter

const FacilityDetailPage = {
  props: ['id'], // Receive facility ID from the router parameter
  template: `
    <div class="container mt-4">
      <div v-if="loading" class="text-center p-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading facility details...</span>
        </div>
      </div>
      <div v-else-if="error" class="alert alert-danger">
        {{ error }}
      </div>
      <div v-else-if="facility" class="facility-detail-container">
        <!-- Page Title -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="mb-0">{{ facility.properties.name }}</h2>
          <!-- Moved Edit Button Here -->
          <router-link :to="{ name: 'EditFacility', params: { id: facility.properties.id } }" class="btn btn-outline-primary btn-sm">
             <i class="fas fa-edit"></i> Edit
          </router-link>
        </div>
        <hr>

        <!-- NEW Two-Column Layout Container -->
        <div class="facility-layout-container">

          <!-- Left Column -->
          <div class="facility-left-column">
            <!-- Basic Info Card -->
            <div class="card mb-4">
              <div class="card-header">Facility Information</div>
              <div class="card-body">
                <table class="table table-sm table-borderless">
                  <tbody>
                    <tr><th>Company:</th><td>{{ facility.properties.company || 'N/A' }}</td></tr>
                    <tr><th>Status:</th><td><span :class="statusClass">{{ facility.properties.status || 'Unknown' }}</span></td></tr>
                    <tr><th>Location:</th><td>{{ facility.properties.address || facility.properties.location || 'N/A' }}</td></tr>
                    <tr><th>Region:</th><td>{{ facility.properties.region || 'N/A' }}</td></tr>
                    <tr><th>Country:</th><td>{{ facility.properties.country || 'N/A' }}</td></tr>
                    <tr><th>Capacity:</th><td>{{ facility.properties.capacity || 'N/A' }}</td></tr>
                    <tr><th>Technology:</th><td>{{ facility.properties.technology || 'N/A' }}</td></tr>
                    <tr><th>Feedstock:</th><td>{{ facility.properties.feedstock || 'N/A' }}</td></tr>
                    <tr><th>Products:</th><td>{{ facility.properties.products || 'N/A' }}</td></tr>
                    <tr><th>Year Started/Planned:</th><td>{{ facility.properties.yearStarted || facility.properties.yearPlanned || 'N/A' }}</td></tr>
                    <tr><th>Website:</th><td><a :href="facility.properties.website" target="_blank" v-if="facility.properties.website">{{ facility.properties.website }}</a><span v-else>N/A</span></td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Description Card -->
            <div class="card mb-4" v-if="facility.properties.description">
              <div class="card-header">Description</div>
              <div class="card-body">
                 <p style="white-space: pre-wrap;">{{ facility.properties.description }}</p>
              </div>
            </div>

             <!-- Technology Details Card -->
            <div class="card mb-4" v-if="facility.properties.technologyDetails">
              <div class="card-header">Technology Details</div>
              <div class="card-body">
                 <p style="white-space: pre-wrap;">{{ facility.properties.technologyDetails }}</p>
              </div>
            </div>

          </div> <!-- End Left Column -->

          <!-- Right Column -->
          <div class="facility-right-column">
            <!-- Location Map Card -->
            <!-- Main Facility Image -->
            <div v-if="facility.properties.facilityImage" class="mb-4">
              <img :src="resolveImageUrl(facility.properties.facilityImage)" :alt="facility.properties.name + ' Facility Image'" class="img-fluid rounded facility-main-image">
            </div>


            <div class="card mb-4">
              <div class="card-header">Location</div>
              <div class="card-body p-0"> <!-- No padding for map -->
                <div id="facility-detail-map" style="height: 300px;"></div>
              </div>
            </div>

            <!-- Photo Gallery Card -->
            <div class="card mb-4" v-if="facility.properties.galleryImages && facility.properties.galleryImages.length > 0">
              <div class="card-header">Photo Gallery</div>
              <div class="card-body facility-gallery">
                <div v-for="(imageUrl, index) in facility.properties.galleryImages" :key="index" class="gallery-thumbnail">
                  <img :src="resolveImageUrl(imageUrl)" :alt="facility.properties.name + ' Gallery Image ' + (index + 1)" class="img-thumbnail">
                </div>
              </div>
            </div>


             <!-- Timeline Card -->
             <div class="card mb-4" v-if="facility.properties.timeline && facility.properties.timeline.length > 0">
                 <div class="card-header">Timeline</div>
                 <div class="card-body">
                     <ul class="list-group list-group-flush">
                         <li v-for="(item, index) in facility.properties.timeline" :key="index" class="list-group-item d-flex justify-content-between align-items-center">
                             <span>{{ item.event }}</span>
                             <span class="badge bg-secondary rounded-pill">{{ item.year }}</span>
                         </li>
                     </ul>
                 </div>
             </div>

            <!-- Admin Actions Card -->
            <div v-if="isAdminOrEditor" class="card mb-4"> <!-- Use isAdminOrEditor computed prop -->
              <div class="card-header">Admin Actions</div>
              <div class="card-body d-grid gap-2">
                 <button @click="confirmDelete" class="btn btn-danger">
                   <i class="fas fa-trash-alt"></i> Delete Facility
                 </button>
              </div>
            </div>

          </div> <!-- End Right Column -->

        </div> <!-- End Two-Column Layout Container -->

      </div> <!-- End v-else-if="facility" -->
    </div> <!-- End container -->

  `,
  setup(props) {
    // --- Injected State ---
    const userRole = inject('userRole');
    const router = useRouter(); // Get router instance

    // --- Component State ---
    const facility = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const map = ref(null); // Store map instance

    // --- Computed Properties ---
    const isAdminOrEditor = computed(() => {
        return userRole.value === 'admin' || userRole.value === 'editor';
    });

    const statusClass = computed(() => {
      const status = facility.value?.properties?.status;
      switch (status) {
        case 'Operating': return 'badge bg-success';
        case 'Under Construction': return 'badge bg-warning text-dark';
        case 'Planned': return 'badge bg-info text-dark';
        case 'Pilot': return 'badge bg-primary';
        case 'Closed': return 'badge bg-secondary';
        default: return 'badge bg-light text-dark';
      }
    });

    // --- Methods ---
    const fetchFacilityData = async () => {
      loading.value = true;
      error.value = null;
      console.log(`FacilityDetailPage: Fetching data for ID: ${props.id}`); // Use props.id
      try {
        const response = await fetch(`/api/facilities/${props.id}`); // Use props.id
        if (!response.ok) {
           if (response.status === 404) throw new Error(`Facility with ID ${props.id} not found.`);
           throw new Error(`HTTP error ${response.status}`);
        }
        facility.value = await response.json();
        console.log("FacilityDetailPage: Facility data loaded:", facility.value);

        // Removed fetchRelatedFacilities call
        // if (facility.value.properties.company) {
        // }

        // Map initialization is now handled by the 'facility' watcher
      } catch (err) {
        console.error('FacilityDetailPage: Error fetching facility data:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    const initMap = () => {
       if (map.value || !facility.value?.geometry?.coordinates) return;

       try {
            const [lng, lat] = facility.value.geometry.coordinates;
            map.value = L.map('facility-detail-map').setView([lat, lng], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map.value);

            L.marker([lat, lng])
                .addTo(map.value)
                .bindPopup(facility.value.properties.name || 'Facility Location')
                .openPopup();
            console.log("Facility detail map initialized.");
       } catch(e) {
           console.error("Error initializing facility detail map:", e);
           error.value = "Failed to display location map.";
           if (map.value) { map.value.remove(); map.value = null; }
       }
    };

    const resolveImageUrl = (url) => {
         if (!url) return '';
         return url.startsWith('http') ? url : `/${url.replace(/^\//, '')}`;
    };

    const confirmDelete = async () => {
      if (!facility.value) return;

      if (confirm(`Are you sure you want to delete "${facility.value.properties.name}"? This action cannot be undone.`)) {
        console.log(`Attempting to delete facility ID: ${props.id}`);
        try {
           const token = await authService.getToken();
           if (!token) throw new Error("Authentication token not found.");

           const response = await fetch(`/api/facilities/${props.id}`, {
             method: 'DELETE',
             headers: {
               'Authorization': `Bearer ${token}`
             }
           });

           if (!response.ok) {
               const result = await response.json().catch(() => ({ message: 'Unknown error' }));
               throw new Error(result.message || `HTTP error ${response.status}`);
           }

           alert('Facility deleted successfully.');
           router.push({ name: 'FacilitiesList' }); // Use injected router

        } catch (err) {
           console.error('Error deleting facility:', err);
           alert(`Failed to delete facility: ${err.message}`);
           error.value = `Failed to delete facility: ${err.message}`;
        }
      }
    };

    // --- Watchers ---
    watch(() => props.id, (newId, oldId) => {
      if (newId && newId !== oldId) {
        console.log(`Facility ID changed from ${oldId} to ${newId}. Refetching data.`);
        if (map.value) {
            map.value.remove();
            map.value = null;
        }
        fetchFacilityData();
      }
    });

    // Watch for facility data to become available, then initialize map
    watch(facility, (newFacility) => {
      if (newFacility && newFacility.geometry?.coordinates) {
        // Ensure DOM is updated *after* facility data is set and v-if renders the map div
        nextTick(() => {
          initMap();
        });
      } else if (!newFacility && map.value) {
        // Clean up map if facility becomes null (e.g., navigation away and back quickly)
        map.value.remove();
        map.value = null;
      }
    });

    // --- Lifecycle Hooks ---
    onMounted(() => {
      fetchFacilityData();
    });

    onBeforeUnmount(() => {
      if (map.value) {
        map.value.remove();
        map.value = null;
        console.log("Facility detail map instance removed.");
      }
    }) // Removed comma before return

    // --- Return values for template ---
    return {
      facility,
      loading,
      error,
      map, // Though not directly used in template, needed for cleanup
      isAdminOrEditor,
      statusClass,
      fetchFacilityData, // Added comma
      initMap, // Added comma
      resolveImageUrl, // Added comma
      confirmDelete
    };
  }
};

// Make available for default import
export default FacilityDetailPage;