<template>
  <slot v-if="!error" />
  <div v-else class="error-boundary alert alert-danger">
    <h4>Something went wrong</h4>
    <p>An unexpected error occurred in this part of the application.</p>
    <details v-if="errorInfo">
      <summary>Error Details</summary>
      <pre>{{ errorInfo }}</pre>
    </details>
    <button @click="resetError" class="btn btn-sm btn-outline-secondary mt-2">Try Again</button>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue';

const error = ref(null);
const errorInfo = ref(null);

onErrorCaptured((err, instance, info) => {
  console.error("ErrorBoundary caught an error:", err, info);
  error.value = err;
  errorInfo.value = info; // Provides component trace
  // Prevent the error from propagating further up
  return false;
});

const resetError = () => {
  error.value = null;
  errorInfo.value = null;
  // A simple way to reset state, might need more sophisticated logic
  // depending on the application's state management.
  // window.location.reload();
};
</script>

<style scoped>
.error-boundary {
  border: 1px solid #dc3545;
  padding: 1rem;
  border-radius: 0.25rem;
  margin: 1rem 0;
}
.error-boundary pre {
  background-color: #f8f9fa;
  padding: 0.5rem;
  border-radius: 0.25rem;
  white-space: pre-wrap; /* Wrap long lines */
  word-break: break-all; /* Break long words/strings */
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.8em;
}
</style>