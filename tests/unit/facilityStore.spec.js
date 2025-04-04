import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFacilityStore } from '@/stores/facilityStore';
import { vi } from 'vitest'; // Import vi for mocking
import * as facilityService from '@/services/facilities'; // Import the service to mock

// Mock the facilityService
vi.mock('@/services/facilities', () => ({
  getFacilities: vi.fn().mockResolvedValue({ features: [] }), // Mock successful fetch with empty features
  // Add mocks for other service functions if needed by other tests
}));


describe('Facility Store', () => {
  beforeEach(() => {
    // Creates a fresh Pinia instance and makes it active
    // so it's automatically picked up by any useStore() call
    // without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia());
  });

  it('initializes with correct default state', () => {
    const store = useFacilityStore();
    expect(store.facilities).toEqual([]);
    expect(store.currentFacility).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  describe('Getters', () => {
    it('facilityCount returns the number of facilities', () => {
      const store = useFacilityStore();
      expect(store.facilityCount).toBe(0);
      store.facilities = [{ id: '1', name: 'Test 1' }, { id: '2', name: 'Test 2' }];
      expect(store.facilityCount).toBe(2);
    });

    it('getFacilityById returns the correct facility or undefined', () => {
      const store = useFacilityStore();
      const facility1 = { id: '1', name: 'Test 1' };
      const facility2 = { id: '2', name: 'Test 2' };
      store.facilities = [facility1, facility2];

      expect(store.getFacilityById('1')).toEqual(facility1);
      expect(store.getFacilityById('2')).toEqual(facility2);
      expect(store.getFacilityById('3')).toBeUndefined();
    });
  });

  describe('Actions', () => {
    it('fetchFacilities updates state correctly (simulated)', async () => {
      const store = useFacilityStore();
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();

      const promise = store.fetchFacilities(); // Don't await yet to check loading state

      expect(store.loading).toBe(true);
      expect(store.error).toBeNull(); // Error should be reset

      await promise; // Now wait for the action to complete

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull(); // Assuming success in simulation
      // Check if facilities array is updated (currently placeholder sets it to empty)
      expect(store.facilities).toEqual([]); // Adjust if placeholder data changes
    });

    it('fetchFacilityDetails updates state correctly (simulated)', async () => {
        const store = useFacilityStore();
        const facilityId = 'test-id';
        expect(store.loading).toBe(false);
        expect(store.error).toBeNull();
        expect(store.currentFacility).toBeNull();

        const promise = store.fetchFacilityDetails(facilityId); // Don't await yet

        expect(store.loading).toBe(true);
        expect(store.error).toBeNull(); // Error should be reset

        await promise; // Wait for completion

        expect(store.loading).toBe(false);
        expect(store.error).toBeNull(); // Assuming success
        // Check if currentFacility is updated based on the placeholder
        expect(store.currentFacility).toEqual({ id: facilityId, name: `Facility ${facilityId}` });
    });

    // TODO: Add tests for error handling when actual service calls are implemented
    // it('fetchFacilities sets error state on failure', async () => { ... });
    // it('fetchFacilityDetails sets error state on failure', async () => { ... });
  });
});