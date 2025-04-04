// Main Vue application entry point: js/app.js

// Import Vue functions
import { createApp, ref, provide, readonly, computed } from 'vue'; // Import necessary Composition API functions
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';

// Import our custom auth service
import { authService } from './services/authService.js';

// --- Import Components & Views ---
import HeaderComponent from './components/HeaderComponent.vue';
import FooterComponent from './components/FooterComponent.vue';
import ErrorBoundary from './components/ErrorBoundary.vue'; // Import ErrorBoundary
// Views are now dynamically imported in the routes definition


// --- Route Definitions ---
const routes = [
  { path: '/', component: () => import('./views/DashboardView.vue'), name: 'Dashboard' },
  { path: '/facilities', component: () => import('./views/FacilitiesView.vue'), name: 'FacilitiesList' },
  { path: '/facilities/:id', component: () => import('./views/FacilityDetailView.vue'), name: 'FacilityDetail', props: true }, // Use props to pass ID
  { path: '/charts', component: () => import('./views/ChartsView.vue'), name: 'Charts' },
  { path: '/documents', component: () => import('./views/DocumentsView.vue'), name: 'Documents' },
  { path: '/about', component: () => import('./views/AboutView.vue'), name: 'About' }, // Use actual component and clean path
  {
    path: '/login',
    component: () => import('./views/LoginView.vue'),
    name: 'Login',
    beforeEnter(to, from, next) {
      // Allow access to login page regardless of auth state during navigation.
      // The actual sign-out is handled by the logout function itself.
      // This prevents the redirect loop when logging out.
      next();
    }
  },
  { path: '/facilities/new', component: () => import('./views/NewFacilityView.vue'), name: 'NewFacility' },
  { path: '/facilities/:id/edit', component: () => import('./views/EditFacilityView.vue'), name: 'EditFacility', props: true }, // Use correct path, component, and props
  // Redirect old index.html path if needed
  { path: '/index.html', redirect: '/' } 
];

// --- Create Router Instance ---
const router = createRouter({
  history: createWebHistory(), // Use browser history mode
  routes, 
  linkActiveClass: 'active', // Optional: Class for active router links
  scrollBehavior(to, from, savedPosition) {
    // Scroll to top on new page load
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

// Add navigation guard to log route changes
router.beforeEach((to, from, next) => {
  console.log(`VUE ROUTER: Navigating from ${from.path} to ${to.path}`);
  next();
});

// --- Create Vue App Instance ---
// Define the root component with a template
const RootComponent = {
  setup() {
    // --- Reactive State ---
    const isAuthenticated = ref(false);
    const currentUser = ref(null); // Will contain user info + role
    const userRole = ref(null); // Add a ref for the role
    const theme = ref(localStorage.getItem('theme') || 'light-theme');

    // --- Methods ---
    const checkAuthStatus = async () => {
      console.log("Vue app: Checking auth status...");
      try {
        const userWithRole = await authService.getCurrentUser(); // Now returns user + role
        isAuthenticated.value = !!userWithRole;
        currentUser.value = userWithRole; // Store the user object (which includes role)
        userRole.value = userWithRole ? userWithRole.role : null; // Extract role
        console.log("Vue app: Auth status updated:", isAuthenticated.value, currentUser.value, userRole.value);
      } catch (error) {
        console.error('Vue app: Auth check error:', error);
        isAuthenticated.value = false;
        currentUser.value = null;
        userRole.value = null; // Clear role on error
      }
    };

    const toggleTheme = () => {
      theme.value = theme.value === 'light-theme' ? 'dark-theme' : 'light-theme';
      localStorage.setItem('theme', theme.value);
      document.body.className = theme.value; // Apply theme class directly to body
    };

    const handleLogout = async () => {
      console.log("Vue app: Handling logout...");
      try {
        await authService.logout();
        isAuthenticated.value = false;
        currentUser.value = null;
        userRole.value = null; // Clear role on logout
        router.push({ name: 'Dashboard' });
        console.log("Vue app: Logout successful.");
      } catch(error) {
        console.error("Vue app: Logout error:", error);
      }
    };

    // --- Provide State and Methods ---
    provide('isAuthenticated', readonly(isAuthenticated));
    provide('currentUser', readonly(currentUser));
    provide('userRole', readonly(userRole));
    provide('theme', readonly(theme));
    provide('toggleTheme', toggleTheme);
    provide('handleLogout', handleLogout);

    // --- Lifecycle Hook (equivalent to mounted) ---
    checkAuthStatus();
    document.body.className = theme.value; // Apply initial theme to body

    // Return refs needed in the template
    return {
      theme
    };
  },
  // Define the template for the root component
  template: `
    <div :class="theme"> <!-- Apply theme class -->
      <header-component />
      <main class="main-content"> <!-- Add a wrapper for main content -->
        <error-boundary>
          <router-view v-slot="{ Component }">
            <Suspense>
              <template #default>
                <div> <!-- Wrap the dynamic component in a single root element -->
                  <component :is="Component" />
                </div>
              </template>
              <template #fallback>
                <div class="container mt-4 text-center">
                  <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading page...</span>
                  </div>
                </div>
              </template>
            </Suspense>
          </router-view>
        </error-boundary>
      </main>
      <footer-component />
    </div>
  `
};

const app = createApp(RootComponent);

// --- Register Global Components (Placeholders for now) ---
app.component('header-component', HeaderComponent);
app.component('footer-component', FooterComponent);
app.component('error-boundary', ErrorBoundary); // Register ErrorBoundary globally
// Page components are handled by the router

// --- Use Router ---
app.use(router);

// --- Use Pinia --- 
const pinia = createPinia();
app.use(pinia);

// --- Mount App ---
app.mount('#app');

console.log("Vue app initialized.");