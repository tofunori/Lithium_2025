<template>
  <footer class="footer mt-auto py-3 bg-light">
    <div class="container text-center">
      <span class="text-muted">
        &amp;copy; {{ currentYear }} Lithium Recycling Dashboard. All rights reserved.
      </span>
      <!-- Add other footer links or info here if needed -->
    </div>
  </footer>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const currentYear = ref(new Date().getFullYear());

onMounted(() => {
  console.log("FooterComponent.vue mounted.");
});
</script>

<style scoped>
/* Add component-specific styles here if needed */
.footer {
  /* Ensure footer stays at the bottom if content is short */
  /* position: absolute; */
  /* bottom: 0; */
  /* width: 100%; */
  /* Adjust based on layout needs */
}
</style>