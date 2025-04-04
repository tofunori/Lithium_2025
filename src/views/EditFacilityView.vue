<template>
  <div class="container mt-4">
    <h2 id="editPageTitle">Edit Facility: {{ facility?.properties?.name || 'Loading...' }}</h2>

    <div v-if="loading" class="alert alert-info">Loading facility data...</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>

    <form v-if="facility &amp;&amp; !loading" id="editFacilityForm" @submit.prevent="handleFormSubmit">
      <!-- Basic Info Section -->
      <fieldset class="mb-3">
        <legend>Basic Information</legend>
        <div class="mb-3">
          <label for="facilityName" class="form-label">Facility Name</label>
          <input type="text" class="form-control" id="facilityName" v-model="formData.name" required>
        </div>
        <div class="mb-3">
          <label for="facilityId" class="form-label">Facility ID (Read-only)</label>
          <input type="text" class="form-control" id="facilityId" v-model="formData.id" readonly disabled>
        </div>
        <div class="mb-3">
          <label for="company" class="form-label">Company</label>
          <input type="text" class="form-control" id="company" v-model="formData.company">
        </div>
        <div class="mb-3">
          <label for="status" class="form-label">Status</label>
          <select class="form-select" id="status" v-model="formData.status" required>
            <option>Operating</option>
            <option>Under Construction</option>
            <option>Planned</option>
            <option>Closed</option>
            <option>On Hold</option>
          </select>
        </div>
        <div class="mb-3">
          <label for="address" class="form-label">Address</label>
          <input type="text" class="form-control" id="address" v-model="formData.address">
        </div>
        <div class="mb-3">
          <label for="region" class="form-label">Region/State</label>
          <input type="text" class="form-control" id="region" v-model="formData.region">
        </div>
        <div class="mb-3">
          <label for="country" class="form-label">Country</label>
          <input type="text" class="form-control" id="country" v-model="formData.country">
        </div>
      </fieldset>

      <!-- Location Section -->
      <fieldset class="mb-3">
        <legend>Location (Coordinates)</legend>
        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="longitude" class="form-label">Longitude</label>
            <input type="number" step="any" class="form-control" id="longitude" v-model.number="formData.longitude" required>
          </div>
          <div class="col-md-6 mb-3">
            <label for="latitude" class="form-label">Latitude</label>
            <input type="number" step="any" class="form-control" id="latitude" v-model.number="formData.latitude" required>
          </div>
        </div>
      </fieldset>

      <!-- Technical Details Section -->
      <fieldset class="mb-3">
        <legend>Technical Details</legend>
        <div class="mb-3">
          <label for="capacity" class="form-label">Capacity (Tonnes/Year)</label>
          <input type="text" class="form-control" id="capacity" v-model="formData.capacity">
        </div>
        <div class="mb-3">
          <label for="technology" class="form-label">Technology</label>
          <input type="text" class="form-control" id="technology" v-model="formData.technology">
        </div>
        <div class="mb-3">
          <label for="yearStarted" class="form-label">Year Started / Planned</label>
          <input type="number" class="form-control" id="yearStarted" v-model.number="formData.yearStarted">
           <small class="form-text text-muted">Enter the year the facility started operating or is planned to start.</small>
        </div>
         <div class="mb-3">
          <label for="size" class="form-label">Size (e.g., sq ft, sq m)</label>
          <input type="text" class="form-control" id="size" v-model="formData.size">
        </div>
        <div class="mb-3">
          <label for="feedstock" class="form-label">Feedstock</label>
          <textarea class="form-control" id="feedstock" rows="3" v-model="formData.feedstock"></textarea>
        </div>
        <div class="mb-3">
          <label for="products" class="form-label">Products</label>
          <textarea class="form-control" id="products" rows="3" v-model="formData.products"></textarea>
        </div>
         <div class="mb-3">
          <label for="technologyDetails" class="form-label">Technology Details</label>
          <textarea class="form-control" id="technologyDetails" rows="4" v-model="formData.technologyDetails"></textarea>
        </div>
      </fieldset>

      <!-- Description &amp; Media Section -->
      <fieldset class="mb-3">
        <legend>Description &amp; Media</legend>
        <div class="mb-3">
          <label for="description" class="form-label">Description</label>
          <textarea class="form-control" id="description" rows="5" v-model="formData.description"></textarea>
        </div>
        <div class="mb-3">
          <label for="website" class="form-label">Website URL</label>
          <input type="url" class="form-control" id="website" v-model="formData.website">
        </div>
        <div class="mb-3">
          <label for="companyLogo" class="form-label">Company Logo URL</label>
          <input type="url" class="form-control" id="companyLogo" v-model="formData.companyLogo">
        </div>
        <div class="mb-3">
          <label for="facilityImage" class="form-label">Facility Image URL</label>
          <input type="url" class="form-control" id="facilityImage" v-model="formData.facilityImage">
        </div>
         <div class="mb-3">
          <label for="fundingSource" class="form-label">Funding Source</label>
          <input type="text" class="form-control" id="fundingSource" v-model="formData.fundingSource">
        </div>
      </fieldset>

       <!-- Timeline Section -->
      <fieldset class="mb-3">
        <legend>Timeline (JSON Array)</legend>
        <div class="mb-3">
          <label for="timeline" class="form-label">Timeline Events</label>
          <textarea class="form-control" id="timeline" rows="6" v-model="timelineJson" placeholder='[
  { "date": "YYYY-MM-DD", "event": "Event description" },
  { "date": "YYYY-MM-DD", "event": "Another event" }
]'></textarea>
          <small class="form-text text-muted">Enter a valid JSON array of timeline objects, each with 'date' and 'event' keys.</small>
           <div v-if="timelineError" class="alert alert-danger mt-2">{{ timelineError }}</div>
        </div>
      </fieldset>

      <!-- Action Buttons -->
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <button type="submit" class="btn btn-primary me-2" :disabled="loading || !!timelineError">Save Changes</button>
          <button type="button" class="btn btn-secondary me-2" @click="cancelEdit">Cancel</button>
        </div>
        <button type="button" class="btn btn-danger" @click="handleDeleteFacility" :disabled="loading">Delete Facility</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFacilityStore } from '@/stores/facilityStore';
