// js/pages/FacilitiesPage.js

// Assuming Vue is available globally
// Assuming authService is available if needed

const FacilitiesPage = {
  template: `
    <div>
      <!-- Hidden Subtitle -->
      <!-- <p id="page-subtitle-main" style="display: none;">Facilities List</p> -->
      
      <div v-if="error" class="alert alert-danger">{{ error }}</div>

      <div class="facilities-list mt-4"> 
        <div class="tabs-container mb-3">
            <button class="tab-button" :class="{ active: activeFilter === 'all' }" @click="setFilter('all')">All</button>
            <button class="tab-button" :class="{ active: activeFilter === 'Operating' }" @click="setFilter('Operating')">Operating</button>
            <button class="tab-button" :class="{ active: activeFilter === 'Under Construction' }" @click="setFilter('Under Construction')">Construction</button>
            <button class="tab-button" :class="{ active: activeFilter === 'Planned' }" @click="setFilter('Planned')">Planned</button>
            <button class="tab-button" :class="{ active: activeFilter === 'Pilot' }" @click="setFilter('Pilot')">Pilot</button> 
            <button class="tab-button" :class="{ active: activeFilter === 'Closed' }" @click="setFilter('Closed')">Closed</button> 
        </div>

        <!-- Add Facility Button (Shown if authenticated) -->
        <div class="text-end mb-3">
            <router-link v-if="$root.isAuthenticated" to="/new-facility.html" class="btn btn-success">
               <i class="fas fa-plus"></i> Add New Facility
            </router-link>
        </div>

        <div class="input-group mb-3">
            <span class="input-group-text"><i class="fas fa-search"></i></span>
            <input type="text" class="form-control" v-model="searchTerm" placeholder="Search facilities by name, company, or location...">
        </div>

        <!-- Loading Indicator -->
         <div v-if="loading" class="text-center my-5">
             <div class="spinner-border text-primary" role="status">
                 <span class="visually-hidden">Loading facilities...</span>
             </div>
         </div>

        <!-- Facilities Table -->
        <div v-else class="table-responsive">
          <table class="table table-striped table-hover facility-table">
              <thead>
                  <tr>
                      <th @click="sortBy('properties.company')" class="sortable">Company <i :class="sortIcon('properties.company')"></i></th>
                      <th @click="sortBy('properties.name')" class="sortable">Name <i :class="sortIcon('properties.name')"></i></th>
                      <th @click="sortBy('properties.location')" class="sortable">Location <i :class="sortIcon('properties.location')"></i></th>
                      <th @click="sortBy('properties.capacityNumeric')" class="sortable">Volume (t/yr) <i :class="sortIcon('properties.capacityNumeric')"></i></th>
                      <th>Method</th>
                      <th @click="sortBy('properties.status')" class="sortable">Status <i :class="sortIcon('properties.status')"></i></th>
                      <th v-if="$root.isAuthenticated">Actions</th>
                  </tr>
              </thead>
              <tbody>
                  <tr v-if="paginatedFacilities.length === 0">
                      <td :colspan="$root.isAuthenticated ? 7 : 6" class="text-center text-muted">No facilities match your criteria.</td>
                  </tr>
                  <tr v-for="facility in paginatedFacilities" :key="facility.properties.id">
                      <td>{{ facility.properties.company || 'N/A' }}</td>
                      <td>
                          <router-link :to="{ name: 'FacilityDetail', params: { id: facility.properties.id }}">
                              {{ facility.properties.name }}
                          </router-link>
                      </td>
                      <td>{{ facility.properties.location || 'N/A' }}</td>
                      <td class="text-end">{{ formatCapacity(facility.properties.capacityNumeric) }}</td>
                      <td>{{ facility.properties.technology || 'N/A' }}</td>
                      <td><span :class="getStatusClass(facility.properties.status)">{{ facility.properties.status || 'Unknown' }}</span></td>
                      <td v-if="$root.isAuthenticated">
                          <router-link :to="{ name: 'EditFacility', query: { id: facility.properties.id } }" class="btn btn-sm btn-outline-primary">
                              <i class="fas fa-edit"></i> Edit
                          </router-link>
                          <!-- Add delete button later if needed -->
                      </td>
                  </tr>
              </tbody>
          </table>
        </div>

         <!-- Pagination Controls -->
         <nav aria-label="Facility pagination" v-if="totalPages > 1">
           <ul class="pagination justify-content-center">
             <li class="page-item" :class="{ disabled: currentPage === 1 }">
               <a class="page-link" href="#" @click.prevent="changePage(currentPage - 1)">Previous</a>
             </li>
             <li class="page-item" v-for="page in paginationRange" :key="page" :class="{ active: page === currentPage }">
               <a class="page-link" href="#" @click.prevent="changePage(page)">{{ page }}</a>
             </li>
             <li class="page-item" :class="{ disabled: currentPage === totalPages }">
               <a class="page-link" href="#" @click.prevent="changePage(currentPage + 1)">Next</a>
             </li>
           </ul>
         </nav>

      </div>
    </div>
  `,
  data() {
    return {
      allFacilities: [], // Raw data from API
      loading: true,
      error: null,
      searchTerm: '',
      activeFilter: 'all', // 'all', 'Operating', 'Under Construction', 'Planned', 'Pilot', 'Closed'
      sortByColumn: 'properties.name',
      sortAsc: true,
      currentPage: 1,
      itemsPerPage: 15 // Number of items per page
    };
  },
  computed: {
    // Filter facilities based on search term and active tab filter
    filteredFacilities() {
      let filtered = this.allFacilities;

      // Apply status filter
      if (this.activeFilter !== 'all') {
        filtered = filtered.filter(f => f.properties.status === this.activeFilter);
      }

      // Apply search term filter (case-insensitive search on name, company, location)
      if (this.searchTerm.trim()) {
        const lowerSearch = this.searchTerm.toLowerCase();
        filtered = filtered.filter(f => 
          (f.properties.name?.toLowerCase().includes(lowerSearch)) ||
          (f.properties.company?.toLowerCase().includes(lowerSearch)) ||
          (f.properties.location?.toLowerCase().includes(lowerSearch)) 
        );
      }
      return filtered;
    },
    // Sort the filtered facilities
    sortedFacilities() {
        // Use slice() to create a shallow copy for sorting without mutating computed property dependency
        return this.filteredFacilities.slice().sort((a, b) => {
            // Helper to get nested property value
            const getProp = (obj, path) => path.split('.').reduce((o, key) => o && o[key], obj);

            let valA = getProp(a, this.sortByColumn);
            let valB = getProp(b, this.sortByColumn);

            // Handle numeric sort for capacity
            if (this.sortByColumn === 'properties.capacityNumeric') {
                 valA = valA || 0; // Default to 0 if null/undefined
                 valB = valB || 0; // Default to 0 if null/undefined
                 return this.sortAsc ? valA - valB : valB - valA;
            }

            // Handle string sort (case-insensitive)
            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();

            if (valA < valB) return this.sortAsc ? -1 : 1;
            if (valA > valB) return this.sortAsc ? 1 : -1;
            return 0;
        });
    },
     // Calculate total pages for pagination
     totalPages() {
       return Math.ceil(this.sortedFacilities.length / this.itemsPerPage);
     },
     // Get facilities for the current page
     paginatedFacilities() {
       const start = (this.currentPage - 1) * this.itemsPerPage;
       const end = start + this.itemsPerPage;
       return this.sortedFacilities.slice(start, end);
     },
      // Generate page numbers for pagination control (simplified)
      paginationRange() {
          const range = [];
          for (let i = 1; i <= this.totalPages; i++) {
              range.push(i);
          }
          // Add logic here for ellipsis (...) if too many pages
          return range;
      }
  },
  methods: {
    async fetchFacilities() {
      this.loading = true;
      this.error = null;
      console.log("FacilitiesPage: Fetching facilities...");
      try {
        const response = await fetch('/api/facilities');
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        
        // Pre-process capacity for sorting
        this.allFacilities = (data.features || []).map(f => ({
            ...f,
            properties: {
                ...f.properties,
                capacityNumeric: this.parseCapacity(f.properties.capacity)
            }
        }));
        console.log(`FacilitiesPage: Fetched ${this.allFacilities.length} facilities.`);
      } catch (err) {
        console.error('FacilitiesPage: Error fetching facilities:', err);
        this.error = `Failed to load facilities: ${err.message}`;
        this.allFacilities = [];
      } finally {
        this.loading = false;
      }
    },
    // Helper to parse capacity string
    parseCapacity(capacityStr) {
        if (!capacityStr || typeof capacityStr !== 'string') return 0;
        const match = capacityStr.match(/([\d,]+)/);
        return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
    },
     // Format capacity number for display
     formatCapacity(capacityNum) {
         return capacityNum ? capacityNum.toLocaleString() : 'N/A';
     },
    // Set the active filter and reset pagination
    setFilter(filter) {
      this.activeFilter = filter;
      this.currentPage = 1; // Reset to first page when filter changes
    },
    // Handle sorting
    sortBy(column) {
        if (this.sortByColumn === column) {
            this.sortAsc = !this.sortAsc; // Reverse direction
        } else {
            this.sortByColumn = column;
            this.sortAsc = true; // Default to ascending
        }
         this.currentPage = 1; // Reset to first page when sort changes
    },
    // Get CSS class for sort icons
    sortIcon(column) {
        if (this.sortByColumn !== column) return 'fas fa-sort';
        return this.sortAsc ? 'fas fa-sort-up' : 'fas fa-sort-down';
    },
    // Get CSS class for status badges
    getStatusClass(status) {
      switch (status) {
        case 'Operating': return 'badge bg-success';
        case 'Under Construction': return 'badge bg-warning text-dark'; // Added text-dark for better contrast
        case 'Planned': return 'badge bg-info text-dark'; // Added text-dark
        case 'Pilot': return 'badge bg-primary'; // Changed from purple
        case 'Closed': return 'badge bg-secondary';
        default: return 'badge bg-light text-dark';
      }
    },
     // Change page for pagination
     changePage(page) {
       if (page >= 1 && page <= this.totalPages) {
         this.currentPage = page;
       }
     }
  },
  mounted() {
    // Fetch data when component is mounted
    this.fetchFacilities();
  }
};

// Make available for import in app.js
export default FacilitiesPage;