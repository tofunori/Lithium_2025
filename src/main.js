// Main Vue application entry point: js/app.js

// Import Vue functions
import { createApp, ref, provide, readonly, computed } from 'vue'; // Import necessary Composition API functions
import { createRouter, createWebHistory } from 'vue-router';

// Import our custom auth service
import { authService } from './services/authService.js';

// --- Import Actual Components ---
// Import Actual Components
import HeaderComponent from './components/HeaderComponent.js';
import FooterComponent from './components/FooterComponent.js';
import DashboardPage from './pages/DashboardPage.js';
import FacilitiesPage from './pages/FacilitiesPage.js'; // Import the actual FacilitiesPage
// We will create the actual component files later
// const HeaderComponent = { template: '<div><!-- Header Placeholder --></div>' }; // Remove placeholder
// const FooterComponent = { template: '<div><!-- Footer Placeholder --></div>' }; // Remove placeholder
// const DashboardPage = { template: '<div>Loading Dashboard...</div>' }; // Remove placeholder
import FacilityDetailPage from './pages/FacilityDetailPage.js'; // Import the actual FacilityDetailPage
// We will create the actual component files later
// const HeaderComponent = { template: '<div><!-- Header Placeholder --></div>' }; // Remove placeholder
// const FooterComponent = { template: '<div><!-- Footer Placeholder --></div>' }; // Remove placeholder
// const DashboardPage = { template: '<div>Loading Dashboard...</div>' }; // Remove placeholder
// const FacilitiesPage = { template: '<div>Loading Facilities...</div>' }; // Remove placeholder
import DocumentsPage from './pages/DocumentsPage.js'; // Import the actual DocumentsPage
import NewFacilityPage from './pages/NewFacilityPage.vue'; // Import the new component
import EditFacilityPage from './pages/EditFacilityPage.js'; // Import the edit component
// We will create the actual component files later
// const HeaderComponent = { template: '<div><!-- Header Placeholder --></div>' }; // Remove placeholder
// const FooterComponent = { template: '<div><!-- Footer Placeholder --></div>' }; // Remove placeholder
// const DashboardPage = { template: '<div>Loading Dashboard...</div>' }; // Remove placeholder
// const FacilitiesPage = { template: '<div>Loading Facilities...</div>' }; // Remove placeholder
import ChartsPage from './pages/ChartsPage.js'; // Import the actual ChartsPage
import AboutPage from './pages/AboutPage.js'; // Import the actual AboutPage
// We will create the actual component files later
// const HeaderComponent = { template: '<div><!-- Header Placeholder --></div>' }; // Remove placeholder
// const FooterComponent = { template: '<div><!-- Footer Placeholder --></div>' }; // Remove placeholder
// const DashboardPage = { template: '<div>Loading Dashboard...</div>' }; // Remove placeholder
// const FacilitiesPage = { template: '<div>Loading Facilities...</div>' }; // Remove placeholder
// const FacilityDetailPage = { template: '<div>Loading Facility Detail...</div>' }; // Remove placeholder
// const ChartsPage = { template: '<div>Loading Charts...</div>' }; // Remove placeholder
// const DocumentsPage = { template: '<div>Loading Documents...</div>' }; // Remove placeholder
// const AboutPage = { template: '<div>Loading About Page...</div>' }; // Remove placeholder definition
import LoginPage from './pages/LoginPage.vue'; // Import the actual login component
// Placeholders removed, actual components imported above


// --- Route Definitions ---
const routes = [
  { path: '/', component: DashboardPage, name: 'Dashboard' },
  { path: '/facilities', component: FacilitiesPage, name: 'FacilitiesList' },
  { path: '/facilities/:id', component: FacilityDetailPage, name: 'FacilityDetail', props: true }, // Use props to pass ID
  { path: '/charts', component: ChartsPage, name: 'Charts' },
  { path: '/documents', component: DocumentsPage, name: 'Documents' },
  { path: '/about', component: AboutPage, name: 'About' }, // Use actual component and clean path
  {
    path: '/login',
    component: LoginPage,
    name: 'Login', // Use the imported component
    beforeEnter(to, from, next) {
      // Allow access to login page regardless of auth state during navigation.
      // The actual sign-out is handled by the logout function itself.
      // This prevents the redirect loop when logging out.
      next();
    }
  },
  { path: '/facilities/new', component: NewFacilityPage, name: 'NewFacility' },
  { path: '/facilities/:id/edit', component: EditFacilityPage, name: 'EditFacility', props: true }, // Use correct path, component, and props
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
const app = createApp({
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
      document.body.classList.toggle('dark-theme', theme.value === 'dark-theme');
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
    // Use readonly for state to prevent accidental mutation in child components
    provide('isAuthenticated', readonly(isAuthenticated));
    provide('currentUser', readonly(currentUser)); // Provided object now contains role
    provide('userRole', readonly(userRole)); // Provide the role separately too
    provide('theme', readonly(theme));
    provide('toggleTheme', toggleTheme);
    provide('handleLogout', handleLogout);

    // --- Lifecycle Hook (equivalent to mounted) ---
    // Initial auth check
    checkAuthStatus();
    // Apply initial theme
    document.body.classList.toggle('dark-theme', theme.value === 'dark-theme');

    // No need to return anything from setup if not using <template> in root
  }
});

// --- Register Global Components (Placeholders for now) ---
app.component('header-component', HeaderComponent);
app.component('footer-component', FooterComponent);
// Page components are handled by the router

// --- Use Router ---
app.use(router);

// --- Mount App ---
app.mount('#app');

console.log("Vue app initialized.");