import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue' // Import ref
import HeaderComponent from '../../src/components/HeaderComponent.vue' // Adjust path if needed
import { createRouter, createWebHistory } from 'vue-router'

// Create a mock router instance
const routes = [
  // Add routes used in the HeaderComponent's router-links
  { path: '/', name: 'Dashboard', component: { template: '<div></div>' } },
  { path: '/facilities', name: 'FacilitiesList', component: { template: '<div></div>' } },
  { path: '/charts', name: 'Charts', component: { template: '<div></div>' } },
  { path: '/documents', name: 'Documents', component: { template: '<div></div>' } },
  { path: '/about', name: 'About', component: { template: '<div></div>' } },
  { path: '/login', name: 'Login', component: { template: '<div></div>' } },
  // Add other routes if necessary
];
const router = createRouter({
  history: createWebHistory(),
  routes,
});

describe('HeaderComponent.js', () => {
  let wrapper;

  // Function to mount with specific auth state
  const mountComponent = async (isAuthenticated = false) => {
    // Define the provided values for the test
    const mockIsAuthenticated = ref(isAuthenticated);
    const mockCurrentUser = ref(isAuthenticated ? { uid: 'test-user', email: 'test@example.com' } : null);
    const mockTheme = ref('light-theme');
    const mockToggleTheme = vi.fn(() => {
        mockTheme.value = mockTheme.value === 'light-theme' ? 'dark-theme' : 'light-theme';
    });
    const mockHandleLogout = vi.fn(() => {
        mockIsAuthenticated.value = false;
        mockCurrentUser.value = null;
    });

    wrapper = mount(HeaderComponent, {
      global: {
        plugins: [router],
        // Use provide to supply mocked reactive state and functions
        provide: {
          isAuthenticated: mockIsAuthenticated, // Provide refs directly
          currentUser: mockCurrentUser,
          theme: mockTheme,
          toggleTheme: mockToggleTheme,
          handleLogout: mockHandleLogout
        }
      }
    });
    await router.isReady();
  };

  afterEach(() => {
    // Clean up mocks if necessary
    vi.restoreAllMocks();
  });

  it('mounts successfully', async () => {
    await mountComponent();
    expect(wrapper.exists()).toBe(true);
  });

  it('displays the brand name/logo', async () => {
    await mountComponent();
    // Check for the presence of the brand text or image alt text
    // Example: Adjust selector based on actual component structure
    expect(wrapper.find('.navbar-brand').exists()).toBe(true);
    // expect(wrapper.find('.navbar-brand').text()).toContain('Your Brand');
  });

  it('displays navigation links', async () => {
    await mountComponent();
    // Check if expected router-links are present
    expect(wrapper.findComponent({ name: 'RouterLink', props: { to: { name: 'Dashboard' } } }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'RouterLink', props: { to: { name: 'FacilitiesList' } } }).exists()).toBe(true);
    // Add checks for other links...
  });

  it('displays Login button when not authenticated', async () => {
    await mountComponent(false); // Mount in logged-out state
    const loginLink = wrapper.findComponent({ name: 'RouterLink', props: { to: { name: 'Login' } } });
    expect(loginLink.exists()).toBe(true);
    // Check that logout button/user info is NOT present
    expect(wrapper.find('#user-menu-button').exists()).toBe(false); // Example selector
  });

  it('displays user menu/logout when authenticated', async () => {
    await mountComponent(true); // Mount in logged-in state
    // Check that Login button is NOT present
    // Check that Login button is NOT present using a more specific selector for the rendered <a> tag
    const loginButton = wrapper.find('a.btn-outline-success[href="/login"]');
    expect(loginButton.exists()).toBe(false);
    // Check that logout button/user info IS present
    expect(wrapper.find('button.btn-outline-danger').exists()).toBe(true); // Check for logout button
    expect(wrapper.text()).toContain('Welcome, test@example.com!'); // Check for welcome message
  });

  it('calls toggleTheme when switch is clicked', async () => {
    await mountComponent();
    const toggleSwitch = wrapper.find('#themeSwitchHeader');
    await toggleSwitch.setValue(true); // Simulate clicking the switch
    expect(wrapper.vm.toggleTheme).toHaveBeenCalled(); // Check if the injected function was called via the wrapper's vm
  });

  it('calls handleLogout when logout button is clicked', async () => {
     await mountComponent(true); // Mount as authenticated
     const logoutButton = wrapper.find('button.btn-outline-danger');
     await logoutButton.trigger('click');
     expect(wrapper.vm.handleLogout).toHaveBeenCalled(); // Check if the injected function was called
  });
});