// js/components/HeaderComponent.js

// Assuming Vue is available globally via CDN
// Assuming authService is available globally or imported if using modules properly later

const HeaderComponent = {
  // Using template string for HTML structure based on includes/_header.html
  template: `
    <nav class="navbar navbar-expand-lg navbar-light bg-light fixed-top shadow-sm">
      <div class="container-fluid">
        <!-- Use router-link for SPA navigation -->
        <router-link class="navbar-brand" to="/">Lithium Recycling Dashboard</router-link>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavHeader" aria-controls="navbarNavHeader" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNavHeader">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <!-- Use router-link and let Vue Router handle active class -->
              <router-link class="nav-link" to="/">Map</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/facilities">Facilities</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/charts">Charts</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/documents">Documents</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/about">About</router-link>
            </li>
          </ul>
          <div class="d-flex align-items-center">
            <!-- Theme Toggle Switch -->
            <div class="form-check form-switch me-3">
              <!-- Bind checked state to root theme data, trigger root method on change -->
              <input class="form-check-input" type="checkbox" role="switch" id="themeSwitchHeader" 
                     :checked="$root.theme === 'dark-theme'" 
                     @change="toggleTheme">
              <label class="form-check-label" for="themeSwitchHeader">
                <!-- Dynamically change icon based on theme -->
                <i :class="themeIconClass"></i>
              </label>
            </div>
            <!-- Auth Status -->
            <div id="authStatusHeader" class="d-flex align-items-center">
              <!-- Use v-if/v-else based on root isAuthenticated state -->
              <div v-if="$root.isAuthenticated">
                <!-- Display email from Firebase user object or default -->
                <span>Welcome, {{ userDisplayName }}!</span>
                <!-- Trigger root logout method on click -->
                <button @click="logout" class="btn btn-sm btn-outline-danger ms-2">Logout</button>
              </div>
              <div v-else>
                <!-- Link to login page -->
                <router-link to="/login" class="btn btn-sm btn-outline-success">Admin Login</router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `,
  computed: {
    // Compute the display name based on auth state and method
    userDisplayName() {
      if (!this.$root.isAuthenticated) return '';
      // If using Firebase Auth and user object exists
      if (this.$root.currentUser && this.$root.currentUser.email) {
        return this.$root.currentUser.email;
      }
      // If using JWT (currentUser might just have token) or Firebase user has no email
      return 'Admin'; // Fallback display name
    },
    // Compute the class for the theme icon
    themeIconClass() {
      return this.$root.theme === 'dark-theme' ? 'fas fa-sun' : 'fas fa-moon';
    }
  },
  methods: {
    // Method to call the root toggleTheme method
    toggleTheme() {
      this.$root.toggleTheme(); // Call method on the root Vue instance
    },
    // Method to call the root logout method
    logout() {
      this.$root.handleLogout(); // Call method on the root Vue instance
    }
  },
  mounted() {
    // Bootstrap collapse functionality might need re-initialization if loaded dynamically
    // Or ensure Bootstrap JS is loaded globally before Vue mounts.
    // For simplicity now, we assume Bootstrap handles its own events.
    console.log("HeaderComponent mounted.");
  }
};

// If not using a build system, this component needs to be globally registered or imported in app.js
// We already registered a placeholder in app.js, this definition would replace that.
// For simplicity with CDN, we might need to attach this to the window object or adjust app.js

// Make available for default import
export default HeaderComponent;
// Example (if needed, adjust based on actual setup): window.HeaderComponent = HeaderComponent;