// Assuming your service is structured to be imported directly if needed,
// but primarily using the store actions.
// import facilityService from '@/services/facilities';

const route = useRoute();
const router = useRouter();
const facilityStore = useFacilityStore();

const facility = ref(null);
const formData = ref({}); // Use a separate ref for form data to avoid modifying store state directly
const loading = ref(true);
const error = ref('');
const successMessage = ref('');
const timelineJson = ref('[]'); // Store timeline as JSON string for textarea
const timelineError = ref(''); // Error specific to timeline JSON parsing

const facilityId = computed(() => route.params.id);

// Function to safely parse timeline JSON
const parseTimeline = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString || '[]');
    if (!Array.isArray(parsed)) {
      throw new Error("Timeline must be a valid JSON array.");
    }
    // Optional: Validate structure of array items
    parsed.forEach(item => {
        if (typeof item !== 'object' || item === null || !item.date || !item.event) {
            throw new Error("Each timeline item must be an object with 'date' and 'event' properties.");
        }
    });
    timelineError.value = ''; // Clear error if valid
    return parsed;
  } catch (e) {
    timelineError.value = `Invalid Timeline JSON: ${e.message}`;
    return null; // Indicate parsing failure
  }
};

// Watch for changes in the timeline textarea and validate
watch(timelineJson, (newJson) => {
  parseTimeline(newJson); // Validate on change
});


onMounted(async () => {
  if (!facilityId.value) {
    error.value = 'No facility ID provided in the URL.';
    loading.value = false;
    return;
  }
  try {
    loading.value = true;
    error.value = '';
    successMessage.value = '';
    // Log available store methods for debugging
    console.log('Available facilityStore methods:', Object.keys(facilityStore));
    // Fetch from store, which handles caching/fetching from service
    await facilityStore.fetchFacilityDetails(facilityId.value);
    // Use the getter to access the fetched facility
    facility.value = facilityStore.getFacilityById(facilityId.value);

    if (facility.value) {
      // Initialize formData with fetched data
      formData.value = {
        ...facility.value.properties,
        longitude: facility.value.geometry?.coordinates[0] ?? null,
        latitude: facility.value.geometry?.coordinates[1] ?? null,
        // Use yearStarted or yearPlanned based on status from original data
        yearStarted: facility.value.properties.yearStarted || facility.value.properties.yearPlanned || null,
      };
       // Initialize timelineJson from fetched data
      timelineJson.value = JSON.stringify(facility.value.properties.timeline || [], null, 2);
      parseTimeline(timelineJson.value); // Validate initial JSON
    } else {
      error.value = `Facility with ID "${facilityId.value}" not found.`;
    }
  } catch (err) {
    console.error('Error loading facility data:', err);
    error.value = `Failed to load facility data: ${err.message || 'Unknown error'}`;
    facility.value = null; // Ensure facility is null on error
  } finally {
    loading.value = false;
  }
});

