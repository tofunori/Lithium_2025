<template>
  <div class="container-fluid mt-4">
    <!-- Page Title -->
    <h2>Manage Documents</h2>
    <hr>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>

    <!-- Main Document Management Layout -->
    <div class="row">
      <!-- Folder Tree Column -->
      <div class="col-md-3 border-end doc-sidebar">
        <h5>Folder Structure</h5>
        <hr>
        <div id="folderTreeView">
          <div v-if="loadingFolders" class="text-center text-muted">
            <div class="spinner-border spinner-border-sm" role="status"></div> Loading...
          </div>
          <!-- Render the tree starting from the root -->
          <ul v-else-if="folderHierarchy.root" class="list-unstyled folder-tree-root">
            <FolderTreeNode
              :folder="folderHierarchy.root"
              :current-folder-id="currentFolderId"
              @navigate="navigateToFolder"
            />
          </ul>
          <div v-else class="text-muted">Could not load folder structure.</div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="col-md-9">
        <!-- Breadcrumbs -->
        <nav aria-label="breadcrumb" class="mb-2">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <a href="#" @click.prevent="navigateToFolder('root')"><i class="fas fa-home"></i></a>
            </li>
            <li v-for="(crumb, index) in breadcrumbs" :key="crumb.id"
                class="breadcrumb-item" :class="{ active: index === breadcrumbs.length - 1 }">
              <a v-if="index < breadcrumbs.length - 1" href="#" @click.prevent="navigateToFolder(crumb.id)">
                {{ crumb.name }}
              </a>
              <span v-else>{{ crumb.name }}</span>
            </li>
          </ol>
        </nav>

        <!-- Action Buttons & Filters -->
        <div class="card mb-3">
          <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span>Contents of: <strong>{{ currentFolderName }}</strong></span>
            <div class="d-flex align-items-center flex-wrap gap-2">
              <!-- Filter -->
              <select class="form-select form-select-sm w-auto" v-model="filterType">
                <option value="all">All Types</option>
                <option value="folder">Folder</option>
                <option value="file">File</option>
                <option value="link">Link</option>
              </select>
              <!-- Action Buttons -->
              <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-outline-primary" @click="showNewFolderModal = true" title="New Folder"><i class="fas fa-folder-plus"></i></button>
                <button type="button" class="btn btn-outline-secondary" @click="showUploadModal = true" title="Upload File"><i class="fas fa-upload"></i></button>
                <button type="button" class="btn btn-outline-info" @click="showAddLinkModal = true" title="Add Link"><i class="fas fa-link"></i></button>
              </div>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Modified</th>
                    <th>Tags</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingItems">
                    <td colspan="5" class="text-center">
                      <div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>
                    </td>
                  </tr>
                  <tr v-else-if="filteredItems.length === 0">
                    <td colspan="5" class="text-center text-muted">This folder is empty or no items match the filter.</td>
                  </tr>
                  <tr v-for="item in filteredItems" :key="item.id" @dblclick="handleItemDoubleClick(item)">
                    <td><i :class="getItemIcon(item.type)"></i></td>
                    <td>
                      <a v-if="item.type === 'folder'" href="#" @click.prevent="navigateToFolder(item.id)">
                        {{ item.name }}
                      </a>
                      <a v-else-if="item.type === 'link'" :href="item.url" target="_blank" :title="item.url">
                        {{ item.name }} <i class="fas fa-external-link-alt fa-xs"></i>
                      </a>
                      <span v-else>{{ item.name }}</span>
                    </td>
                    <td>{{ formatTimestamp(item.updatedAt) }}</td>
                    <td>
                      <span v-for="tag in item.tags" :key="tag" class="badge bg-light text-dark me-1">{{ tag }}</span>
                    </td>
                    <td>
                      <button v-if="item.type === 'file'" @click="downloadFile(item)" class="btn btn-sm btn-outline-success me-1" title="Download"><i class="fas fa-download"></i></button>
                      <button @click="showEditModal(item)" class="btn btn-sm btn-outline-secondary me-1" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                      <button @click="confirmDeleteItem(item)" class="btn btn-sm btn-outline-danger" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div> <!-- End Main Content Area -->
    </div> <!-- End Row -->

    <!-- Modals Placeholder -->
    <div v-if="showUploadModal">Upload Modal Placeholder</div>
    <div v-if="showNewFolderModal">New Folder Modal Placeholder</div>
    <div v-if="showAddLinkModal">Add Link Modal Placeholder</div>
    <div v-if="editingItem">Edit Modal Placeholder for {{ editingItem.name }}</div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { authService } from '../services/authService.js'; // Corrected path
import FolderTreeNode from '../components/FolderTreeNode.vue'; // Use the .vue component

