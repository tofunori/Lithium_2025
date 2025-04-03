<template>
  <div>
    <h2>Login</h2>
    <form @submit.prevent="handleLogin">
      <div>
        <label for="email">Email:</label>
        <input type="email" id="email" v-model="email" required>
      </div>
      <div>
        <label for="password">Password:</label>
        <input type="password" id="password" v-model="password" required>
      </div>
      <button type="submit">Log In</button>
    </form>
    <p v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/authService.js'; // Assuming authService handles login

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const router = useRouter();

const handleLogin = async () => {
  errorMessage.value = ''; // Clear previous errors
  try {
    console.log('Attempting login for:', email.value);
    // In a real app, you'd call your auth service here
    // Example using a hypothetical authService:
    const user = await authService.login(email.value, password.value); 
    console.log('Login successful:', user);

    // Access the root instance to update global state (if needed and set up)
    // This requires the root instance to expose methods or data for this purpose
    // Example: Assuming a method `checkAuthStatus` exists on the root instance


    // Redirect to dashboard or intended page after login
    router.push({ name: 'Dashboard' }); 
  } catch (error) {
    console.error('Login failed:', error);
    errorMessage.value = error.message || 'Login failed. Please check your credentials.';
  }
};
</script>

<style scoped>
/* Add basic styling for the login form if needed */
form div {
  margin-bottom: 10px;
}
label {
  margin-right: 5px;
}
</style>