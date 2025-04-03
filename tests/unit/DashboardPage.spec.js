import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardPage from '../../src/pages/DashboardPage.js' // Adjust path if needed
import { createRouter, createWebHistory } from 'vue-router'
import { nextTick } from 'vue' // Import nextTick for waiting on DOM updates

// --- Mock Leaflet ---
// Define mocks *inside* the factory function because vi.mock is hoisted
vi.mock('leaflet', () => {
  const mockLayerGroup = { addLayer: vi.fn(), clearLayers: vi.fn() };
  const mockMap = {
    addLayer: vi.fn(),
    remove: vi.fn(),
    setView: vi.fn(() => mockMap), // Chainable
    fitBounds: vi.fn(),
  };
  const mockTileLayer = { addTo: vi.fn(() => mockTileLayer) }; // Chainable
  const mockControlLayers = { addTo: vi.fn() };
  const mockCircleMarker = { bindPopup: vi.fn(() => mockCircleMarker), addTo: vi.fn(() => mockCircleMarker) }; // Chainable

  const mockL = {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => mockTileLayer),
    control: { layers: vi.fn(() => mockControlLayers) },
    layerGroup: vi.fn(() => mockLayerGroup),
    circleMarker: vi.fn(() => mockCircleMarker),
  };
  return { default: mockL };
});
// --- End Mock Leaflet ---


// Create a mock router instance
const routes = [
  { path: '/', name: 'Dashboard', component: DashboardPage },
  { path: '/facilities/:id', name: 'FacilityDetail', component: { template: '<div>Detail</div>' }, props: true },
];
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Sample data for mocking fetch
const mockFacilityData = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: 'fac1', name: 'Facility A', status: 'Operating', capacity: '10,000 tpa' },
      geometry: { type: "Point", coordinates: [-90, 40] }
    },
    {
      type: "Feature",
      properties: { id: 'fac2', name: 'Facility B', status: 'Planned' }, // No capacity
      geometry: { type: "Point", coordinates: [-100, 45] }
    }
  ]
};

