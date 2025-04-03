// js/components/FolderTreeNode.js

const FolderTreeNode = {
  name: 'FolderTreeNode', // Important for recursive components
  props: {
    folder: { // The folder object for this node
      type: Object,
      required: true
    },
    currentFolderId: { // The ID of the currently selected folder (passed down)
       type: String,
       required: true
    }
  },
  emits: ['navigate'], // Declare the event emitted when a folder is clicked
  template: `
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
      <ul v-if="folder.children && folder.children.length > 0" class="list-unstyled ps-3">
        <folder-tree-node 
          v-for="childFolder in folder.children" 
          :key="childFolder.id" 
          :folder="childFolder"
          :current-folder-id="currentFolderId"
          @navigate="$emit('navigate', $event)" 
        />
        <!-- Note: We only render folders in the tree for now -->
      </ul>
    </li>
  `,
  computed: {
      isCurrentFolder() {
          return this.folder.id === this.currentFolderId;
      }
  },
  methods: {
    navigate() {
      // Emit an event upwards with the folder ID to navigate to
      this.$emit('navigate', this.folder.id);
    }
  }
};

export default FolderTreeNode;