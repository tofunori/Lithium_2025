<template>
  <div class="container mt-4 facility-detail-view">
    <div v-if="loading" class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p>Loading facility details...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">
      <p>Error loading facility details: {{ error }}</p>
      <router-link to="/" class="btn btn-outline-primary mt-3">
        <i class="fas fa-arrow-left"></i> Back to Dashboard
      </router-link>
    </div>

    <div v-else-if="facility" id="main-content" :data-facility-id="facility.id">
      <!-- Simplified Header -->
      <div class="facility-info mb-4 pt-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 id="facilityName" class="h3 mb-1">{{ facility.properties?.name || 'N/A' }}</h1>
            <p id="facilityAddress" class="text-muted mb-1">{{ facility.properties?.address || 'N/A' }}</p>
            <span id="facilityStatus" class="status-badge" :class="statusClass">{{ facility.properties?.status || 'N/A' }}</span>
          </div>
          <!-- Edit/Save Buttons -->
          <div v-if="isLoggedIn" class="ms-3 flex-shrink-0 d-flex align-items-center"> <!-- Added d-flex -->
            <router-link :to="{ name: 'EditFacility', params: { id: facilityId } }" class="btn btn-sm btn-outline-info me-3"> <!-- Changed style, added margin -->
              <i class="fas fa-external-link-alt"></i> Go to Edit Page
            </router-link>
            <div> <!-- Group for Edit/Save/Cancel -->
              <button id="editButton" @click="enableEditMode" v-if="!isEditing" class="btn btn-sm btn-outline-secondary me-2"><i class="fas fa-pencil-alt"></i> Edit</button>
              <button id="saveButton" @click="saveChanges" v-if="isEditing" class="btn btn-sm btn-success me-2"><i class="fas fa-save"></i> Save</button>
              <button id="cancelButton" @click="cancelEditMode" v-if="isEditing" class="btn btn-sm btn-outline-secondary"><i class="fas fa-times"></i> Cancel</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Navigation Tabs -->
      <ul class="nav nav-tabs mb-3" id="page-navigation" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link" :class="{ active: activeTab === 'overview' }" @click="setActiveTab('overview')" type="button" role="tab">Overview</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" :class="{ active: activeTab === 'tech' }" @click="setActiveTab('tech')" type="button" role="tab">Tech Specs</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" :class="{ active: activeTab === 'timeline' }" @click="setActiveTab('timeline')" type="button" role="tab">Timeline</button>
        </li>
         <li class="nav-item" role="presentation">
          <button class="nav-link" :class="{ active: activeTab === 'technology' }" @click="setActiveTab('technology')" type="button" role="tab">Processing Technology</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" :class="{ active: activeTab === 'company' }" @click="setActiveTab('company')" type="button" role="tab">Company</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" :class="{ active: activeTab === 'location' }" @click="setActiveTab('location')" type="button" role="tab">Location</button>
        </li>
      </ul>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Overview Section -->
        <div id="content-overview" class="content-section" :class="{ active: activeTab === 'overview' }">
          <h2>Overview</h2>
          <div id="facilityDescription" class="editable-section" :contenteditable="isEditing" :class="{ editable: isEditing }" @input="updateEditedData('description', $event.target.innerHTML)" v-html="editedFacilityData.description || 'Not available'"></div>
        </div>

        <!-- Tech Specs Section -->
        <div id="content-tech" class="content-section" :class="{ active: activeTab === 'tech' }">
          <h2>Technical Specifications</h2>
          <ul id="techSpecsList" class="list-group list-group-flush editable-section">
            <li class="list-group-item"><strong>Size:</strong> <span data-key="size" :contenteditable="isEditing" :class="{ editable: isEditing }" @input="updateEditedData('size', $event.target.textContent)">{{ editedFacilityData.size || 'Not specified' }}</span></li>
            <li class="list-group-item"><strong>Capacity:</strong> <span data-key="capacity" :contenteditable="isEditing" :class="{ editable: isEditing }" @input="updateEditedData('capacity', $event.target.textContent)">{{ editedFacilityData.capacity || 'Not specified' }}</span></li>
            <li class="list-group-item"><strong>Technology:</strong> <span data-key="technology" :contenteditable="isEditing" :class="{ editable: isEditing }" @input="updateEditedData('technology', $event.target.textContent)">{{ editedFacilityData.technology || 'Not specified' }}</span></li>
            <li class="list-group-item"><strong>Year Started/Planned:</strong> <span data-key="yearStarted" :contenteditable="isEditing" :class="{ editable: isEditing }" @input="updateEditedData('yearStarted', $event.target.textContent)">{{ editedFacilityData.yearStarted || editedFacilityData.yearPlanned || 'Not specified' }}</span></li>
            <li class="list-group-item"><strong>Feedstock:</strong> <span data-key="feedstock" :contenteditable="isEditing" :class="{ editable: isEditing }" @input="updateEditedData('feedstock', $event.target.textContent)">{{ editedFacilityData.feedstock || 'Not specified' }}</span></li>
            <li class="list-group-item"><strong>Products:</strong> <span data-key="products" :contenteditable="isEditing" :class="{ editable: isEditing }" @input="updateEditedData('products', $event.target.textContent)">{{ editedFacilityData.products || 'Not specified' }}</span></li>
            <li class="list-group-item"><strong>Funding Source:</strong> <span data-key="fundingSource" :contenteditable="isEditing" :class="{ editable: isEditing }" @input="updateEditedData('fundingSource', $event.target.textContent)">{{ editedFacilityData.fundingSource || 'Not specified' }}</span></li>
          </ul>
        </div>

        <!-- Timeline Section -->
        <div id="content-timeline" class="content-section" :class="{ active: activeTab === 'timeline' }">
          <h2>Timeline</h2>
           <!-- Note: Editing timeline directly via contenteditable is complex. For now, it's read-only in Vue. -->
          <div id="facilityTimeline" class="timeline mt-4">
            <template v-if="facility.properties?.timeline?.length">
              <div v-for="(item, index) in facility.properties.timeline" :key="index" class="timeline-container" :class="index % 2 === 0 ? 'left' : 'right'">
                <div class="timeline-content">
                  <h5>{{ item.year }}</h5>
                  <p>{{ item.event }}</p>
                </div>
              </div>
            </template>
            <p v-else>No timeline data available.</p>
          </div>
        </div>

        <!-- Processing Technology Section -->
        <div id="content-technology" class="content-section" :class="{ active: activeTab === 'technology' }">
            <h2>Processing Technology</h2>
            <div id="technologyDescription" class="editable-section" :contenteditable="isEditing" :class="{ editable: isEditing }" @input="updateEditedData('technologyDetails', $event.target.innerHTML)" v-html="editedFacilityData.technologyDetails || `Details about ${editedFacilityData.technology || 'the processing technology'}.`"></div>
        </div>

        <!-- Company Section -->
        <div id="content-company" class="content-section" :class="{ active: activeTab === 'company' }">
          <h2>Company Information</h2>
          <div class="row">
            <div class="col-md-3 text-center">
              <img v-if="facility.properties?.companyLogo &amp;&amp; facility.properties.companyLogo !== 'images/logos/default.png'"
                   id="companyLogo"
                   :src="`/${facility.properties.companyLogo}`"
                   :alt="`${facility.properties.company || 'Company'} Logo`"
                   class="img-fluid rounded mb-3"
                   style="max-height: 100px;">
              <p v-else>No Logo</p>
            </div>
            <div class="col-md-9">
              <h4 id="facilityCompany">{{ facility.properties?.company || 'N/A' }}</h4>
              <p id="companyDescription">{{ facility.properties?.companyDescription || `Details about ${facility.properties?.company || 'the company'}.` }}</p>
              <a v-if="facility.properties?.website"
                 id="companyWebsite"
                 :href="facility.properties.website"
                 target="_blank"
                 rel="noopener noreferrer"
                 class="btn btn-outline-primary btn-sm">
                Visit Website <i class="fas fa-external-link-alt"></i>
              </a>
            </div>
          </div>
        </div>

        <!-- Location Section -->
        <div id="content-location" class="content-section" :class="{ active: activeTab === 'location' }">
          <h2>Location</h2>
          <div class="row">
            <div class="col-md-6">
              <p><strong>Address:</strong> <span id="facilityAddressMap">{{ facility.properties?.address || 'N/A' }}</span></p>
              <p><strong>Region:</strong> <span id="facilityRegion">{{ facility.properties?.region || 'N/A' }}</span></p>
              <p><strong>Country:</strong> <span id="facilityCountry">{{ facility.properties?.country || 'N/A' }}</span></p>
            </div>
            <div class="col-md-6">
              <div id="facilityMap" ref="mapContainer" style="height: 300px; width: 100%;">
                <p v-if="!facility.geometry?.coordinates">Location data not available.</p>
                <p v-else>Map loading...</p>
              </div>
            </div>
          </div>
        </div>
      </div> <!-- End Tab Content -->

    </div> <!-- End v-else-if="facility" -->
  </div> <!-- End Container -->
