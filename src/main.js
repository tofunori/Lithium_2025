// Main Vue application entry point: js/app.js

// Import Vue functions (assuming global registration from CDN)
const { createApp } = Vue;
const { createRouter, createWebHistory } = VueRouter;

// Import our custom auth service
import { authService } from './auth-service.js';

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
const LoginPage = { template: '<div>Loading Login Page...</div>' }; // Placeholder for login component/page
const EditFacilityPage = { template: '<div>Loading Edit Facility...</div>' };
const NewFacilityPage = { template: '<div>Loading New Facility...</div>' };


// --- Route Definitions ---
const routes = [
  { path: '/', component: DashboardPage, name: 'Dashboard' },
  { path: '/facilities', component: FacilitiesPage, name: 'FacilitiesList' },
  { path: '/facilities/:id', component: FacilityDetailPage, name: 'FacilityDetail', props: true }, // Use props to pass ID
  { path: '/charts', component: ChartsPage, name: 'Charts' },
  { path: '/documents', component: DocumentsPage, name: 'Documents' },
  { path: '/about', component: AboutPage, name: 'About' }, // Use actual component and clean path
  { path: '/login', component: LoginPage, name: 'Login' },
  { path: '/edit-facility.html', component: EditFacilityPage, name: 'EditFacility' }, // Assuming ID passed via query or state later
  { path: '/new-facility.html', component: NewFacilityPage, name: 'NewFacility' },
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
  data() {
    return {
      // Global state accessible via this.$root in components
      isAuthenticated: false,
      currentUser: null, // Store user object (Firebase) or token info (JWT)
      theme: localStorage.getItem('theme') || 'light-theme' // Load initial theme
    };
  },
  methods: {
    // Method to check auth status (can be called from components)
    async checkAuthStatus() {
      console.log("Vue app: Checking auth status...");
      try {
        const user = await authService.getCurrentUser();
        this.isAuthenticated = !!user;
        this.currentUser = user; // Store the user object or token info
        console.log("Vue app: Auth status updated:", this.isAuthenticated, this.currentUser);
      } catch (error) {
        console.error('Vue app: Auth check error:', error);
        this.isAuthenticated = false;
        this.currentUser = null;
      }
    },
    // Method to toggle theme
    toggleTheme() {
      this.theme = this.theme === 'light-theme' ? 'dark-theme' : 'light-theme';
      localStorage.setItem('theme', this.theme);
      document.body.classList.toggle('dark-theme', this.theme === 'dark-theme');
      // Update theme icon if managed by Vue later
    },
    // Method for logout
    async handleLogout() {
       console.log("Vue app: Handling logout...");
       try {
         await authService.logout();
         this.isAuthenticated = false;
         this.currentUser = null;
         router.push({ name: 'Dashboard' }); // Navigate to home after logout
         console.log("Vue app: Logout successful.");
       } catch(error) {
         console.error("Vue app: Logout error:", error);
       }
    }
  },
  mounted() {
    // Initial check when app mounts
    this.checkAuthStatus();
    // Apply initial theme class to body
    document.body.classList.toggle('dark-theme', this.theme === 'dark-theme');
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