/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path'; // Import the 'path' module

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // Add alias for @ pointing to src
      'vue': 'vue/dist/vue.esm-bundler.js'
    }
  },
  // Define the root directory where index.html resides (REMOVED)
  // Configure server options, including the API proxy
  server: {
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        // Target the base URL of the functions emulator, including project ID and region
        target: 'http://127.0.0.1:5001/leafy-bulwark-442103-e7/us-central1',
        changeOrigin: true, // Needed for virtual hosted sites
        // Rewrite the path: remove the '/api' prefix before forwarding
        // rewrite: (path) => path.replace(/^\/api/, ''), // Removed: Keep /api prefix for Firebase Functions
        logLevel: 'debug' // Add debug logging for the proxy
      }
    }
  },
  // Vitest configuration
  test: {
    // enable jest-like global test APIs
    globals: true,
    // simulate DOM with jsdom
    environment: 'jsdom',
    // support vue component testing
    deps: {
      inline: ['@vue/test-utils'],
    },
  },
})