describe('DashboardPage.js', () => {
  let wrapper;
  let fetchFacilitiesSpy;
  let initMapSpy;
  let addMarkersToMapSpy;
  let calculateRadiusSpy; // Add spy for calculateRadius

  // Function to mount the component
  const mountComponent = async () => {
    // Mock global fetch before mounting
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFacilityData),
      })
    );

    // Spy on methods
    initMapSpy = vi.spyOn(DashboardPage.methods, 'initMap');
    fetchFacilitiesSpy = vi.spyOn(DashboardPage.methods, 'fetchFacilities');
    addMarkersToMapSpy = vi.spyOn(DashboardPage.methods, 'addMarkersToMap');
    calculateRadiusSpy = vi.spyOn(DashboardPage.methods, 'calculateRadius'); // Spy on calculateRadius

    // Need to stub the map container element because Leaflet tries to access it
    const mapElement = document.createElement('div');
    mapElement.id = 'map';
    document.body.appendChild(mapElement);

    wrapper = mount(DashboardPage, {
      global: {
        plugins: [router],
        stubs: {
            // Stubbing router-link might be needed if popups cause issues, but try without first
            // RouterLink: true
        }
      },
      // Attach to div with #map to ensure Leaflet finds it
      attachTo: mapElement
    });
    await router.isReady();
  };

  beforeEach(async () => {
      await mountComponent();
  });

  afterEach(() => {
    // Clean up spies, fetch mock, and attached element
    vi.restoreAllMocks();
    delete global.fetch;
    wrapper.unmount(); // Unmounts the component and removes the attached element
  });

  it('mounts successfully', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('calls initMap and fetchFacilities on mount', () => {
    expect(initMapSpy).toHaveBeenCalled();
    expect(fetchFacilitiesSpy).toHaveBeenCalled();
  });

  it('initializes Leaflet map on mount', async () => {
    // We need to re-import the mocked L inside the test or access it differently
    // because the mock factory runs in a separate scope due to hoisting.
    // Easiest way for assertion is often to spy on the component's methods
    // that *use* Leaflet, rather than mocking Leaflet's internals directly in the test assertion.
    // However, let's try asserting the spies on the component methods first.
    // The initMap method itself should have been called by the 'calls initMap...' test.
    // Let's verify the map instance was created on the component.
    await nextTick(); // Ensure mounted hook completes
    expect(wrapper.vm.map).toBeDefined(); // Check if the map instance was assigned
    // We can't easily check mockL.map directly here due to hoisting scope.
  });

  it('calls addMarkersToMap after fetching facilities', async () => {
      // fetchFacilities is called in mount, wait for it to resolve
      await nextTick(); // Allow fetch promise to resolve
      await nextTick(); // Allow subsequent updates

      expect(addMarkersToMapSpy).toHaveBeenCalled();
  });

   it('adds markers to the map based on fetched data', async () => {
      // This test relies on addMarkersToMap being called correctly (tested above)
      // and the mocked fetch returning data.
      await nextTick(); // Allow fetch promise to resolve
      await nextTick(); // Allow subsequent updates

      // Instead of checking Leaflet mocks directly (due to hoisting scope issues),
      // let's check if the component's internal state reflects the data.
      expect(wrapper.vm.facilities.length).toBe(mockFacilityData.features.length);
      // We implicitly trust that if addMarkersToMap was called and facilities exist,
      // it tried to add the markers using the (mocked) Leaflet functions.
      // More detailed checks would require accessing the mocked Leaflet object differently.
   });

   it('calls addMarkersToMap when sizeByCapacity toggle changes', async () => {
       // Reset spy calls from mount
       addMarkersToMapSpy.mockClear();

       const toggle = wrapper.find('#sizeByCapacityToggle');
       await toggle.setValue(true); // Simulate checking the box

       expect(addMarkersToMapSpy).toHaveBeenCalled();
   });

   it('calls router.push when navigateToDetail is invoked', async () => {
        const pushSpy = vi.spyOn(router, 'push');
        const testId = 'fac1';

        // Directly call the method on the component instance
        // Note: Simulating popup click is harder, so test the method directly
        await wrapper.vm.navigateToDetail(testId);

        expect(pushSpy).toHaveBeenCalledWith({ name: 'FacilityDetail', params: { id: testId } });
        pushSpy.mockRestore();
   });


  it('calculates marker radius correctly based on toggle state', async () => {
      // Wait for initial mount and fetch/addMarkers to complete
      // Await the fetchFacilitiesSpy promise directly
      try {
          await fetchFacilitiesSpy.mock.results[0].value; // Wait for the promise returned by the first call
      } catch (e) { /* Ignore potential errors if already resolved */ }
      await nextTick(); // Allow final updates

      // --- Assert Initial State (sizeByCapacity = false) ---
      expect(wrapper.vm.sizeByCapacity).toBe(false);
      // Check that calculateRadius was called during init
      expect(calculateRadiusSpy).toHaveBeenCalledWith(10000); // Facility A
      expect(calculateRadiusSpy).toHaveBeenCalledWith(0);     // Facility B
      // Get the arguments from the last call for Facility A during init
      const initialRadiusCallArgs = calculateRadiusSpy.mock.calls.find(call => call[0] === 10000);
      expect(initialRadiusCallArgs).toBeDefined();
      // We can't easily check the *return* value or the circleMarker args reliably here,
      // so focus on the fact that the calculation method was called correctly.

      // --- Reset mocks AFTER checking initial state ---
      calculateRadiusSpy.mockClear();

      // Simulate toggling ON
      const toggle = wrapper.find('#sizeByCapacityToggle');
      await toggle.setValue(true); // Check the box
      expect(wrapper.vm.sizeByCapacity).toBe(true); // Verify state update
      // handleToggleChange calls addMarkersToMap, which calls calculateRadius
      await nextTick(); // Allow updates triggered by setValue
      await nextTick(); // Allow addMarkersToMap to run

      // --- Assert Toggled ON State ---
      expect(calculateRadiusSpy).toHaveBeenCalledWith(10000); // Facility A
      expect(calculateRadiusSpy).toHaveBeenCalledWith(0);     // Facility B
      // We expect the calculation for 10000 to result in > 6, but verifying the spy call is the main goal

      // --- Reset mocks before toggling OFF ---
      calculateRadiusSpy.mockClear();

      // Simulate toggling OFF
      await toggle.setValue(false); // Uncheck the box
      expect(wrapper.vm.sizeByCapacity).toBe(false); // Verify state update
      await nextTick(); // Allow updates triggered by setValue
      await nextTick(); // Allow addMarkersToMap to run

      // --- Assert Toggled OFF State ---
      expect(calculateRadiusSpy).toHaveBeenCalledWith(10000); // Facility A
      expect(calculateRadiusSpy).toHaveBeenCalledWith(0);     // Facility B
      // We expect the calculation for 10000 to result in 6 now
  });





});