const handleFormSubmit = async () => {
  if (timelineError.value) {
      error.value = "Please fix the errors in the Timeline JSON before saving.";
      successMessage.value = '';
      return; // Prevent submission if timeline JSON is invalid
  }

  loading.value = true;
  error.value = '';
  successMessage.value = '';

  const parsedTimeline = parseTimeline(timelineJson.value);
  if (parsedTimeline === null) {
      // This check is redundant if the button is disabled, but good for safety
      error.value = "Timeline JSON is invalid.";
      loading.value = false;
      return;
  }

  // Prepare data for update (properties and geometry)
  const updatedData = {
      properties: {
          ...formData.value,
          // Remove coordinates from properties if they exist there
          longitude: undefined,
          latitude: undefined,
          // Handle yearStarted/yearPlanned based on status
          yearStarted: formData.value.status !== 'Planned' ? formData.value.yearStarted || undefined : undefined,
          yearPlanned: formData.value.status === 'Planned' ? formData.value.yearStarted || undefined : undefined,
          // Add parsed timeline
          timeline: parsedTimeline.length > 0 ? parsedTimeline : undefined,
          // Ensure documents array is preserved if it existed
          documents: facility.value?.properties?.documents || []
      },
      geometry: {
          type: "Point",
          coordinates: [
              formData.value.longitude,
              formData.value.latitude
          ]
      }
  };

   // Clean up undefined properties
   Object.keys(updatedData.properties).forEach(key => {
       if (updatedData.properties[key] === undefined || updatedData.properties[key] === null || updatedData.properties[key] === '') {
           delete updatedData.properties[key];
       }
   });
   // Re-add essential but potentially empty fields if needed by backend/schema
   if (!updatedData.properties.timeline) updatedData.properties.timeline = []; // Ensure timeline is at least an empty array if cleared


  try {
    await facilityStore.updateFacility(facilityId.value, updatedData);
    successMessage.value = `Facility "${updatedData.properties.name}" updated successfully! Redirecting...`;
    // Optionally update local facility ref if needed, though redirecting is common
    facility.value = facilityStore.getFacilityById(facilityId.value); // Refresh local state from store
    setTimeout(() => {
      // Redirect to the updated facility detail page (adjust route name if necessary)
      router.push({ name: 'FacilityDetail', params: { id: facilityId.value } });
    }, 2000);
  } catch (err) {
    console.error('Error updating facility:', err);
    error.value = `Failed to update facility: ${err.message || 'Unknown error'}`;
  } finally {
    loading.value = false;
  }
};

const handleDeleteFacility = async () => {
  if (!facility.value || !facilityId.value) {
    error.value = "Cannot delete facility: Data is missing.";
    return;
  }

  const facilityName = facility.value.properties.name;
  if (window.confirm(`Are you sure you want to delete the facility "${facilityName}"? This action cannot be undone.`)) {
    loading.value = true;
    error.value = '';
    successMessage.value = 'Deleting facility...';

    try {
      await facilityStore.deleteFacility(facilityId.value);
      successMessage.value = `Facility "${facilityName}" deleted successfully! Redirecting...`;
      setTimeout(() => {
        // Redirect to the facilities list page (adjust route name if necessary)
        router.push({ name: 'FacilitiesList' });
      }, 2000);
    } catch (err) {
      console.error('Error deleting facility:', err);
      successMessage.value = ''; // Clear 'Deleting...' message
      error.value = `Failed to delete facility: ${err.message || 'Unknown error'}`;
      loading.value = false;
    }
    // No finally loading=false here, as we redirect on success
  }
};

const cancelEdit = () => {
  // Navigate back or to a specific page, e.g., the facility detail page or list
  if (facilityId.value) {
      router.push({ name: 'FacilityDetail', params: { id: facilityId.value } });
  } else {
      router.push({ name: 'FacilitiesList' }); // Fallback to list
  }
};

</script>

<style scoped>
/* Add any component-specific styles here */
fieldset {
  border: 1px solid #ccc;
  padding: 1.5rem;
  border-radius: 0.25rem;
}
legend {
  width: auto;
  padding: 0 0.5rem;
  font-size: 1.2rem;
  font-weight: bold;
}
</style>