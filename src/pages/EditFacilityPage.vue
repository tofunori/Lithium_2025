<template>
  <div class="container mt-4">
    <h2>Edit Facility: {{ originalFacilityName }}</h2>

    <div v-if="loading" class="alert alert-info">Loading facility data...</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <form @submit.prevent="handleUpdate" v-if="facility &amp;&amp; !loading &amp;&amp; !success">
      <!-- Basic Info -->
      <h4>Basic Information</h4>
      <div class="mb-3">
        <label for="facilityName" class="form-label">Facility Name</label>
        <input type="text" class="form-control" id="facilityName" v-model="facility.name" required>
      </div>
       <div class="mb-3">
        <label for="facilityId" class="form-label">Facility ID (Read-only)</label>
        <input type="text" class="form-control" id="facilityId" :value="facility.id" readonly disabled>
      </div>
       <div class="mb-3">
        <label for="company" class="form-label">Company</label>
        <input type="text" class="form-control" id="company" v-model="facility.company">
      </div>
      <div class="mb-3">
        <label for="status" class="form-label">Status</label>
        <select class="form-select" id="status" v-model="facility.status">
          <option value="Operational">Operational</option>
          <option value="Under Construction">Under Construction</option>
          <option value="Planned">Planned</option>
           <!-- Add other statuses if needed -->
        </select>
      </div>
       <div class="mb-3">
        <label for="address" class="form-label">Address</label>
        <input type="text" class="form-control" id="address" v-model="facility.address">
      </div>
       <div class="mb-3">
        <label for="region" class="form-label">Region</label>
        <input type="text" class="form-control" id="region" v-model="facility.region">
      </div>
       <div class="mb-3">
        <label for="country" class="form-label">Country</label>
        <input type="text" class="form-control" id="country" v-model="facility.country">
      </div>

      <!-- Location (Read-only in this form, assuming separate geometry update mechanism if needed) -->
       <h4>Location (Read-only)</h4>
       <div class="row">
         <div class="col-md-6 mb-3">
           <label for="longitude" class="form-label">Longitude</label>
           <input type="number" step="any" class="form-control" id="longitude" :value="facility.geometry?.coordinates[0]" readonly disabled>
         </div>
         <div class="col-md-6 mb-3">
           <label for="latitude" class="form-label">Latitude</label>
           <input type="number" step="any" class="form-control" id="latitude" :value="facility.geometry?.coordinates[1]" readonly disabled>
         </div>
       </div>

       <!-- Technical Details -->
       <h4>Technical Details</h4>
       <div class="mb-3">
        <label for="capacity" class="form-label">Processing Capacity (tons/year)</label>
        <input type="number" class="form-control" id="capacity" v-model.number="facility.capacity">
      </div>
       <div class="mb-3">
        <label for="technology" class="form-label">Primary Technology</label>
        <input type="text" class="form-control" id="technology" v-model="facility.technology">
      </div>
       <div class="mb-3">
        <label for="yearStarted" class="form-label">Year Started / Planned</label>
        <input type="number" class="form-control" id="yearStarted" v-model.number="facility.yearStartedOrPlanned">
        <small class="form-text text-muted">Enter the year operations started or are planned to start.</small>
      </div>
       <div class="mb-3">
        <label for="size" class="form-label">Facility Size (e.g., sq ft, sq m)</label>
        <input type="text" class="form-control" id="size" v-model="facility.size">
      </div>
       <div class="mb-3">
        <label for="feedstock" class="form-label">Feedstock Accepted (comma-separated)</label>
        <input type="text" class="form-control" id="feedstock" v-model="facility.feedstock">
      </div>
       <div class="mb-3">
        <label for="products" class="form-label">Products Recovered (comma-separated)</label>
        <input type="text" class="form-control" id="products" v-model="facility.products">
      </div>
       <div class="mb-3">
        <label for="technologyDetails" class="form-label">Technology Details</label>
        <textarea class="form-control" id="technologyDetails" rows="3" v-model="facility.technologyDetails"></textarea>
      </div>

       <!-- Description & Media -->
       <h4>Description &amp; Media</h4>
       <div class="mb-3">
        <label for="description" class="form-label">Description</label>
        <textarea class="form-control" id="description" rows="5" v-model="facility.description"></textarea>
      </div>
       <div class="mb-3">
        <label for="website" class="form-label">Website URL</label>
        <input type="url" class="form-control" id="website" v-model="facility.website">
      </div>
       <div class="mb-3">
        <label for="companyLogo" class="form-label">Company Logo URL</label>
        <input type="url" class="form-control" id="companyLogo" v-model="facility.companyLogo">
      </div>
       <div class="mb-3">
        <label for="facilityImage" class="form-label">Facility Image URL</label>
        <input type="url" class="form-control" id="facilityImage" v-model="facility.facilityImage">
      </div>
       <div class="mb-3">
        <label for="fundingSource" class="form-label">Funding Source(s)</label>
        <input type="text" class="form-control" id="fundingSource" v-model="facility.fundingSource">
      </div>

       <!-- Timeline -->
       <h4>Timeline (JSON Array)</h4>
       <div class="mb-3">
        <label for="timeline" class="form-label">Timeline Events</label>
        <textarea class="form-control" id="timeline" rows="5" v-model="timelineJsonString"></textarea>
        <small class="form-text text-muted">Enter as a JSON array of objects, e.g., [{"date": "2023-01-15", "event": "Groundbreaking"}].</small>
        <div v-if="timelineError" class="text-danger small mt-1">{{ timelineError }}</div>
      </div>

      <!-- Actions -->
      <div class="mt-4">
        <button type="submit" class="btn btn-primary" :disabled="loading || !!timelineError">Update Facility</button>
        <router-link :to="{ name: 'FacilityDetail', params: { id: facilityId } }" class="btn btn-secondary ms-2">Cancel</router-link>
        <button type="button" class="btn btn-danger ms-2" @click="handleDelete" :disabled="loading">Delete Facility</button>
      </div>
    </form>

     <div v-if="success">
        <router-link v-if="!isDeleted" :to="{ name: 'FacilityDetail', params: { id: facilityId } }" class="btn btn-primary">View Updated Facility</router-link>
         <router-link v-else to="/facilities" class="btn btn-primary">Back to Facilities List</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authService } from '../services/authService'; // Assuming path

