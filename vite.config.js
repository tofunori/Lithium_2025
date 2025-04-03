import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'vue': 'vue/dist/vue.esm-bundler.js'
    }
  },
  // Define the root directory where index.html resides (REMOVED)
  // Configure server options, including the API proxy
  server: {
    proxy: {
      // Proxy API requests to the backend server
      '/api': 'http://localhost:3000' // Assuming backend runs on port 3000
    }
  }
})