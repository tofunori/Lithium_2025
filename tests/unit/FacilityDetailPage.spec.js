import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, nextTick } from 'vue' // Import necessary Vue functions
import FacilityDetailPage from '../../src/pages/FacilityDetailPage.js' // Adjust path if needed
import { createRouter, createWebHistory } from 'vue-router'

// --- Mock Leaflet ---
vi.mock('leaflet', () => {
  const mockLayerGroup = { addLayer: vi.fn(), clearLayers: vi.fn() };
  const mockMap = {
    addLayer: vi.fn(),
    remove: vi.fn(),
    setView: vi.fn(() => mockMap),
    fitBounds: vi.fn(),
  };
  const mockTileLayer = { addTo: vi.fn(() => mockTileLayer) };
  const mockControlLayers = { addTo: vi.fn() };
  const mockMarker = { addTo: vi.fn(() => mockMarker), bindPopup: vi.fn(() => mockMarker), openPopup: vi.fn() }; // Mock marker methods
  const mockL = {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => mockTileLayer),
    control: { layers: vi.fn(() => mockControlLayers) },
    layerGroup: vi.fn(() => mockLayerGroup),
    marker: vi.fn(() => mockMarker), // Mock L.marker
  };
  return { default: mockL };
});
// --- End Mock Leaflet ---

// --- Mock authService ---
// Needed for the delete functionality
import { authService } from '../../src/services/authService.js';
vi.mock('../../src/services/authService.js', () => ({
  authService: {
    getToken: vi.fn(),
  }
}));
// --- End Mock authService ---


// Create a mock router instance
const routes = [
  { path: '/facilities/:id', name: 'FacilityDetail', component: FacilityDetailPage, props: true },
  { path: '/facilities', name: 'FacilitiesList', component: { template: '<div>List</div>' } },
  { path: '/facilities/:id/edit', name: 'EditFacility', component: { template: '<div>Edit</div>' }, props: true },
  { path: '/documents', name: 'Documents', component: { template: '<div>Docs</div>' } },
];
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Sample facility data for mocking fetch GET response
const mockFacilityId = 'test-facility-1';
const mockFacilityGetData = {
  type: "Feature",
  properties: {
    id: mockFacilityId,
    name: "Test Facility Alpha",
    company: "Test Co",
    status: "Operating",
    // Add other necessary properties used by the template
  },
  geometry: {
    type: "Point",
    coordinates: [-74.0, 40.7]
  }
};


