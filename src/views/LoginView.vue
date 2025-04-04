<template>
  <div class="container mt-4"> <!-- Added container -->
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-4">
        <div class="card">
          <div class="card-body">
            <h2 class="card-title text-center mb-4">Admin Login</h2>
            <form @submit.prevent="handleLogin">
              <div class="mb-3">
                <label for="email" class="form-label">Email address</label>
                <input type="email" class="form-control" id="email" v-model="email" required>
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control" id="password" v-model="password" required>
              </div>
              <div class="d-grid"> <!-- Make button full width -->
                 <button type="submit" class="btn btn-primary" :disabled="loading">
                    <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    {{ loading ? 'Logging in...' : 'Log In' }}
                 </button>
              </div>
            </form>
            <p v-if="errorMessage" class="text-danger mt-3 text-center">{{ errorMessage }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'; // Inject added
import { useRouter } from 'vue-router';
import { authService } from '../services/authService.js';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false); // Added loading state
const router = useRouter();

// Inject the checkAuthStatus method from the root app instance
// This assumes checkAuthStatus is provided in main.js
// const checkAuthStatus = inject('checkAuthStatus'); // Removed - Let main.js handle auth state updates

const handleLogin = async () => {
  errorMessage.value = '';
  loading.value = true; // Set loading true
  try {
    console.log('Attempting login for:', email.value);
    const user = await authService.login(email.value, password.value);
    console.log('Login successful:', user);

    // No need to manually call checkAuthStatus here if main.js handles it
    // via onAuthStateChanged or similar mechanism provided by authService.
    // if (checkAuthStatus) {
    //   await checkAuthStatus(); // Ensure global state is updated
    // } else {
    //    console.warn("checkAuthStatus function not injected from root app.");
    // }


    // Redirect to dashboard or intended page after login
    router.push({ name: 'Dashboard' });
  } catch (error) {
    console.error('Login failed:', error);
    errorMessage.value = error.message || 'Login failed. Please check your credentials.';
  } finally {
      loading.value = false; // Set loading false
  }
};
</script>

<style scoped>
/* Add basic styling for the login form if needed */
.card {
    margin-top: 2rem; /* Add some top margin */
}
/* form div {
  margin-bottom: 10px;
}
label {
  margin-right: 5px;
} */
</style>