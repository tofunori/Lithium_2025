<template>
  <li class="folder-tree-node">
    <div
      @click.stop="navigate"
      :class="{ 'fw-bold': isCurrentFolder, 'folder-item': true }"
      role="button"
      :title="folder.name"
    >
      <i class="fas fa-folder me-1" :class="isCurrentFolder ? 'text-warning' : 'text-secondary'"></i>
      {{ folder.name }}
    </div>
    <!-- Recursive rendering for children -->
    <ul v-if="folder.children &amp;&amp; folder.children.length > 0" class="list-unstyled ps-3">
      <!-- Use the component itself for recursion -->
      <FolderTreeNode
        v-for="childFolder in folder.children"
        :key="childFolder.id"
        :folder="childFolder"
        :current-folder-id="currentFolderId"
        @navigate="emitNavigate"
      />
      <!-- Note: We only render folders in the tree for now -->
    </ul>
  </li>
</template>

<script setup>
import { computed } from 'vue';

// Define props
const props = defineProps({
  folder: {
    type: Object,
    required: true
  },
  currentFolderId: {
    type: String,
    required: true
  }
});

// Define emits
const emit = defineEmits(['navigate']);

// Computed property to check if this node represents the currently selected folder
const isCurrentFolder = computed(() => {
  return props.folder.id === props.currentFolderId;
});

// Method to emit the navigate event upwards
const navigate = () => {
  emit('navigate', props.folder.id);
};

// Method to simply re-emit the event from child components
const emitNavigate = (folderId) => {
    emit('navigate', folderId);
};

// Define the component name for recursion (optional in <script setup> but good practice)
// This is implicitly handled by the filename in most build tools.
// If explicit name is needed (e.g., for devtools), it can be done differently.

</script>

<style scoped>
.folder-tree-node {
  /* Add some basic styling */
  margin-bottom: 0.25rem;
}
.folder-item {
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: 0.2rem;
  display: inline-block; /* Prevent full width highlighting */
}
.folder-item:hover {
  background-color: #e9ecef; /* Light hover effect */
}
.fw-bold {
  /* Styles for the currently selected folder */
   background-color: #cfe2ff; /* Example highlight */
}
ul {
    margin-top: 0.2rem; /* Small space before children */
}
</style>