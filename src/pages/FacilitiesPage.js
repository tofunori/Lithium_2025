// js/pages/FacilitiesPage.js
import { ref, computed, onMounted, inject } from 'vue'; // Import Composition API functions
import { getAuth, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';

const FacilitiesPage = {
  template: `
    <div>
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

        <!-- Add Facility Button (Shown if admin or editor) -->
        <div class="text-end mb-3" v-if="isAdmin"> <!-- Show only if user has admin claim -->
            <router-link :to="{ name: 'NewFacility' }" class="btn btn-success">
               <i class="fas fa-plus"></i> Add Facility
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
                      <th @click="sortBy('properties.address')" class="sortable">Location <i :class="sortIcon('properties.address')"></i></th>
                      <th @click="sortBy('properties.capacityNumeric')" class="sortable">Volume (t/yr) <i :class="sortIcon('properties.capacityNumeric')"></i></th>
                      <th>Method</th>
                      <th @click="sortBy('properties.status')" class="sortable">Status <i :class="sortIcon('properties.status')"></i></th>
                      <th v-if="isAdminOrEditor" class="actions-column">Actions</th> <!-- Add class for testing selector -->
                  </tr>
              </thead>
              <tbody>
                  <tr v-if="paginatedFacilities.length === 0">
                      <td :colspan="isAdminOrEditor ? 7 : 6" class="text-center text-muted">No facilities match your criteria.</td>
                  </tr>
                  <tr v-for="facility in paginatedFacilities" :key="facility.properties.id">
                      <td>{{ facility.properties.company || 'N/A' }}</td>
                      <td>
                          <router-link :to="{ name: 'FacilityDetail', params: { id: facility.properties.id }}">
                              {{ facility.properties.name }}
                          </router-link>
                      </td>
                      <td>{{ facility.properties.address || 'N/A' }}</td>
                      <td class="text-end">{{ formatCapacity(facility.properties.capacityNumeric) }}</td>
                      <td>{{ facility.properties.technology || 'N/A' }}</td>
                      <td><span :class="getStatusClass(facility.properties.status)">{{ facility.properties.status || 'Unknown' }}</span></td>
                      <td v-if="isAdminOrEditor"> <!-- Show Edit button only for admin/editor -->
                          <router-link :to="{ name: 'EditFacility', params: { id: facility.properties.id } }" class="btn btn-sm btn-outline-primary">
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
  setup() {
    // --- Injected State ---
    const isAuthenticated = inject('isAuthenticated'); // Keep for potential future use, though role check is primary now
    const userRole = inject('userRole');

    // --- Component State ---
    const allFacilities = ref([]); // Raw data from API
    const loading = ref(true);
    const error = ref(null);
    const searchTerm = ref('');
    const activeFilter = ref('all'); // 'all', 'Operating', 'Under Construction', 'Planned', 'Pilot', 'Closed'
    const sortByColumn = ref('properties.name');
    const sortAsc = ref(true);
    const currentPage = ref(1);
    const itemsPerPage = ref(15); // Number of items per page

    const isAdmin = ref(false); // State for admin status based on claims
    // --- Computed Properties ---
    const isAdminOrEditor = computed(() => {
        return userRole.value === 'admin' || userRole.value === 'editor';
    });

    const filteredFacilities = computed(() => {
      let filtered = allFacilities.value;
      if (activeFilter.value !== 'all') {
        filtered = filtered.filter(f => f.properties.status === activeFilter.value);
      }
      if (searchTerm.value.trim()) {
        const lowerSearch = searchTerm.value.toLowerCase();
        filtered = filtered.filter(f =>
          (f.properties.name?.toLowerCase().includes(lowerSearch)) ||
          (f.properties.company?.toLowerCase().includes(lowerSearch)) ||
          (f.properties.address?.toLowerCase().includes(lowerSearch))
        );
      }
      return filtered;
    });

    const sortedFacilities = computed(() => {
        return filteredFacilities.value.slice().sort((a, b) => {
            const getProp = (obj, path) => path.split('.').reduce((o, key) => o && o[key], obj);
            let valA = getProp(a, sortByColumn.value);
            let valB = getProp(b, sortByColumn.value);

            if (sortByColumn.value === 'properties.capacityNumeric') {
                 valA = valA || 0;
                 valB = valB || 0;
                 return sortAsc.value ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();

            if (valA < valB) return sortAsc.value ? -1 : 1;
            if (valA > valB) return sortAsc.value ? 1 : -1;
            return 0;
        });
    });

    const totalPages = computed(() => {
      return Math.ceil(sortedFacilities.value.length / itemsPerPage.value);
    });

    const paginatedFacilities = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return sortedFacilities.value.slice(start, end);
    });

    const paginationRange = computed(() => {
        const range = [];
        for (let i = 1; i <= totalPages.value; i++) {
            range.push(i);
        }
        // Add logic here for ellipsis (...) if too many pages
        return range;
    });

    // --- Methods ---
    const parseCapacity = (capacityStr) => {
        if (!capacityStr || typeof capacityStr !== 'string') return 0;
        const match = capacityStr.match(/([\d,]+)/);
        return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
    };

    const fetchFacilities = async () => {
      loading.value = true;
      error.value = null;
      console.log("FacilitiesPage: Fetching facilities...");
      try {
        const response = await fetch('/api/facilities');
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        allFacilities.value = (data.features || []).map(f => ({
            ...f,
            properties: {
                ...f.properties,
                capacityNumeric: parseCapacity(f.properties.capacity)
            }
        }));
        console.log(`FacilitiesPage: Fetched ${allFacilities.value.length} facilities.`);
      } catch (err) {
        console.error('FacilitiesPage: Error fetching facilities:', err);
        error.value = `Failed to load facilities: ${err.message}`;
        allFacilities.value = [];
      } finally {
        loading.value = false;
      }
    };

    const formatCapacity = (capacityNum) => {
         return capacityNum ? capacityNum.toLocaleString() : 'N/A';
    };

    const setFilter = (filter) => {
      activeFilter.value = filter;
      currentPage.value = 1;
    };

    const sortBy = (column) => {
        if (sortByColumn.value === column) {
            sortAsc.value = !sortAsc.value;
        } else {
            sortByColumn.value = column;
            sortAsc.value = true;
        }
         currentPage.value = 1;
    };

    const sortIcon = (column) => {
        if (sortByColumn.value !== column) return 'fas fa-sort';
        return sortAsc.value ? 'fas fa-sort-up' : 'fas fa-sort-down';
    };

    const getStatusClass = (status) => {
      switch (status) {
        case 'Operating': return 'badge bg-success';
        case 'Under Construction': return 'badge bg-warning text-dark';
        case 'Planned': return 'badge bg-info text-dark';
        case 'Pilot': return 'badge bg-primary';
        case 'Closed': return 'badge bg-secondary';
        default: return 'badge bg-light text-dark';
      }
    };

    const changePage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
      }
    };

    // --- Firebase Auth Check for Admin Role ---
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Force refresh to get latest claims, especially after login/updates
          const idTokenResult = await getIdTokenResult(user, true);
          isAdmin.value = idTokenResult.claims.admin === true;
          console.log('FacilitiesPage: User is admin:', isAdmin.value);
        } catch (error) {
          console.error('FacilitiesPage: Error getting user token result:', error);
          isAdmin.value = false; // Assume not admin if error occurs
        }
      } else {
        isAdmin.value = false; // Not logged in, not admin
        console.log('FacilitiesPage: No user logged in.');
      }
    });

    // --- Lifecycle Hooks ---
    onMounted(() => {
      fetchFacilities();
    });

    // --- Return values for template ---
    return {
      allFacilities,
      loading,
      error,
      searchTerm,
      activeFilter,
      sortByColumn,
      sortAsc,
      currentPage,
      itemsPerPage,
      isAdminOrEditor, // Expose computed property for Edit button
      isAdmin, // Expose admin status for Add button
      filteredFacilities,
      sortedFacilities,
      totalPages,
      paginatedFacilities,
      paginationRange,
      fetchFacilities,
      parseCapacity,
      formatCapacity,
      setFilter,
      sortBy,
      sortIcon,
      getStatusClass,
      changePage
    };
  }
};

// Make available for import in app.js
export default FacilitiesPage;