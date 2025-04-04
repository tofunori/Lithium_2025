<template>
  <span :class="['status-badge', statusClass]">{{ status || 'N/A' }}</span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    default: ''
  }
});

const statusClass = computed(() => {
  if (!props.status) return '';
  switch (props.status.toLowerCase()) {
    case 'operating':
      return 'status-operating';
    case 'under construction':
      return 'status-construction';
    case 'planned':
      return 'status-planned';
    case 'pilot':
      return 'status-pilot';
    default:
      return '';
  }
});
</script>

<style scoped>
/* Scoped styles specific to the badge, mirroring original CSS if needed */
.status-badge {
  padding: 0.25em 0.6em;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  color: #fff;
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: 0.375rem; /* Use Bootstrap's default or adjust as needed */
  display: inline-block; /* Ensure proper display */
}

/* Define status colors - these should match your global CSS or be defined here */
.status-operating {
  background-color: #28a745; /* Green */
}
.status-construction {
  background-color: #ffc107; /* Yellow */
  color: #212529; /* Darker text for yellow */
}
.status-planned {
  background-color: #17a2b8; /* Teal */
}
.status-pilot {
  background-color: #6c757d; /* Gray */
}
</style>