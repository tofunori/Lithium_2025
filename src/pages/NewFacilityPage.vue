<template>
  <div class="container mt-4">
    <h2>Add New Recycling Facility</h2>
    <div v-if="loading" class="alert alert-info">Submitting...</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="success" class="alert alert-success">Facility added successfully!</div>

    <form @submit.prevent="handleSubmit" v-if="!success">
      <div class="mb-3">
        <label for="name" class="form-label">Facility Name</label>
        <input type="text" class="form-control" id="name" v-model="facility.name" required>
      </div>
      <div class="mb-3">
        <label for="location" class="form-label">Location (City, State/Province)</label>
        <input type="text" class="form-control" id="location" v-model="facility.location" required>
      </div>
      <div class="mb-3">
        <label for="capacity" class="form-label">Processing Capacity (tons/year)</label>
        <input type="number" class="form-control" id="capacity" v-model.number="facility.capacity">
      </div>
       <div class="mb-3">
        <label for="technologies" class="form-label">Recycling Technologies (comma-separated)</label>
        <input type="text" class="form-control" id="technologies" v-model="facility.technologies">
      </div>
       <div class="mb-3">
        <label for="status" class="form-label">Status</label>
        <select class="form-select" id="status" v-model="facility.status">
          <option value="Operational">Operational</option>
          <option value="Under Construction">Under Construction</option>
          <option value="Planned">Planned</option>
        </select>
      </div>
      <div class="mb-3">
        <label for="contactEmail" class="form-label">Contact Email</label>
        <input type="email" class="form-control" id="contactEmail" v-model="facility.contactEmail">
      </div>
      <button type="submit" class="btn btn-primary" :disabled="loading">Add Facility</button>
      <router-link to="/facilities" class="btn btn-secondary ms-2">Cancel</router-link>
    </form>
     <div v-if="success">
        <router-link to="/facilities" class="btn btn-primary">Back to Facilities List</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/authService'; // Corrected named import

const facility = ref({
  name: '',
  location: '',
  capacity: null,
  technologies: '',
  status: 'Planned', // Default status
  contactEmail: ''
});
const loading = ref(false);
const error = ref(null);
const success = ref(false);
const router = useRouter();

const handleSubmit = async () => {
  loading.value = true;
  error.value = null;
  success.value = false;

  try {
    const token = await authService.getToken(); // Get token from authService
    if (!token) {
      throw new Error('Authentication token not found. Please log in.');
    }

    // Prepare data, split technologies string into an array
    const postData = {
      ...facility.value,
      technologies: facility.value.technologies.split(',').map(t => t.trim()).filter(t => t) // Convert comma-separated string to array
    };

    const response = await fetch('/api/facilities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const newFacility = await response.json();
    success.value = true;
    // Optionally redirect after a delay or stay on page showing success
    // setTimeout(() => router.push({ name: 'FacilityDetail', params: { id: newFacility.id } }), 2000); // Example redirect
    // Or redirect immediately: router.push('/facilities');

  } catch (err) {
    console.error('Error adding facility:', err);
    error.value = err.message || 'Failed to add facility. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Add any component-specific styles here */
.container {
  max-width: 800px;
}
</style>