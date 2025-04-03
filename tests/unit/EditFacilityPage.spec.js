import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import EditFacilityPage from '../../src/pages/EditFacilityPage.vue' // Adjust path if needed
import { authService } from '../../src/services/authService.js'

// --- Mock Dependencies ---
// Mock authService
vi.mock('../../src/services/authService.js', () => ({
  authService: {
    getToken: vi.fn(),
  }
}));

// Mock vue-router
const mockRouterPush = vi.fn();
const mockRouteParams = ref({ id: 'test-facility-id' }); // Default mock ID
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: mockRouteParams.value, // Use reactive ref for params
  }),
  useRouter: () => ({
    push: mockRouterPush,
  }),
  // Provide stub for RouterLink if needed by template, though not strictly necessary for script logic testing
  RouterLink: { template: '<a><slot /></a>' }
}));
// --- End Mock Dependencies ---


// Sample data for mocking fetch GET response
const mockFacilityGetData = {
  type: "Feature",
  properties: {
    id: 'test-facility-id',
    name: "Test Facility Initial",
    company: "Test Co",
    status: "Operating",
    capacity: 10000,
    technology: "Test Tech",
    yearStarted: 2020,
    size: "1000 sqm",
    feedstock: "Batteries",
    products: "Metals",
    technologyDetails: "Details here",
    description: "Initial Description",
    website: "http://example.com",
    companyLogo: "/img/logo.png",
    facilityImage: "/img/facility.png",
    fundingSource: "Source A",
    timeline: [{ date: "2020-01-01", event: "Started" }],
    region: "Test Region",
    country: "Test Country",
    address: "123 Test St"
  },
  geometry: {
    type: "Point",
    coordinates: [-90, 40]
  }
};

// Sample data for mocking fetch PUT response
const mockFacilityPutData = {
    id: 'test-facility-id',
    name: "Test Facility Updated",
    // ... other properties that might be returned by PUT
};


describe('EditFacilityPage.vue', () => {
  let wrapper;
  let fetchSpy;

  // Function to mount the component
  const mountComponent = async (routeId = 'test-facility-id') => {
    mockRouteParams.value.id = routeId; // Update mock route param

    // Reset mocks before each mount relevant to this component
    vi.clearAllMocks();
    authService.getToken.mockResolvedValue('fake-token'); // Mock successful token retrieval

    // Mock global fetch
    fetchSpy = vi.fn((url, options) => {
      if (url.includes(`/api/facilities/${routeId}`) && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFacilityPutData), // Return updated data subset
        });
      }
      if (url.includes(`/api/facilities/${routeId}`) && options?.method === 'DELETE') {
         return Promise.resolve({
           ok: true,
           json: () => Promise.resolve({ success: true, message: 'Deleted' }),
         });
      }
      if (url.includes(`/api/facilities/${routeId}`)) { // Default GET
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(JSON.stringify(mockFacilityGetData))), // Deep clone
        });
      }
      // Fallback for unexpected fetches
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    global.fetch = fetchSpy;

    wrapper = mount(EditFacilityPage, {
      global: {
        // No plugins needed here as router is mocked via vi.mock
      }
    });

    // Wait for mount and initial fetch
    await nextTick(); // Allow component mount
    await nextTick(); // Allow onMounted fetch promise to resolve
    await nextTick(); // Allow state updates
  };

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.fetch;
    wrapper.unmount();
  });

  it('mounts successfully', async () => {
    await mountComponent();
    expect(wrapper.exists()).toBe(true);
  });

  it('fetches facility data on mount', async () => {
    await mountComponent();
    expect(fetchSpy).toHaveBeenCalledWith(
        `/api/facilities/${mockFacilityGetData.properties.id}`,
        expect.objectContaining({ headers: { 'Authorization': 'Bearer fake-token' } })
    );
    expect(authService.getToken).toHaveBeenCalled();
  });

  it('populates form fields with fetched data', async () => {
    await mountComponent();
    // Add extra ticks to ensure DOM updates after async fetch in onMounted
    await nextTick();
    await nextTick();
    expect(wrapper.find('input#facilityName').element.value).toBe(mockFacilityGetData.properties.name);
    expect(wrapper.find('input#company').element.value).toBe(mockFacilityGetData.properties.company);
    // Check the component's data model directly for the select field
    expect(wrapper.vm.facility.status).toBe(mockFacilityGetData.properties.status);
    expect(wrapper.find('textarea#description').element.value).toBe(mockFacilityGetData.properties.description);
    // Add more checks for other fields...
  });

  it('calls fetch with PUT method on handleUpdate', async () => {
    await mountComponent();
    const newName = "Updated Facility Name";
    await wrapper.find('input#facilityName').setValue(newName);
    await wrapper.find('form').trigger('submit.prevent');

    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/facilities/${mockFacilityGetData.properties.id}`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token'
        }),
        body: expect.stringContaining(`"name":"${newName}"`) // Check if new name is in body
      })
    );
    expect(authService.getToken).toHaveBeenCalledTimes(2); // Once for GET, once for PUT
  });

   it('displays success message and hides form on successful update', async () => {
     await mountComponent();
     await wrapper.find('input#facilityName').setValue("Updated Name");
     await wrapper.find('form').trigger('submit.prevent');
     await nextTick(); // Allow success state update

     expect(wrapper.find('.alert-success').exists()).toBe(true);
     expect(wrapper.find('form').exists()).toBe(false); // Form should hide on success
     expect(wrapper.find('.alert-success').text()).toContain('updated successfully');
   });

   it('calls fetch with DELETE method on handleDelete after confirmation', async () => {
       // Mock window.confirm
       window.confirm = vi.fn(() => true); // Simulate user clicking OK

       await mountComponent();
       await wrapper.find('button.btn-danger').trigger('click');

       expect(window.confirm).toHaveBeenCalled();
       expect(fetchSpy).toHaveBeenCalledWith(
         `/api/facilities/${mockFacilityGetData.properties.id}`,
         expect.objectContaining({
           method: 'DELETE',
           headers: expect.objectContaining({ 'Authorization': 'Bearer fake-token' })
         })
       );
       expect(authService.getToken).toHaveBeenCalledTimes(2); // Once for GET, once for DELETE

       window.confirm.mockRestore(); // Clean up mock
   });

   it('redirects to /facilities after successful delete and delay', async () => {
        vi.useFakeTimers(); // Use fake timers for setTimeout
        window.confirm = vi.fn(() => true);

        await mountComponent();
        await wrapper.find('button.btn-danger').trigger('click');
        await nextTick(); // Allow success state update

        expect(wrapper.find('.alert-success').exists()).toBe(true);
        expect(wrapper.vm.isDeleted).toBe(true);

        // Fast-forward time
        await vi.advanceTimersByTimeAsync(2100); // Advance past the 2000ms timeout

        expect(mockRouterPush).toHaveBeenCalledWith('/facilities');

        vi.useRealTimers(); // Restore real timers
        window.confirm.mockRestore();
   });

});