const route = useRoute();
const router = useRouter();
const facilityId = ref(route.params.id);
const facility = ref(null); // Will hold the properties object and geometry
const originalFacilityName = ref(''); // For the title
const loading = ref(false);
const error = ref(null);
const success = ref(null); // Success message
const isDeleted = ref(false); // Track if deletion occurred

const timelineJsonString = ref('');
const timelineError = ref(null);

// Fetch facility data when component mounts
onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const token = await authService.getToken();
    if (!token) throw new Error('Authentication required.');

    const response = await fetch(`/api/facilities/${facilityId.value}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error(`Facility with ID "${facilityId.value}" not found.`);
      throw new Error(`Failed to load facility data: ${response.statusText}`);
    }

    const data = await response.json();
    // Separate properties and geometry for easier handling
    facility.value = { ...data.properties, geometry: data.geometry };
    originalFacilityName.value = data.properties.name || 'Facility';

    // Handle yearStarted/yearPlanned consolidation for the form field
    facility.value.yearStartedOrPlanned = facility.value.yearStarted || facility.value.yearPlanned;

     // Initialize timeline textarea
    timelineJsonString.value = JSON.stringify(facility.value.timeline || [], null, 2);

  } catch (err) {
    console.error('Error fetching facility:', err);
    error.value = err.message;
    facility.value = null; // Ensure form doesn't render
  } finally {
    loading.value = false;
  }
});

// Watch the timeline textarea for valid JSON
watch(timelineJsonString, (newValue) => {
  try {
    const parsed = JSON.parse(newValue);
    if (!Array.isArray(parsed)) {
      throw new Error('Timeline must be a valid JSON array.');
    }
    timelineError.value = null; // Clear error if JSON is valid array
  } catch (e) {
    timelineError.value = `Invalid JSON: ${e.message}`;
  }
});

// Handle form submission for update
const handleUpdate = async () => {
  if (timelineError.value) {
    error.value = "Please fix the errors in the Timeline JSON before submitting.";
    return;
  }

  loading.value = true;
  error.value = null;
  success.value = null;

  try {
    const token = await authService.getToken();
    if (!token) throw new Error('Authentication required.');

    // Prepare the properties payload, excluding geometry and the temporary year field
    const { geometry, yearStartedOrPlanned, ...propertiesToUpdate } = facility.value;

     // Handle yearStarted/yearPlanned based on status
     if (propertiesToUpdate.status === 'Planned' && facility.value.yearStartedOrPlanned) {
         propertiesToUpdate.yearPlanned = facility.value.yearStartedOrPlanned;
         delete propertiesToUpdate.yearStarted;
     } else if (propertiesToUpdate.status !== 'Planned' && facility.value.yearStartedOrPlanned) {
         propertiesToUpdate.yearStarted = facility.value.yearStartedOrPlanned;
         delete propertiesToUpdate.yearPlanned;
     } else { // If year field is empty or status doesn't match logic, clear both
         delete propertiesToUpdate.yearStarted;
         delete propertiesToUpdate.yearPlanned;
     }

     // Parse timeline JSON string back into an array
     try {
        propertiesToUpdate.timeline = JSON.parse(timelineJsonString.value || '[]');
     } catch (e) {
         throw new Error("Invalid Timeline JSON format."); // Should be caught by watcher, but double-check
     }

     // Convert comma-separated strings back if needed (assuming they are stored as strings)
     // If they are stored as arrays, this step is not needed. Adjust based on actual data structure.
     // propertiesToUpdate.feedstock = propertiesToUpdate.feedstock.split(',').map(t => t.trim()).filter(t => t);
     // propertiesToUpdate.products = propertiesToUpdate.products.split(',').map(t => t.trim()).filter(t => t);


    const response = await fetch(`/api/facilities/${facilityId.value}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(propertiesToUpdate) // Send only properties
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Failed to update facility: ${response.statusText}`);
    }

    success.value = `Facility "${result.name || facility.value.name}" updated successfully!`;
    originalFacilityName.value = result.name || facility.value.name; // Update title in case name changed
    // Optionally update facility.value with result if needed, though success message triggers view change
    // facility.value = { ...result, geometry: facility.value.geometry }; // Keep existing geometry

  } catch (err) {
    console.error('Error updating facility:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

// Handle facility deletion
const handleDelete = async () => {
  if (!window.confirm(`Are you sure you want to delete the facility "${facility.value?.name || facilityId.value}"? This cannot be undone.`)) {
    return;
  }

  loading.value = true;
  error.value = null;
  success.value = null;
  isDeleted.value = false;

  try {
    const token = await authService.getToken();
    if (!token) throw new Error('Authentication required.');

    const response = await fetch(`/api/facilities/${facilityId.value}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
       throw new Error(result.message || `Failed to delete facility: ${response.statusText}`);
    }

    success.value = `Facility "${facility.value?.name || facilityId.value}" deleted successfully! Redirecting...`;
    isDeleted.value = true; // Mark as deleted for the success message link

    // Redirect to facilities list after a short delay
    setTimeout(() => {
      router.push('/facilities');
    }, 2000);

  } catch (err) {
    console.error('Error deleting facility:', err);
    error.value = err.message;
    loading.value = false; // Ensure loading is false on error
  }
  // No finally block for loading here, as we want the success message to persist until redirect
};

</script>

<style scoped>
.container {
  max-width: 900px;
}
h4 {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #dee2e6;
    padding-bottom: 0.5rem;
}
/* Add any component-specific styles here */
</style>