</template>

<script setup>
import { ref, onMounted, computed, watch, reactive, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore'; // Import the auth store
// Leaflet and its CSS will be imported dynamically

// --- Reactive State ---
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore(); // Get instance of auth store
const facility = ref(null);
const editedFacilityData = reactive({}); // For holding edits
const loading = ref(true);
const error = ref(null);
const activeTab = ref('overview'); // Default tab
const mapInstance = ref(null); // To hold Leaflet map instance
const mapContainer = ref(null); // Template ref for map container
const isEditing = ref(false); // Edit mode flag

// --- Authentication ---
const isLoggedIn = computed(() => authStore.isAuthenticated); // Use reactive store getter

// --- Data Fetching ---
const facilityId = ref(route.params.id);

async function fetchFacilityData() {
  loading.value = true;
  error.value = null;
  facility.value = null; // Reset facility data
  console.log(`Fetching data for facility ID: ${facilityId.value}`);
  try {
    const response = await fetch(`/api/facilities/${facilityId.value}`);
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(response.status === 404 ? `Facility with ID ${facilityId.value} not found.` : `HTTP error ${response.status}: ${errorData}`);
    }
    const data = await response.json();
    facility.value = { id: facilityId.value, ...data }; // Store ID along with fetched data
    document.title = `${facility.value.properties?.name || 'Facility'} Details - Lithium Battery Recycling`;
    // Initialize edited data state
    resetEditedData();
    console.log("Facility data loaded:", facility.value);
  } catch (err) {
    console.error('Error fetching facility details:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// --- Computed Properties ---
const headerStyle = computed(() => {
  const props = facility.value?.properties;
  if (props?.facilityImage && props.facilityImage !== 'images/facilities/default.jpg') {
    // Use absolute path from root
    return { backgroundImage: `url('/${props.facilityImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' };
  } else {
    return { backgroundImage: 'none', backgroundColor: '#e9ecef', color: '#333' }; // Adjust background/text color for default
  }
});

const statusClass = computed(() => {
  const status = facility.value?.properties?.status;
  if (!status) return '';
  switch (status.toLowerCase()) {
    case 'operating': return 'status-operating';
    case 'under construction': return 'status-construction';
    case 'planned': return 'status-planned';
    case 'pilot': return 'status-pilot';
    default: return '';
  }
});

// --- Methods ---
function setActiveTab(tabName) {
  activeTab.value = tabName;
}

async function initializeMap() { // Make the function async
  if (!mapContainer.value || !facility.value?.geometry?.coordinates || mapInstance.value) {
     if (mapInstance.value) { // If map exists, just ensure size is correct
         console.log("Invalidating map size on tab switch...");
         nextTick(() => { // Ensure container is visible
             mapInstance.value.invalidateSize();
         });
     } else if (mapContainer.value && !facility.value?.geometry?.coordinates) {
         mapContainer.value.innerHTML = '<p>Location data not available for map.</p>';
     }
     return;
  }

  console.log("Initializing map...");
  mapContainer.value.innerHTML = ''; // Clear placeholder
  const coords = [facility.value.geometry.coordinates[1], facility.value.geometry.coordinates[0]]; // Lat, Lng

  try {
      // Dynamically import Leaflet and its CSS
      const [L, { default: L_css }] = await Promise.all([
          import('leaflet'),
          import('leaflet/dist/leaflet.css', { assert: { type: 'css' } }) // Use import assertions for CSS
      ]);
      // Apply the CSS - Vite handles this automatically with import assertions
      // document.adoptedStyleSheets = [...document.adoptedStyleSheets, L_css]; // No longer needed with Vite

      // Explicitly set icon paths AFTER dynamic import
      // Check if prototype exists before deleting/merging
      if (L.Icon?.Default?.prototype?._getIconUrl) {
          delete L.Icon.Default.prototype._getIconUrl;
      }
      L.Icon.Default.mergeOptions({
        // Use relative paths or ensure they are correctly handled by the build process
        // Assuming Vite copies leaflet assets correctly or they are served from node_modules
        iconRetinaUrl: '/node_modules/leaflet/dist/images/marker-icon-2x.png',
        iconUrl: '/node_modules/leaflet/dist/images/marker-icon.png',
        shadowUrl: '/node_modules/leaflet/dist/images/marker-shadow.png',
      });

      mapInstance.value = L.map(mapContainer.value).setView(coords, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&amp;copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstance.value);
      L.marker(coords).addTo(mapInstance.value)
        .bindPopup(facility.value.properties?.name || 'Facility Location')
        .openPopup();
  } catch (mapError) {
      console.error("Error initializing Leaflet map:", mapError);
      mapContainer.value.innerHTML = '<p class="text-danger">Error initializing map.</p>';
      mapInstance.value = null;
  }
}

function resetEditedData() {
    // Deep copy properties to avoid modifying original ref object directly
    Object.assign(editedFacilityData, JSON.parse(JSON.stringify(facility.value?.properties || {})));
}

function enableEditMode() {
    resetEditedData(); // Start fresh edits from current data
    isEditing.value = true;
    console.log("Edit mode enabled");
}

function cancelEditMode() {
    isEditing.value = false;
    // Optionally reset editedFacilityData if you don't want to keep partial edits
    resetEditedData();
    console.log("Edit mode cancelled");
}

function updateEditedData(key, value) {
    if (editedFacilityData.hasOwnProperty(key)) {
        editedFacilityData[key] = value;
    }
}

async function saveChanges() {
    console.log("Saving changes...", editedFacilityData);
    if (!facility.value || !facilityId.value) {
        alert("Error: Facility data not loaded or ID missing.");
        return;
    }

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        alert("Error: You must be logged in to save changes.");
        // Optionally redirect to login
        // router.push('/login');
        return;
    }

    // Show loading state? (e.g., disable save button)
    const saveButton = document.getElementById('saveButton');
    if(saveButton) saveButton.disabled = true;


    try {
        const response = await fetch(`/api/facilities/${facilityId.value}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(editedFacilityData), // Send only the edited properties
        });

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try { const errorData = await response.json(); errorMsg += ` - ${errorData.message || 'Unknown error'}`; } catch (e) {}
            throw new Error(errorMsg);
        }

        const savedData = await response.json();
        console.log('Save successful:', savedData);

        // Update the main facility data with the saved properties
        facility.value.properties = { ...facility.value.properties, ...savedData };
        resetEditedData(); // Reflect saved data in edit state as well

        isEditing.value = false;
        alert('Changes saved successfully!');

    } catch (error) {
        console.error('Error saving facility data:', error);
        alert(`Error saving changes: ${error.message}`);
    } finally {
         if(saveButton) saveButton.disabled = false;
    }
}


// --- Lifecycle Hooks ---
onMounted(() => {
  fetchFacilityData();
});

// --- Watchers ---
watch(activeTab, (newTab) => {
  if (newTab === 'location') {
    // Use nextTick to ensure the map container element is rendered and visible
    nextTick(() => {
        initializeMap();
    });
  }
});

// Watch for route changes if the component might be reused for different facilities
watch(() => route.params.id, (newId) => {
  if (newId && newId !== facilityId.value) {
    console.log(`Route changed, new facility ID: ${newId}`);
    facilityId.value = newId;
    // Reset state before fetching new data
    isEditing.value = false;
    activeTab.value = 'overview';
    mapInstance.value?.remove(); // Clean up old map instance
    mapInstance.value = null;
    mapContainer.value.innerHTML = '<p>Map loading...</p>'; // Reset map container
    fetchFacilityData();
  }
});

// Watch for facility data changes to potentially re-initialize map if needed
// (e.g., if coordinates were initially missing but loaded later)
watch(facility, (newFacilityData) => {
    if (activeTab.value === 'location' && newFacilityData?.geometry?.coordinates && !mapInstance.value) {
         nextTick(() => {
            initializeMap();
        });
    }
    // Update edit state if facility data changes externally (e.g., after save)
    if (!isEditing.value) {
        resetEditedData();
    }
}, { deep: true });


</script>

<style scoped>
.facility-detail-view {
  padding-bottom: 50px; /* Add padding at the bottom */
}

.facility-header {
  background-size: cover;
  background-position: center;
  color: white; /* Default text color */
  min-height: 200px; /* Ensure some height even without image */
  display: flex;
  align-items: center; /* Vertically center content */
}

.facility-header .header-content {
    background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent overlay for text readability */
    padding: 20px;
    border-radius: 5px;
    width: 100%; /* Ensure overlay spans width */
}

/* Make header text white when overlay is dark */
.facility-header .header-content h1,
.facility-header .header-content p {
    color: white;
}


.status-badge {
  display: inline-block;
  padding: 0.35em 0.65em;
  font-size: .75em;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: 0.25rem;
  margin-top: 5px;
}

.status-operating { background-color: #28a745; } /* Green */
.status-construction { background-color: #fd7e14; } /* Orange */
.status-planned { background-color: #0dcaf0; } /* Cyan */
.status-pilot { background-color: #6f42c1; } /* Purple */
.status-badge:not([class*='status-']) { background-color: #6c757d; } /* Default Grey */

.content-section {
  display: none; /* Hide sections by default */
  padding-top: 15px;
  border-top: 1px solid #dee2e6;
  margin-top: -1px; /* Align border with nav tabs */
}

.content-section.active {
  display: block; /* Show active section */
}

/* Timeline Styles (Basic) */
.timeline {
  position: relative;
  padding: 20px 0;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #e9ecef;
  margin-left: -2px;
}

.timeline-container {
  position: relative;
  margin-bottom: 40px;
  width: 50%;
}

.timeline-container.left {
  left: 0;
  padding-right: 40px; /* Space from center line */
}

.timeline-container.right {
  left: 50%;
  padding-left: 40px; /* Space from center line */
}

/* Circle on the timeline */
.timeline-container::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  right: -8px; /* Adjust for left container */
  background-color: white;
  border: 4px solid #0d6efd; /* Bootstrap primary color */
  top: 15px; /* Adjust vertical position */
  border-radius: 50%;
  z-index: 1;
}

.timeline-container.right::after {
  left: -8px; /* Adjust for right container */
}

.timeline-content {
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-radius: 6px;
  position: relative;
  border: 1px solid #dee2e6;
}

.timeline-container.left .timeline-content {
  text-align: right;
}

/* Responsive Timeline */
@media screen and (max-width: 768px) {
  .timeline::before {
    left: 8px; /* Move line to the left */
    margin-left: 0;
  }
  .timeline-container {
    width: 100%;
    padding-left: 40px; /* Adjust padding */
    padding-right: 15px;
    left: 0 !important; /* Override left/right positioning */
  }
  .timeline-container::after {
    left: 0; /* Position circle on the line */
  }
   .timeline-container.left .timeline-content,
   .timeline-container.right .timeline-content {
      text-align: left; /* Align all content left */
   }
}

/* Edit Mode Styles */
.editable {
    border: 1px dashed #0d6efd; /* Blue dashed border */
    padding: 5px;
    background-color: #eef; /* Light blue background */
    min-height: 1.5em; /* Ensure editable spans have some height */
    display: inline-block; /* Ensure spans take up space */
    cursor: text;
}
/* Ensure block elements like divs take full width when editable */
div.editable {
    display: block;
}
[contenteditable="true"] {
    outline: none; /* Remove default focus outline */
}
[contenteditable="true"]:focus {
    border: 1px solid #0d6efd; /* Solid border on focus */
    background-color: #fff;
}

/* Ensure Leaflet map controls are visible */
:deep(.leaflet-control-zoom a),
:deep(.leaflet-control-attribution a) {
    color: #0078A8 !important; /* Make links visible */
}
:deep(.leaflet-control-attribution) {
    background: rgba(255, 255, 255, 0.7) !important; /* Semi-transparent background */
}

</style>