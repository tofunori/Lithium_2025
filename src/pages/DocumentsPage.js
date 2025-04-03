// js/pages/DocumentsPage.js

// Import authService to get tokens for API calls
import { authService } from '../services/authService.js'; // Corrected path

// Assuming Vue is available globally
// Assuming Vue is available globally
import FolderTreeNode from '../components/FolderTreeNode.js'; // Import the tree node component

const DocumentsPage = {
  template: `
    <div class="container-fluid mt-4"> <!-- Use container-fluid for potentially wider layout -->
       <!-- Page Title -->
       <h2>Manage Documents</h2>
       <hr>

       <div v-if="error" class="alert alert-danger">{{ error }}</div>
       <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>

       <!-- Main Document Management Layout -->
       <div class="row">
           <!-- Folder Tree Column -->
           <div class="col-md-3 border-end" style="max-height: 75vh; overflow-y: auto;">
               <h5>Folder Structure</h5>
               <hr>
               <div id="folderTreeView">
                   <div v-if="loadingFolders" class="text-center text-muted">
                       <div class="spinner-border spinner-border-sm" role="status"></div> Loading...
                   </div>
                   <!-- Render the tree starting from the root -->
                   <ul v-else-if="folderHierarchy.root" class="list-unstyled folder-tree-root">
                       <folder-tree-node
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
                           <!-- Filter (Simplified for now) -->
                           <select class="form-select form-select-sm w-auto" v-model="filterType">
                               <option value="all">All Types</option>
                               <option value="folder">Folder</option>
                               <option value="file">File</option>
                               <option value="link">Link</option>
                           </select>
                           <!-- Action Buttons (Check permissions later) -->
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
                                          <!-- Action buttons (Download, Edit, Delete) - Add later -->
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

       <!-- Modals Placeholder (Add actual Bootstrap modals later) -->
       <div v-if="showUploadModal">Upload Modal Placeholder</div>
       <div v-if="showNewFolderModal">New Folder Modal Placeholder</div>
       <div v-if="showAddLinkModal">Add Link Modal Placeholder</div>
       <div v-if="editingItem">Edit Modal Placeholder for {{ editingItem.name }}</div>

    </div>
  `,
  data() {
    return {
      currentFolderId: 'root', // Start at root
      currentFolderName: 'Home',
      items: [], // Files/folders in the current view
      folderHierarchy: {}, // Store basic folder info for tree/breadcrumbs
      breadcrumbs: [],
      loadingItems: true,
      loadingFolders: true,
      error: null,
      successMessage: null,
      filterType: 'all',
      // Modal visibility flags
      showUploadModal: false,
      showNewFolderModal: false,
      showAddLinkModal: false,
      editingItem: null, // Store item being edited
   };
 },
  components: { // Register the local component
    FolderTreeNode
  }, // Add comma after components definition
  computed: {
      // Filter items based on selected type
      filteredItems() {
          if (this.filterType === 'all') {
              return this.items;
          }
          return this.items.filter(item => item.type === this.filterType);
      },
      // No longer need topLevelFolders computed property
  },
  methods: {
    // Fetch items for the current folder
    async fetchItems(folderId) {
      this.loadingItems = true;
      this.error = null;
      console.log(`DocumentsPage: Fetching items for folderId: ${folderId}`);
      try {
         const token = await authService.getToken();
         if (!token) throw new Error("Authentication required.");

         // Use parentId query parameter
         const response = await fetch(`/api/doc_items?parentId=${encodeURIComponent(folderId)}`, {
             headers: { 'Authorization': `Bearer ${token}` }
         });
         if (!response.ok) throw new Error(`HTTP error ${response.status}`);
         this.items = await response.json();
         console.log(`DocumentsPage: Fetched ${this.items.length} items.`);
         // Update breadcrumbs after fetching
         this.updateBreadcrumbs(folderId); 
      } catch (err) {
         console.error(`DocumentsPage: Error fetching items for folder ${folderId}:`, err);
         this.error = `Failed to load folder contents: ${err.message}`;
         this.items = [];
      } finally {
         this.loadingItems = false;
      }
    },
    // Fetch full folder hierarchy recursively
    async fetchFolderHierarchy() {
        this.loadingFolders = true;
        this.error = null; // Clear previous errors
        console.log("DocumentsPage: Fetching full folder hierarchy...");
        const hierarchy = { root: { id: 'root', name: 'Home / Facility Root', parentId: null, children: [] } }; // Initialize with root
        const foldersToFetchChildrenFor = ['root']; // Start with root
        const fetchedFolderIds = new Set(['root']); // Keep track of fetched folders

        try {
            const token = await authService.getToken();
            if (!token) throw new Error("Authentication required.");

            let currentLevel = ['root'];
            let safety = 0;

            while (currentLevel.length > 0 && safety < 10) { // Safety break for deep recursion
                safety++;
                const promises = currentLevel.map(async (parentId) => {
                    const response = await fetch(`/api/doc_items?parentId=${encodeURIComponent(parentId)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) {
                        console.error(`Failed to fetch children for ${parentId}: ${response.status}`);
                        return []; // Return empty array on error for this parent
                    }
                    return await response.json();
                });

                const results = await Promise.all(promises);
                const nextLevel = [];

                results.forEach((items, index) => {
                    const parentId = currentLevel[index];
                    items.forEach(item => {
                        if (item.type === 'folder' && !fetchedFolderIds.has(item.id)) {
                            const folderData = {
                                id: item.id,
                                name: item.name,
                                parentId: item.parentId,
                                children: [] // Initialize children array
                            };
                            hierarchy[item.id] = folderData; // Add to flat lookup map
                            
                            // Add to parent's children array in the hierarchy object
                            if (hierarchy[parentId]) {
                                hierarchy[parentId].children.push(folderData);
                            }
                            
                            fetchedFolderIds.add(item.id);
                            nextLevel.push(item.id); // Queue this folder for fetching its children
                        } else if (item.type === 'folder' && hierarchy[parentId]) {
                             // If folder already fetched (e.g., via breadcrumb), ensure it's linked in children
                             const existingFolderData = hierarchy[item.id];
                             if (existingFolderData && !hierarchy[parentId].children.some(child => child.id === item.id)) {
                                 hierarchy[parentId].children.push(existingFolderData);
                             }
                        }
                    });
                });
                currentLevel = nextLevel;
            } // End while loop

            if (safety >= 10) {
                 console.warn("Reached recursion depth limit while fetching folders.");
            }

            this.folderHierarchy = hierarchy; // Store the potentially nested hierarchy
            console.log("DocumentsPage: Full folder hierarchy fetched:", this.folderHierarchy);
            // Update breadcrumbs based on potentially richer hierarchy info
            this.updateBreadcrumbs(this.currentFolderId);

        } catch (err) {
            console.error("DocumentsPage: Error fetching full folder hierarchy:", err);
            this.error = `Failed to load folder structure: ${err.message}`;
        } finally {
            this.loadingFolders = false;
        }
    },
    // Navigate to a folder
    navigateToFolder(folderId) {
      console.log(`Navigating to folder: ${folderId}`);
      this.currentFolderId = folderId;
      this.fetchItems(folderId);
      // Breadcrumb update happens in fetchItems callback
    },
     // Update breadcrumb trail (with dynamic fetching for missing parents)
     async updateBreadcrumbs(folderId) {
         console.log(`Updating breadcrumbs for folderId: ${folderId}`);
         const crumbs = [];
         let currentId = folderId;
         let safety = 0;
         let fetchError = null;

         while (currentId && currentId !== 'root' && safety < 20) {
             safety++;
             let folderInfo = this.folderHierarchy[currentId];

             // If folder info not in our cache, fetch it dynamically
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
                         // Cache it for future use
                         this.folderHierarchy[currentId] = folderInfo;
                     } else {
                         throw new Error(`Item ${currentId} not found or is not a folder.`);
                     }
                 } catch (err) {
                     console.error(`Failed to fetch parent folder info (${currentId}) for breadcrumbs:`, err);
                     fetchError = `Failed to load full path (${err.message})`;
                     // Add placeholder and break loop on error
                     crumbs.unshift({ id: currentId, name: `... Error ...` });
                     break;
                 }
             }

             // Add crumb if info is available
             if (folderInfo) {
                 crumbs.unshift({ id: folderInfo.id, name: folderInfo.name });
                 currentId = folderInfo.parentId;
             } else {
                 // Should not happen if fetch logic works, but break as fallback
                 console.warn(`Breadcrumb generation stopped unexpectedly for ${currentId}.`);
                 crumbs.unshift({ id: currentId, name: `... (${currentId.substring(0,6)})` });
                 break;
             }
         }
         
         this.breadcrumbs = crumbs;
         this.currentFolderName = folderId === 'root' ? 'Home' : (crumbs.length > 0 ? crumbs[crumbs.length - 1].name : '...');
         
         // Display fetch error if occurred
         if (fetchError && !this.error) { // Avoid overwriting other errors
             this.error = fetchError;
         }
         console.log("Breadcrumbs updated:", this.breadcrumbs);
     },
    // Get icon class based on item type
    getItemIcon(type) {
      switch (type) {
        case 'folder': return 'fas fa-folder text-warning';
        case 'file': return 'fas fa-file-alt text-secondary';
        case 'link': return 'fas fa-link text-info';
        default: return 'fas fa-question-circle text-muted';
      }
    },
    // Format timestamp for display
    formatTimestamp(timestamp) {
       if (!timestamp) return 'N/A';
       try {
           // Firestore timestamps might be objects with seconds/nanoseconds
           const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
           return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
       } catch (e) {
           return 'Invalid Date';
       }
    },
     // Handle double-clicking an item (navigate into folder)
     handleItemDoubleClick(item) {
         if (item.type === 'folder') {
             this.navigateToFolder(item.id);
         }
         // Could open files/links here too if desired
     },
      // --- Action Methods (Placeholders - Implement fully later) ---
      async downloadFile(item) {
          if (item.type !== 'file' || !item.id) return;
          console.log(`Attempting to download file: ${item.name} (ID: ${item.id})`);
          this.error = null;
          this.successMessage = null;
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
                  // Open in new tab - browser handles download based on content type
                  window.open(data.url, '_blank');
                  this.successMessage = `Download started for ${item.name}.`;
              } else {
                  throw new Error("No download URL received from server.");
              }
          } catch (err) {
              console.error("Error getting download URL:", err);
              this.error = `Failed to download file: ${err.message}`;
          }
      },
      showEditModal(item) {
          console.log("Editing item:", item);
          this.editingItem = { ...item }; // Clone item to avoid modifying original directly
          // Logic to show Bootstrap modal would go here
      },
      async confirmDeleteItem(item) {
          if (!confirm(`Are you sure you want to delete "${item.name}"? ${item.type === 'folder' ? 'This will delete all its contents.' : ''}`)) {
              return;
          }
          console.log(`Deleting item: ${item.name} (ID: ${item.id})`);
          this.error = null;
          this.successMessage = null;
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
              this.successMessage = `"${item.name}" deleted successfully.`;
              // Refresh the current folder view
              this.fetchItems(this.currentFolderId); 
          } catch (err) {
              console.error("Error deleting item:", err);
              this.error = `Failed to delete item: ${err.message}`;
          }
      }
  },
  async mounted() {
    // Check authentication before fetching data
    if (await authService.getCurrentUser()) {
      console.log("DocumentsPage: User is authenticated, fetching data...");
      this.fetchFolderHierarchy(); // Fetch folder structure first
      this.fetchItems(this.currentFolderId); // Then fetch root items
      // Initialize breadcrumbs for root - only if authenticated and data is fetched
      this.updateBreadcrumbs(this.currentFolderId);
    } else {
      console.log("DocumentsPage: User not authenticated, skipping data fetch.");
      // No data fetching needed, router guard should handle redirect.
      // Clear any potential loading states if they were set before the check
      this.loadingItems = false;
      this.loadingFolders = false;
    }
  }
};

// Make available for import in app.js
export default DocumentsPage;