// --- State ---
const currentFolderId = ref('root'); // Start at root
const currentFolderName = ref('Home');
const items = ref([]); // Files/folders in the current view
const folderHierarchy = ref({}); // Store basic folder info for tree/breadcrumbs
const breadcrumbs = ref([]);
const loadingItems = ref(true);
const loadingFolders = ref(true);
const error = ref(null);
const successMessage = ref(null);
const filterType = ref('all');
// Modal visibility flags
const showUploadModal = ref(false);
const showNewFolderModal = ref(false);
const showAddLinkModal = ref(false);
const editingItem = ref(null); // Store item being edited

// --- Computed ---
const filteredItems = computed(() => {
  if (filterType.value === 'all') {
    return items.value;
  }
  return items.value.filter(item => item.type === filterType.value);
});

// --- Methods ---
const fetchItems = async (folderId) => {
  loadingItems.value = true;
  error.value = null;
  console.log(`DocumentsView: Fetching items for folderId: ${folderId}`);
  try {
    const token = await authService.getToken();
    if (!token) throw new Error("Authentication required.");

    const response = await fetch(`/api/doc_items?parentId=${encodeURIComponent(folderId)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    items.value = await response.json();
    console.log(`DocumentsView: Fetched ${items.value.length} items.`);
    updateBreadcrumbs(folderId); // Update breadcrumbs after fetching
  } catch (err) {
    console.error(`DocumentsView: Error fetching items for folder ${folderId}:`, err);
    error.value = `Failed to load folder contents: ${err.message}`;
    items.value = [];
  } finally {
    loadingItems.value = false;
  }
};

const fetchFolderHierarchy = async () => {
  loadingFolders.value = true;
  error.value = null;
  console.log("DocumentsView: Fetching full folder hierarchy...");
  const hierarchy = { root: { id: 'root', name: 'Home / Facility Root', parentId: null, children: [] } };
  const fetchedFolderIds = new Set(['root']);

  try {
    const token = await authService.getToken();
    if (!token) throw new Error("Authentication required.");

    let currentLevel = ['root'];
    let safety = 0;

    while (currentLevel.length > 0 && safety < 10) {
      safety++;
      const promises = currentLevel.map(async (parentId) => {
        const response = await fetch(`/api/doc_items?parentId=${encodeURIComponent(parentId)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          console.error(`Failed to fetch children for ${parentId}: ${response.status}`);
          return [];
        }
        return await response.json();
      });

      const results = await Promise.all(promises);
      const nextLevel = [];

      results.forEach((levelItems, index) => {
        const parentId = currentLevel[index];
        levelItems.forEach(item => {
          if (item.type === 'folder' && !fetchedFolderIds.has(item.id)) {
            const folderData = {
              id: item.id,
              name: item.name,
              parentId: item.parentId,
              children: []
            };
            hierarchy[item.id] = folderData; // Add to flat lookup

            if (hierarchy[parentId]) {
              hierarchy[parentId].children.push(folderData); // Add to parent's children
            }

            fetchedFolderIds.add(item.id);
            nextLevel.push(item.id);
          } else if (item.type === 'folder' && hierarchy[parentId]) {
             // Link already fetched folder if not present in children
             const existingFolderData = hierarchy[item.id];
             if (existingFolderData && !hierarchy[parentId].children.some(child => child.id === item.id)) {
                 hierarchy[parentId].children.push(existingFolderData);
             }
          }
        });
      });
      currentLevel = nextLevel;
    }

    if (safety >= 10) console.warn("Reached recursion depth limit while fetching folders.");

    folderHierarchy.value = hierarchy;
    console.log("DocumentsView: Full folder hierarchy fetched:", folderHierarchy.value);
    updateBreadcrumbs(currentFolderId.value); // Update based on potentially new hierarchy info

  } catch (err) {
    console.error("DocumentsView: Error fetching full folder hierarchy:", err);
    error.value = `Failed to load folder structure: ${err.message}`;
  } finally {
    loadingFolders.value = false;
  }
};

const navigateToFolder = (folderId) => {
  console.log(`Navigating to folder: ${folderId}`);
  currentFolderId.value = folderId;
  // Fetching items and updating breadcrumbs is handled by the watcher now
};

