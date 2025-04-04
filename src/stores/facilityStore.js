// src/stores/facilityStore.js
import { defineStore } from 'pinia';
// Assuming a service exists at src/services/facilityService.js
import * as facilityService from '@/services/facilities'; // Use named imports via namespace

export const useFacilityStore = defineStore('facility', {
  state: () => ({
    facilities: [],
    currentFacility: null,
    loading: false,
    error: null,
  }),
  getters: {
    // Example getter: Get facility count
    facilityCount: (state) => state.facilities.length,
    // Example getter: Find facility by ID
    getFacilityById: (state) => (id) => {
      return state.facilities.find(facility => facility.id === id);
    }
  },
  actions: {
    async fetchFacilities() {
      this.loading = true;
      this.error = null;
      try {
        // Replace with actual service call
        const data = await facilityService.getFacilities();
        // Assuming the API returns a GeoJSON FeatureCollection
        this.facilities = data.features || []; // Extract the features array
        console.log('Fetching facilities...'); // Placeholder
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        // this.facilities = [ /* Placeholder data */ ]; // Removed placeholder
      } catch (err) {
        this.error = err.message || 'Failed to fetch facilities';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async fetchFacilityDetails(id) {
        this.loading = true;
        this.error = null;
        try {
            // Use the service's getFacilityById function
            console.log(`Fetching details for facility ${id}...`);
            const data = await facilityService.getFacilityById(id);
            
            // Store the facility in both currentFacility and facilities array
            this.currentFacility = data;
            
            // Check if this facility already exists in the facilities array
            const existingIndex = this.facilities.findIndex(f => f.id === id);
            if (existingIndex >= 0) {
                // Update existing facility
                this.facilities[existingIndex] = data;
            } else {
                // Add to facilities array
                this.facilities.push(data);
            }
        } catch (err) {
            this.error = err.message || `Failed to fetch facility ${id}`;
            console.error(err);
        } finally {
            this.loading = false;
        }
    },
    // Implement the missing actions
    async addFacility(facilityData) {
      this.loading = true;
      this.error = null;
      try {
        const newFacility = await facilityService.createFacility(facilityData);
        // Add to facilities array
        this.facilities.push(newFacility);
        return newFacility;
      } catch (err) {
        this.error = err.message || 'Failed to add facility';
        console.error(err);
        throw err; // Re-throw to allow component to handle error
      } finally {
        this.loading = false;
      }
    },
    
    async updateFacility(id, facilityData) {
      this.loading = true;
      this.error = null;
      try {
        const updatedFacility = await facilityService.updateFacility(id, facilityData);
        
        // Update in facilities array
        const index = this.facilities.findIndex(f => f.id === id);
        if (index !== -1) {
          this.facilities[index] = updatedFacility;
        }
        
        // Update currentFacility if it's the same one
        if (this.currentFacility && this.currentFacility.id === id) {
          this.currentFacility = updatedFacility;
        }
        
        return updatedFacility;
      } catch (err) {
        this.error = err.message || `Failed to update facility ${id}`;
        console.error(err);
        throw err; // Re-throw to allow component to handle error
      } finally {
        this.loading = false;
      }
    },
    
    async deleteFacility(id) {
      this.loading = true;
      this.error = null;
      try {
        await facilityService.deleteFacility(id);
        
        // Remove from facilities array
        this.facilities = this.facilities.filter(f => f.id !== id);
        
        // Clear currentFacility if it's the same one
        if (this.currentFacility && this.currentFacility.id === id) {
          this.currentFacility = null;
        }
      } catch (err) {
        this.error = err.message || `Failed to delete facility ${id}`;
        console.error(err);
        throw err; // Re-throw to allow component to handle error
      } finally {
        this.loading = false;
      }
    },
  },
});