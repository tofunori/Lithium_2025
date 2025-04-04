// src/stores/authStore.js
import { defineStore } from 'pinia';
// Assuming a service exists at src/services/authService.js or similar
// import authService from '@/services/authService';
import { auth } from '../firebase-config.js'; // Use relative path for clarity
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false,
    error: null,
    isInitialized: false, // To track if initial auth state check is done
  }),
  getters: {
    isAuthenticated: (state) => state.isInitialized && !!state.user,
  },
  actions: {
    async login(email, password) {
      this.loading = true;
      this.error = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        this.user = userCredential.user;
        // Optionally fetch additional user profile data from your backend/service
        // const profile = await authService.getUserProfile(this.user.uid);
        // this.user = { ...this.user, ...profile };
      } catch (err) {
        this.error = err.message || 'Failed to login';
        console.error(err);
        this.user = null; // Ensure user is null on error
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      this.loading = true;
      this.error = null;
      try {
        await signOut(auth);
        this.user = null;
      } catch (err) {
        this.error = err.message || 'Failed to logout';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    // Action to initialize auth state listener
    initializeAuthListener() {
      if (this.isInitialized) return; // Prevent multiple listeners

      this.loading = true;
      onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          this.user = firebaseUser;
          // Optionally fetch profile data here too
          // authService.getUserProfile(firebaseUser.uid).then(profile => {
          //   this.user = { ...firebaseUser, ...profile };
          // }).catch(err => console.error("Failed to fetch profile", err));
        } else {
          this.user = null;
        }
        this.loading = false;
        this.isInitialized = true; // Mark as initialized
      }, (error) => {
        console.error('Auth state change error:', error);
        this.error = 'Failed to initialize authentication state';
        this.loading = false;
        this.isInitialized = true; // Mark as initialized even on error
      });
    }
  },
});