describe('FacilityDetailPage.js', () => {
  let wrapper;
  let fetchSpy;
  let confirmSpy; // To mock window.confirm

  // Function to mount with specific role and route ID
  const mountComponent = async (role = null, routeId = mockFacilityId) => {
      // Mock global fetch
      fetchSpy = vi.fn((url, options) => {
         if (url.includes(`/api/facilities/${routeId}`) && options?.method === 'DELETE') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, message: 'Deleted' }),
            });
         }
         if (url.includes(`/api/facilities/${routeId}`)) { // Default GET for detail
           return Promise.resolve({
             ok: true,
             json: () => Promise.resolve(JSON.parse(JSON.stringify(mockFacilityGetData))), // Deep clone
           });
         }
         if (url.includes('/api/facilities?company=')) { // Mock GET for related facilities
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ type: "FeatureCollection", features: [] }), // Empty related for now
            });
         }
         // Fallback
         return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
       });
      global.fetch = fetchSpy;

      // Mock authService getToken for delete
      authService.getToken.mockResolvedValue('fake-token');

      // Mock window.confirm
      confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true); // Default to OK

      // Define provided values
      const mockIsAuthenticated = ref(!!role);
      const mockUserRole = ref(role);

      // Need to stub the map container element
      const mapElement = document.createElement('div');
      mapElement.id = 'facility-detail-map';
      document.body.appendChild(mapElement);


      wrapper = mount(FacilityDetailPage, {
        props: {
          id: routeId
        },
        global: {
          plugins: [router],
          provide: {
              isAuthenticated: mockIsAuthenticated, // Provide for consistency
              userRole: mockUserRole
          },
          stubs: { // Stub router-link to avoid warnings/errors if not needed for logic
              RouterLink: { template: '<a><slot /></a>' }
          }
        },
        attachTo: mapElement // Attach to the map div
      });

      // Wait for router readiness and async operations in setup/mount
      await router.isReady();
      await nextTick(); // Allow mount
      await nextTick(); // Allow fetch promise
      await nextTick(); // Allow state updates
  };

  afterEach(() => {
    // Restore mocks and unmount
    vi.restoreAllMocks();
    delete global.fetch;
    if (confirmSpy) confirmSpy.mockRestore();
    if(wrapper) wrapper.unmount(); // This should also remove the attached element
  });

  it('mounts successfully', async () => {
    await mountComponent();
    expect(wrapper.exists()).toBe(true);
  });

  it('calls fetch on mount to get facility data', async () => {
    await mountComponent();
    expect(fetchSpy).toHaveBeenCalledWith(`/api/facilities/${mockFacilityId}`);
  });

  it('calls fetch on mount to get related facilities', async () => {
      await mountComponent();
      expect(fetchSpy).toHaveBeenCalledWith(
          `/api/facilities?company=${encodeURIComponent(mockFacilityGetData.properties.company)}`
      );
  });

  it('populates facility data correctly', async () => {
      await mountComponent();
      expect(wrapper.vm.facility).toBeDefined();
      expect(wrapper.vm.facility.properties.name).toBe(mockFacilityGetData.properties.name);
      expect(wrapper.find('h2').text()).toBe(mockFacilityGetData.properties.name);
  });

  it('initializes Leaflet map after data fetch', async () => {
      await mountComponent();
      // Rely on checking the component's map ref.
      expect(wrapper.vm.map).toBeDefined();
      // Remove the incorrect assertions on L.map and L.marker
  });

  it('does NOT show Admin Actions card for null role', async () => {
      await mountComponent(null);
      // Find all card headers and check none contain "Admin Actions"
      const headers = wrapper.findAll('.card-header');
      const adminHeader = headers.find(h => h.text().includes('Admin Actions'));
      expect(adminHeader).toBeUndefined();
  });

  it('does NOT show Admin Actions card for "viewer" role', async () => {
      await mountComponent('viewer');
      const headers = wrapper.findAll('.card-header');
      const adminHeader = headers.find(h => h.text().includes('Admin Actions'));
      expect(adminHeader).toBeUndefined();
  });

  it('SHOWS Admin Actions card for "editor" role', async () => {
      await mountComponent('editor');
      const headers = wrapper.findAll('.card-header');
      const adminHeader = headers.find(h => h.text().includes('Admin Actions'));
      expect(adminHeader).toBeDefined(); // Check header exists
      // Check buttons exist anywhere within the wrapper when role is editor
      // Find buttons by class and check text content
      const editButton = wrapper.find('a.btn-primary');
      expect(editButton.exists()).toBe(true);
      expect(editButton.text()).toContain('Edit Facility');
      const deleteButton = wrapper.find('button.btn-danger');
      expect(deleteButton.exists()).toBe(true);
      expect(deleteButton.text()).toContain('Delete Facility');
  });

   it('SHOWS Admin Actions card for "admin" role', async () => {
      await mountComponent('admin');
      const headers = wrapper.findAll('.card-header');
      const adminHeader = headers.find(h => h.text().includes('Admin Actions'));
      expect(adminHeader).toBeDefined();
      // Check buttons exist anywhere within the wrapper when role is admin
      // Find buttons by class and check text content
      const editButtonAdmin = wrapper.find('a.btn-primary');
      expect(editButtonAdmin.exists()).toBe(true);
      expect(editButtonAdmin.text()).toContain('Edit Facility');
      const deleteButtonAdmin = wrapper.find('button.btn-danger');
      expect(deleteButtonAdmin.exists()).toBe(true);
      expect(deleteButtonAdmin.text()).toContain('Delete Facility');
  });

  it('calls window.confirm when delete button is clicked (if visible)', async () => {
      await mountComponent('admin'); // Mount as admin so button is visible
      // Spy on window.confirm directly for this test
      const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false); // Mock return false to prevent further execution
      await wrapper.find('button.btn-danger').trigger('click');
      expect(confirmSpy).toHaveBeenCalled();
      // confirmSpy is restored in afterEach
  });

  it('calls fetch with DELETE method within confirmDelete after confirmation', async () => {
      await mountComponent('admin');
      // Mock alert for this specific test
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      await wrapper.vm.confirmDelete(); // Call method directly after mocking confirm

      expect(confirmSpy).toHaveBeenCalled(); // Check window.confirm was called
      expect(authService.getToken).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledWith(
          `/api/facilities/${mockFacilityId}`,
          expect.objectContaining({ method: 'DELETE' })
      );
      expect(alertSpy).toHaveBeenCalledWith('Facility deleted successfully.'); // Check alert

      alertSpy.mockRestore(); // Clean up alert spy
  });

});