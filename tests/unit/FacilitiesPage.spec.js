import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue' // Import ref and nextTick
import FacilitiesPage from '../../src/pages/FacilitiesPage.js' // Adjust path if needed
import { createRouter, createWebHistory } from 'vue-router'

// Mock Leaflet if it causes issues during testing (optional, add if needed)
// vi.mock('leaflet');

// Create a mock router instance for testing components that use router-link or $router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Add minimal routes needed by the component, e.g., for router-link targets
    { path: '/', name: 'Dashboard', component: { template: '<div></div>' } },
    { path: '/facilities/:id', name: 'FacilityDetail', component: { template: '<div></div>' } },
    { path: '/facilities/new', name: 'NewFacility', component: { template: '<div></div>' } },
  ],
})

describe('FacilitiesPage.js', () => {
  let wrapper;
  let fetchSpy; // Use a spy on global fetch

  // Function to mount with specific role
  const mountComponent = async (role = null) => {
      // Mock global fetch before mounting the component
      fetchSpy = vi.fn(() => // Assign to fetchSpy
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ type: "FeatureCollection", features: [] }), // Mock empty response
        })
      );
      global.fetch = fetchSpy;

      // Define provided values
      const mockIsAuthenticated = ref(!!role); // True if role is provided
      const mockUserRole = ref(role);

      wrapper = mount(FacilitiesPage, {
        global: {
          plugins: [router],
          provide: {
            isAuthenticated: mockIsAuthenticated,
            userRole: mockUserRole
          }
        }
      });

      // Wait for router readiness if necessary
      await router.isReady();
      // Wait for mount and initial fetch
      await nextTick();
      await nextTick();
  };


  beforeEach(async () => {
      // Reset mocks before each test using mountComponent
      vi.clearAllMocks();
      // Mount with a default role (e.g., viewer or null) for initial tests
      // Specific role tests will call mountComponent again
      // await mountComponent(null); // Don't mount by default, let each test mount
  });

  afterEach(() => {
    // Restore mocks and unmount
    vi.restoreAllMocks();
    delete global.fetch;
    if(wrapper) wrapper.unmount();
  });

  it('mounts successfully', async () => {
    await mountComponent(null); // Mount for this test
    expect(wrapper.exists()).toBe(true);
  });

  it('calls fetch on mount to get facilities', async () => {
    await mountComponent(null); // Mount for this test
    // Check if global fetch was called with the correct URL
    expect(fetchSpy).toHaveBeenCalledWith('/api/facilities');
  });

  // it('displays a loading indicator initially', () => { ... }); // Keep commented for now

  it('does NOT show admin/editor elements for null role (logged out)', async () => {
      await mountComponent(null); // Mount with null role
      expect(wrapper.find('a.btn-success[href="/facilities/new"]').exists()).toBe(false);
      // Use more robust selectors if :contains fails
      expect(wrapper.find('thead th.actions-column').exists()).toBe(false); // Example: Add a class to the th
      expect(wrapper.find('tbody td.actions-column').exists()).toBe(false); // Example: Add a class to the td
  });

  it('does NOT show admin/editor elements for "viewer" role', async () => {
      await mountComponent('viewer'); // Mount with viewer role
      expect(wrapper.find('a.btn-success[href="/facilities/new"]').exists()).toBe(false);
      expect(wrapper.find('thead th.actions-column').exists()).toBe(false);
      expect(wrapper.find('tbody td.actions-column').exists()).toBe(false);
  });

  it('SHOWS admin/editor elements for "editor" role', async () => {
      await mountComponent('editor'); // Mount with editor role
      expect(wrapper.find('a.btn-success[href="/facilities/new"]').exists()).toBe(true);
      expect(wrapper.find('thead th.actions-column').exists()).toBe(true);
      // Note: Checking for the edit button within tbody requires mock data with facilities
  });

  it('SHOWS admin/editor elements for "admin" role', async () => {
      await mountComponent('admin'); // Mount with admin role
      expect(wrapper.find('a.btn-success[href="/facilities/new"]').exists()).toBe(true);
      expect(wrapper.find('thead th.actions-column').exists()).toBe(true);
      // Note: Checking for the edit button within tbody requires mock data with facilities
  });

  // Add more tests here:
  // - Test if facilities are rendered after data loads (mocking fetch)
  // - Test filtering/search functionality
  // - Test sorting functionality
  // - Test pagination
});