// js/pages/FacilityDetailPage.js

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Assuming Vue is available globally
import { authService } from '../services/authService.js'; // Import authService

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
        <h2 class="mb-3">{{ facility.properties.name }}</h2>
        <hr>

        <div class="row">
          <!-- Main Info Column -->
          <div class="col-md-8">
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

            <!-- Location Map Card -->
            <div class="card mb-4">
              <div class="card-header">Location</div>
              <div class="card-body p-0"> <!-- No padding for map -->
                <div id="facility-detail-map" style="height: 300px;"></div>
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

          </div>

          <!-- Sidebar Column -->
          <div class="col-md-4">
             <!-- Company Logo Card -->
             <div class="card mb-4" v-if="facility.properties.companyLogo">
                 <div class="card-header">Company</div>
                 <div class="card-body text-center">
                      <img :src="resolveImageUrl(facility.properties.companyLogo)" :alt="facility.properties.company + ' Logo'" class="img-fluid" style="max-height: 100px;">
                 </div>
             </div>
             
             <!-- Facility Image Card -->
             <div class="card mb-4" v-if="facility.properties.facilityImage">
                  <div class="card-header">Facility Image</div>
                  <img :src="resolveImageUrl(facility.properties.facilityImage)" class="card-img-bottom" :alt="facility.properties.name + ' Image'">
             </div>

            <!-- Related Facilities Card -->
            <div class="card mb-4">
              <div class="card-header">Related Facilities ({{ facility.properties.company || 'N/A' }})</div>
              <div class="card-body">
                <div v-if="loadingRelated">Loading...</div>
                <div v-else-if="relatedFacilities.length === 0">No other facilities found for this company.</div>
                <ul v-else class="list-group list-group-flush">
                  <li v-for="related in relatedFacilities" :key="related.id" class="list-group-item">
                    <!-- Use router-link for internal navigation -->
                    <router-link :to="{ name: 'FacilityDetail', params: { id: related.id }}">
                      {{ related.name }} ({{ related.status || 'Unknown' }})
                    </router-link>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Admin Actions Card -->
            <div v-if="$root.isAuthenticated" class="card mb-4">
              <div class="card-header">Admin Actions</div>
              <div class="card-body d-grid gap-2">
                <router-link :to="{ name: 'EditFacility', params: { id: facility.properties.id } }" class="btn btn-primary">
                  <i class="fas fa-edit"></i> Edit Facility
                </router-link>
                <button @click="confirmDelete" class="btn btn-danger">
                  <i class="fas fa-trash-alt"></i> Delete Facility
                </button>
              </div>
            </div>
            
             <!-- Document Link Card -->
             <div class="card mb-4">
                 <div class="card-header">Associated Documents</div>
                 <div class="card-body">
                      <router-link :to="{ name: 'Documents', query: { facilityId: facility.properties.id } }" class="btn btn-outline-secondary w-100">
                          <i class="fas fa-folder-open"></i> View Documents
                      </router-link>
                 </div>
             </div>

          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      facility: null,
      relatedFacilities: [],
      loading: true,
      loadingRelated: false,
      error: null,
      map: null // Store map instance
    };
  },
  computed: {
    // Compute CSS class for status badge
    statusClass() {
      const status = this.facility?.properties?.status;
      switch (status) {
        case 'Operating': return 'badge bg-success';
        case 'Under Construction': return 'badge bg-warning text-dark';
        case 'Planned': return 'badge bg-info text-dark';
        case 'Pilot': return 'badge bg-primary';
        case 'Closed': return 'badge bg-secondary';
        default: return 'badge bg-light text-dark';
      }
    }
  },
  methods: {
    // Fetch main facility data
    async fetchFacilityData() {
      this.loading = true;
      this.error = null;
      console.log(`FacilityDetailPage: Fetching data for ID: ${this.id}`);
      try {
        const response = await fetch(`/api/facilities/${this.id}`);
        if (!response.ok) {
           if (response.status === 404) throw new Error(`Facility with ID ${this.id} not found.`);
           throw new Error(`HTTP error ${response.status}`);
        }
        this.facility = await response.json();
        console.log("FacilityDetailPage: Facility data loaded:", this.facility);
        
        // Fetch related facilities after main data is loaded
        if (this.facility.properties.company) {
          this.fetchRelatedFacilities(this.facility.properties.company);
        }
        
        // Map initialization moved to updated() hook

      } catch (err) {
        console.error('FacilityDetailPage: Error fetching facility data:', err);
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    // Fetch related facilities
    async fetchRelatedFacilities(companyName) {
        this.loadingRelated = true;
        try {
             const response = await fetch(`/api/facilities?company=${encodeURIComponent(companyName)}`);
             if (!response.ok) throw new Error(`HTTP error ${response.status}`);
             const data = await response.json();
             this.relatedFacilities = (data.features || [])
                .filter(f => f.properties.id !== this.id) // Exclude self
                .map(f => ({ // Map to simpler object for display
                     id: f.properties.id,
                     name: f.properties.name,
                     status: f.properties.status
                 }));
        } catch (err) {
             console.error('FacilityDetailPage: Error fetching related facilities:', err);
             // Don't set main error, just show message in related section
        } finally {
             this.loadingRelated = false;
        }
    },
    // Initialize the Leaflet map
    initMap() {
       if (this.map || !this.facility?.geometry?.coordinates) return; // Don't init if map exists or no coords

       // Leaflet (L) is now imported locally

       try {
            const [lng, lat] = this.facility.geometry.coordinates;
            this.map = L.map('facility-detail-map').setView([lat, lng], 13); // Zoom in closer

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);

            L.marker([lat, lng])
                .addTo(this.map)
                .bindPopup(this.facility.properties.name || 'Facility Location')
                .openPopup();
            console.log("Facility detail map initialized.");
       } catch(e) {
           console.error("Error initializing facility detail map:", e);
           this.error = "Failed to display location map.";
           if (this.map) { this.map.remove(); this.map = null; }
       }
    },
     // Resolve image URLs (handle relative paths)
     resolveImageUrl(url) {
         if (!url) return '';
         // If url doesn't start with http, assume it's relative to root
         return url.startsWith('http') ? url : `/${url.replace(/^\//, '')}`;
     },
    // Confirm and handle facility deletion
    async confirmDelete() {
      if (!this.facility) return;
      
      if (confirm(`Are you sure you want to delete "${this.facility.properties.name}"? This action cannot be undone.`)) {
        console.log(`Attempting to delete facility ID: ${this.id}`);
        try {
           const token = await authService.getToken(); // Use authService
           if (!token) throw new Error("Authentication token not found.");

           const response = await fetch(`/api/facilities/${this.id}`, {
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
           this.$router.push({ name: 'FacilitiesList' }); // Navigate back to list

        } catch (err) {
           console.error('Error deleting facility:', err);
           alert(`Failed to delete facility: ${err.message}`);
           this.error = `Failed to delete facility: ${err.message}`; // Show error on page
        }
      }
    }
  },
  watch: {
    // Watch the 'id' prop for changes (when navigating between detail pages)
    id(newId, oldId) {
      if (newId && newId !== oldId) {
        console.log(`Facility ID changed from ${oldId} to ${newId}. Refetching data.`);
        // Clean up old map before fetching new data
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.fetchFacilityData();
      }
    }
  },
  mounted() {
    // Fetch data when component is first mounted
    this.fetchFacilityData();
  },
   beforeUnmount() {
    // Clean up map instance when component is destroyed
    if (this.map) {
      this.map.remove();
      this.map = null;
      console.log("Facility detail map instance removed.");
    }
  }
,
  updated() {
    // Attempt to initialize map after DOM updates, but only once
    // Check if map isn't already initialized AND facility data is loaded
    if (!this.map && this.facility && !this.loading && !this.error) {
      console.log("FacilityDetailPage: updated() hook triggered, attempting map init.");
      // Check again if container exists, just in case
      if (document.getElementById('facility-detail-map')) {
          this.initMap();
      } else {
          console.error("FacilityDetailPage: Map container still not found in updated() hook.");
          // Avoid setting error repeatedly if updated() triggers multiple times
          if (!this.error) this.error = "Failed to render map container after update."; 
      }
    }
  }
};

// Make available for import in app.js
export default FacilityDetailPage;