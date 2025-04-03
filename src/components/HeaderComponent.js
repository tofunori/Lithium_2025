// js/components/HeaderComponent.js
import { inject, computed } from 'vue'; // Import inject and computed

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
              <!-- Bind checked state to injected theme, trigger injected method on change -->
              <input class="form-check-input" type="checkbox" role="switch" id="themeSwitchHeader"
                     :checked="theme === 'dark-theme'"
                     @change="toggleTheme">
              <label class="form-check-label" for="themeSwitchHeader">
                <!-- Dynamically change icon based on theme -->
                <i :class="themeIconClass"></i>
              </label>
            </div>
            <!-- Auth Status -->
            <div id="authStatusHeader" class="d-flex align-items-center">
              <!-- Use v-if/v-else based on injected isAuthenticated state -->
              <div v-if="isAuthenticated">
                <!-- Display email from injected user object or default -->
                <span>Welcome, {{ userDisplayName }}!</span>
                <!-- Trigger injected logout method on click -->
                <button @click="handleLogout" class="btn btn-sm btn-outline-danger ms-2">Logout</button>
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
  setup() {
    // Inject the provided state and methods
    const isAuthenticated = inject('isAuthenticated');
    const currentUser = inject('currentUser');
    const userRole = inject('userRole'); // Inject the userRole
    const theme = inject('theme');
    const toggleTheme = inject('toggleTheme');
    const handleLogout = inject('handleLogout');

    // Compute the display name based on injected state
    const userDisplayName = computed(() => {
      if (!isAuthenticated.value) return '';
      if (currentUser.value && currentUser.value.email) {
        return currentUser.value.email;
      }
      return 'Admin'; // Fallback
    });

    // Compute the class for the theme icon based on injected state
    const themeIconClass = computed(() => {
      return theme.value === 'dark-theme' ? 'fas fa-sun' : 'fas fa-moon';
    });

    // Return everything needed by the template
    return {
      isAuthenticated,
      currentUser,
      userRole, // Expose userRole if needed in template later
      theme,
      toggleTheme,
      handleLogout,
      userDisplayName,
      themeIconClass
    };
  },
  mounted() {
    // Bootstrap collapse functionality might need re-initialization if loaded dynamically
    // Or ensure Bootstrap JS is loaded globally before Vue mounts.
    // For simplicity now, we assume Bootstrap handles its own events.
    console.log("HeaderComponent mounted.");
  }
  // Removed old computed and methods options as they are replaced by setup
};

// Make available for default import
export default HeaderComponent;