// src/pages/EditFacilityPage.js
import { ref, onMounted, computed, inject, watch } from 'vue'; // Added watch
import { useRouter, useRoute } from 'vue-router';
import { authService } from '../services/authService.js'; // Assuming authService handles token retrieval

const EditFacilityPage = {
  props: ['id'], // Receive facility ID from the router parameter
  template: `
    <div class="container mt-4">
      <h2>Edit Facility</h2>
      <hr>

      <div v-if="loading" class="text-center p-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading facility data...</span>
        </div>
      </div>

      <div v-else-if="error" class="alert alert-danger">
        {{ error }}
      </div>

      <div v-else-if="!isAdminOrEditor" class="alert alert-warning">
        You do not have permission to edit this facility.
      </div>

      <form v-else-if="formData" @submit.prevent="handleFormSubmit">
        <div class="card mb-4">
          <div class="card-header">Facility Details</div>
          <div class="card-body">
            <!-- Basic Info -->
            <div class="row mb-3">
              <div class="col-md-6">
                <label for="facilityName" class="form-label">Facility Name <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="facilityName" v-model="formData.name" required>
              </div>
              <div class="col-md-6">
                <label for="facilityId" class="form-label">Facility ID (Read-only)</label>
                <input type="text" class="form-control" id="facilityId" :value="id" readonly disabled>
              </div>
            </div>
            <div class="row mb-3">
               <div class="col-md-6">
                   <label for="company" class="form-label">Company</label>
                   <input type="text" class="form-control" id="company" v-model="formData.company">
               </div>
               <div class="col-md-6">
                   <label for="status" class="form-label">Status <span class="text-danger">*</span></label>
                   <select class="form-select" id="status" v-model="formData.status" required>
                       <option>Operating</option>
                       <option>Under Construction</option>
                       <option>Planned</option>
                       <option>Pilot</option>
                       <option>Closed</option>
                       <option>Unknown</option>
                   </select>
               </div>
            </div>
             <div class="row mb-3">
                <div class="col-md-4">
                    <label for="address" class="form-label">Address</label>
                    <input type="text" class="form-control" id="address" v-model="formData.address">
                </div>
                <div class="col-md-4">
                    <label for="region" class="form-label">Region/State</label>
                    <input type="text" class="form-control" id="region" v-model="formData.region">
                </div>
                <div class="col-md-4">
                    <label for="country" class="form-label">Country</label>
                    <input type="text" class="form-control" id="country" v-model="formData.country">
                </div>
            </div>

             <!-- Location (Read-only for now, editing coordinates might need a map interface) -->
             <div class="row mb-3">
                 <div class="col-md-6">
                     <label for="longitude" class="form-label">Longitude (Read-only)</label>
                     <input type="number" step="any" class="form-control" id="longitude" :value="originalFacility?.geometry?.coordinates[0]" readonly disabled>
                 </div>
                 <div class="col-md-6">
                     <label for="latitude" class="form-label">Latitude (Read-only)</label>
                     <input type="number" step="any" class="form-control" id="latitude" :value="originalFacility?.geometry?.coordinates[1]" readonly disabled>
                 </div>
             </div>

             <!-- Technical Details -->
             <div class="row mb-3">
                 <div class="col-md-6">
                     <label for="capacity" class="form-label">Capacity</label>
                     <input type="text" class="form-control" id="capacity" v-model="formData.capacity">
                 </div>
                 <div class="col-md-6">
                     <label for="technology" class="form-label">Technology</label>
                     <input type="text" class="form-control" id="technology" v-model="formData.technology">
                 </div>
             </div>
              <div class="row mb-3">
                  <div class="col-md-6">
                      <label for="yearStarted" class="form-label">Year Started/Planned</label>
                      <input type="number" class="form-control" id="yearStarted" v-model.number="formData.yearStartedOrPlanned">
                  </div>
                  <div class="col-md-6">
                      <label for="size" class="form-label">Size (e.g., sq ft, acres)</label>
                      <input type="text" class="form-control" id="size" v-model="formData.size">
                  </div>
              </div>
              <div class="row mb-3">
                  <div class="col-md-6">
                      <label for="feedstock" class="form-label">Feedstock</label>
                      <textarea class="form-control" id="feedstock" rows="2" v-model="formData.feedstock"></textarea>
                  </div>
                  <div class="col-md-6">
                      <label for="products" class="form-label">Products</label>
                      <textarea class="form-control" id="products" rows="2" v-model="formData.products"></textarea>
                  </div>
              </div>
               <div class="mb-3">
                   <label for="technologyDetails" class="form-label">Technology Details</label>
                   <textarea class="form-control" id="technologyDetails" rows="3" v-model="formData.technologyDetails"></textarea>
               </div>

            <!-- Description &amp; Media -->
             <div class="mb-3">
                 <label for="description" class="form-label">Description</label>
                 <textarea class="form-control" id="description" rows="4" v-model="formData.description"></textarea>
             </div>
             <div class="row mb-3">
                 <div class="col-md-6">
                     <label for="website" class="form-label">Website URL</label>
                     <input type="url" class="form-control" id="website" v-model="formData.website">
                 </div>
                  <div class="col-md-6">
                     <label for="fundingSource" class="form-label">Funding Source</label>
                     <input type="text" class="form-control" id="fundingSource" v-model="formData.fundingSource">
                 </div>
             </div>

             <!-- Gallery Images -->
             <div class="mb-3">
                 <label for="galleryImages" class="form-label">Gallery Image URLs (one per line)</label>
                 <textarea class="form-control" id="galleryImages" rows="4" v-model="galleryImagesString"></textarea>
             </div>


          </div>
        </div>

        <!-- Action Buttons -->
        <div class="d-flex justify-content-end gap-2 mb-4">
           <button type="button" class="btn btn-secondary" @click="handleCancel">Cancel</button>
           <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
             <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
             {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
           </button>
        </div>

         <!-- Success/Error Messages -->
         <div v-if="submitSuccess" class="alert alert-success">{{ submitSuccess }}</div>
         <div v-if="submitError" class="alert alert-danger">{{ submitError }}</div>

      </form>
    </div>
  `,
  setup(props) {
    const router = useRouter();
    const route = useRoute(); // Use route to access params if needed, though props.id is preferred
    const userRole = inject('userRole');

    const originalFacility = ref(null); // Store the raw fetched data
    const formData = ref(null); // Data bound to the form
    const loading = ref(true);
    const error = ref(null);
    const isSubmitting = ref(false);
    const submitError = ref(null);
    const submitSuccess = ref(null);
    const galleryImagesString = ref(''); // For the textarea

    const isAdminOrEditor = computed(() => {
      // TODO: Implement proper role-based access control from auth state
      return true; // Temporarily allow access for development
    });

    const fetchFacilityData = async () => {
      loading.value = true;
      error.value = null;
      formData.value = null; // Reset form data
      originalFacility.value = null;

      // Check permission early
      if (!isAdminOrEditor.value) {
          error.value = "You do not have permission to edit facilities.";
          loading.value = false;
          return;
      }

      try {
        // No need for token here if API endpoint is protected server-side based on session/cookie
        // If API requires Bearer token, get it via authService
        // const token = await authService.getToken();
        // if (!token) throw new Error("Authentication required.");

        const response = await fetch(`/api/facilities/${props.id}`/*, {
          headers: { 'Authorization': `Bearer ${token}` }
        }*/);

        if (!response.ok) {
          if (response.status === 404) throw new Error(`Facility with ID ${props.id} not found.`);
          if (response.status === 403) throw new Error(`You do not have permission to view/edit this facility.`);
          throw new Error(`HTTP error ${response.status}`);
        }
        originalFacility.value = await response.json();

        // Prepare formData based on fetched data
        const propsData = originalFacility.value.properties;
        formData.value = {
          name: propsData.name || '',
          company: propsData.company || '',
          status: propsData.status || 'Unknown',
          address: propsData.address || '',
          region: propsData.region || '',
          country: propsData.country || '',
          capacity: propsData.capacity || '',
          technology: propsData.technology || '',
          // Combine yearStarted and yearPlanned for the form field
          yearStartedOrPlanned: propsData.yearStarted || propsData.yearPlanned || null,
          size: propsData.size || '',
          feedstock: propsData.feedstock || '',
          products: propsData.products || '',
          technologyDetails: propsData.technologyDetails || '',
          description: propsData.description || '',
          website: propsData.website || '',
          fundingSource: propsData.fundingSource || '',
          // documents are handled separately, preserve existing
          documents: propsData.documents || []
        };
          // Populate gallery images string for textarea
          galleryImagesString.value = (propsData.galleryImages || []).join('\n');


      } catch (err) {
        console.error('EditFacilityPage: Error fetching facility data:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    const handleFormSubmit = async () => {
      if (!formData.value || !isAdminOrEditor.value) return;

      isSubmitting.value = true;
      submitError.value = null;
      submitSuccess.value = null;

      try {
        const token = await authService.getToken(); // Get token for PUT request
        if (!token) throw new Error("Authentication required to save changes.");

        // --- Prepare payload ---
        const updatedProperties = { ...formData.value };

        // Separate yearStarted/yearPlanned based on status
        if (updatedProperties.status === 'Planned') {
            updatedProperties.yearPlanned = updatedProperties.yearStartedOrPlanned || undefined;
            delete updatedProperties.yearStarted;
        } else {
            updatedProperties.yearStarted = updatedProperties.yearStartedOrPlanned || undefined;
            delete updatedProperties.yearPlanned;
        }
        delete updatedProperties.yearStartedOrPlanned; // Remove the combined field

        // Remove undefined fields to avoid overwriting with nulls if not intended
        Object.keys(updatedProperties).forEach(key => {
            if (updatedProperties[key] === undefined || updatedProperties[key] === null || updatedProperties[key] === '') {
                // Keep required fields like name and status even if empty string (let backend validate)
                // Or decide to delete them if empty string means 'remove'
                if (key !== 'name' && key !== 'status') {
                     delete updatedProperties[key];
                }
            }
        });

        // Ensure ID is included (though not directly editable)
        updatedProperties.id = props.id;
        // Preserve documents from original data
        updatedProperties.documents = originalFacility.value?.properties?.documents || [];


        // Process gallery images from textarea string to array
        if (galleryImagesString.value) {
          updatedProperties.galleryImages = galleryImagesString.value
            .split('\n')
            .map(url => url.trim())
            .filter(url => url);
        } else {
          updatedProperties.galleryImages = []; // Ensure it's an empty array if textarea is empty
        }

        // --- Send data to API ---
        const response = await fetch(`/api/facilities/${props.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedProperties) // Send only properties
        });

        const result = await response.json();

        if (response.ok) {
          submitSuccess.value = `Facility "${result.name || props.id}" updated successfully! Redirecting...`;
          // Optionally update originalFacility and formData refs if staying on page
          originalFacility.value.properties = result; // Assuming API returns updated facility props
          // Re-populate form or just navigate away
          setTimeout(() => {
            router.push({ name: 'FacilityDetail', params: { id: props.id } });
          }, 2000);
        } else {
          throw new Error(result.message || `Error updating facility (Status: ${response.status})`);
        }
      } catch (err) {
        console.error('Error submitting facility update:', err);
        submitError.value = `Failed to save changes: ${err.message}`;
      } finally {
        isSubmitting.value = false;
      }
    };

    const handleCancel = () => {
      // Navigate back to the detail page or list page
      router.push({ name: 'FacilityDetail', params: { id: props.id } });
      // Or router.go(-1);
    };

    onMounted(() => {
      fetchFacilityData();
    });

    // Watch for ID changes if the component instance is reused
     watch(() => props.id, (newId, oldId) => {
       if (newId && newId !== oldId) {
         console.log(`EditFacilityPage: ID changed from ${oldId} to ${newId}. Refetching data.`);
         fetchFacilityData();
       }
     });

    return {
      formData,
      loading,
      error,
      isAdminOrEditor,
      handleFormSubmit,
      handleCancel,
      isSubmitting,
      submitError,
      submitSuccess,
      originalFacility, // Needed for read-only fields like coordinates
      galleryImagesString,
    };
  }
};

export default EditFacilityPage;