const updateBreadcrumbs = async (folderId) => {
  console.log(`Updating breadcrumbs for folderId: ${folderId}`);
  const crumbs = [];
  let currentId = folderId;
  let safety = 0;
  let fetchError = null;

  while (currentId && currentId !== 'root' && safety < 20) {
    safety++;
    let folderInfo = folderHierarchy.value[currentId];

    if (!folderInfo && currentId !== 'root') {
      console.log(`Fetching missing parent info for breadcrumb: ${currentId}`);
      try {
        const token = await authService.getToken();
        const response = await fetch(`/api/doc_items/${currentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const fetchedData = await response.json();
        if (fetchedData && fetchedData.type === 'folder') {
          folderInfo = { id: fetchedData.id, name: fetchedData.name, parentId: fetchedData.parentId };
          // Cache it - Note: This might not update the main hierarchy object correctly if not careful
          if (!folderHierarchy.value[currentId]) folderHierarchy.value[currentId] = folderInfo;
        } else {
          throw new Error(`Item ${currentId} not found or is not a folder.`);
        }
      } catch (err) {
        console.error(`Failed to fetch parent folder info (${currentId}) for breadcrumbs:`, err);
        fetchError = `Failed to load full path (${err.message})`;
        crumbs.unshift({ id: currentId, name: `... Error ...` });
        break;
      }
    }

    if (folderInfo) {
      crumbs.unshift({ id: folderInfo.id, name: folderInfo.name });
      currentId = folderInfo.parentId;
    } else {
      console.warn(`Breadcrumb generation stopped unexpectedly for ${currentId}.`);
      crumbs.unshift({ id: currentId, name: `... (${currentId?.substring(0,6)})` });
      break;
    }
  }

  breadcrumbs.value = crumbs;
  currentFolderName.value = folderId === 'root' ? 'Home' : (crumbs.length > 0 ? crumbs[crumbs.length - 1].name : '...');

  if (fetchError && !error.value) {
    error.value = fetchError;
  }
  console.log("Breadcrumbs updated:", breadcrumbs.value);
};


const getItemIcon = (type) => {
  switch (type) {
    case 'folder': return 'fas fa-folder text-warning';
    case 'file': return 'fas fa-file-alt text-secondary';
    case 'link': return 'fas fa-link text-info';
    default: return 'fas fa-question-circle text-muted';
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch (e) {
    return 'Invalid Date';
  }
};

const handleItemDoubleClick = (item) => {
  if (item.type === 'folder') {
    navigateToFolder(item.id);
  }
};

const downloadFile = async (item) => {
  if (item.type !== 'file' || !item.id) return;
  console.log(`Attempting to download file: ${item.name} (ID: ${item.id})`);
  error.value = null;
  successMessage.value = null;
  try {
    const token = await authService.getToken();
    const response = await fetch(`/api/doc_items/${item.id}/download-url`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP error ${response.status}`);
    }
    const data = await response.json();
    if (data.url) {
      window.open(data.url, '_blank');
      successMessage.value = `Download started for ${item.name}.`;
    } else {
      throw new Error("No download URL received from server.");
    }
  } catch (err) {
    console.error("Error getting download URL:", err);
    error.value = `Failed to download file: ${err.message}`;
  }
};

const showEditModal = (item) => {
  console.log("Editing item:", item);
  editingItem.value = { ...item }; // Clone item
  // Logic to show Bootstrap modal would go here
};

const confirmDeleteItem = async (item) => {
  if (!confirm(`Are you sure you want to delete "${item.name}"? ${item.type === 'folder' ? 'This will delete all its contents.' : ''}`)) {
    return;
  }
  console.log(`Deleting item: ${item.name} (ID: ${item.id})`);
  error.value = null;
  successMessage.value = null;
  try {
    const token = await authService.getToken();
    const response = await fetch(`/api/doc_items/${item.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP error ${response.status}`);
    }
    successMessage.value = `"${item.name}" deleted successfully.`;
    // Refresh the current folder view AND hierarchy
    await fetchItems(currentFolderId.value);
    await fetchFolderHierarchy(); // Re-fetch hierarchy in case a folder was deleted
  } catch (err) {
    console.error("Error deleting item:", err);
    error.value = `Failed to delete item: ${err.message}`;
  }
};

// --- Watchers ---
watch(currentFolderId, (newFolderId) => {
    if (newFolderId) {
        fetchItems(newFolderId);
        // Breadcrumbs are updated within fetchItems -> updateBreadcrumbs
    }
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  // Check authentication before fetching data
  if (await authService.getCurrentUser()) {
    console.log("DocumentsView: User is authenticated, fetching initial data...");
    await fetchFolderHierarchy(); // Fetch folder structure first
    await fetchItems(currentFolderId.value); // Then fetch root items
    // Initial breadcrumbs are set within fetchItems -> updateBreadcrumbs
  } else {
    console.log("DocumentsView: User not authenticated, skipping data fetch.");
    loadingItems.value = false;
    loadingFolders.value = false;
    // Potentially redirect or show login message - handled by router guard ideally
  }
});

</script>

<style scoped>
.doc-sidebar {
  max-height: 80vh; /* Adjust as needed */
  overflow-y: auto;
}

.folder-tree-root {
  padding-left: 0;
}

/* Add styles for FolderTreeNode if needed, or they should be in its own component */

.table th, .table td {
  vertical-align: middle;
}

.table td i.fa-folder { color: #ffc107; }
.table td i.fa-file-alt { color: #6c757d; }
.table td i.fa-link { color: #0dcaf0; }
.table td i.fa-question-circle { color: #adb5bd; }

.breadcrumb {
    background-color: transparent; /* Remove default background */
    padding: 0.5rem 0;
}
.breadcrumb-item a {
    text-decoration: none;
}
.breadcrumb-item.active {
    color: #6c757d;
}
</style>