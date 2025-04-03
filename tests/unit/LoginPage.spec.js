import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginPage from '../../src/pages/LoginPage.vue' // Adjust path if needed
import { createRouter, createWebHistory } from 'vue-router'
import { authService } from '../../src/services/authService.js' // Import the actual service to mock its methods

// --- Mock authService ---
// We mock the specific methods the component uses
vi.mock('../../src/services/authService.js', () => ({
  authService: {
    login: vi.fn(), // Mock 'login' instead
    // Mock other methods if LoginPage uses them
  }
}));
// --- End Mock authService ---

// Create a mock router instance
const routes = [
  { path: '/login', name: 'Login', component: LoginPage },
  { path: '/', name: 'Dashboard', component: { template: '<div>Dashboard</div>' } }, // Target for redirect
];
const router = createRouter({
  history: createWebHistory(),
  routes,
});

describe('LoginPage.vue', () => {
  let wrapper;

  // Function to mount the component
  const mountComponent = async () => {
    // Ensure router is ready before each mount
    await router.push('/login'); // Navigate to the login route
    await router.isReady();

    wrapper = mount(LoginPage, {
      global: {
        plugins: [router],
      }
    });
  };

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();
    await mountComponent();
  });

  afterEach(() => {
    // Clean up
    vi.restoreAllMocks();
  });

  it('mounts successfully', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('renders username and password input fields', () => {
    expect(wrapper.find('input#email').exists()).toBe(true); // Use #email
    expect(wrapper.find('input#password').exists()).toBe(true);
  });

  it('renders a login button', () => {
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toContain('Log In'); // Expect "Log In"
  });

  it('calls authService.login on form submission', async () => {
    // Simulate user input
    await wrapper.find('input#email').setValue('test@example.com'); // Use #email and valid email format
    await wrapper.find('input#password').setValue('password');

    // Mock a successful login response
    authService.login.mockResolvedValue({ success: true, user: { uid: 'test-uid' } }); // Mock successful login response for 'login'

    // Simulate form submission
    await wrapper.find('form').trigger('submit.prevent');

    // Assert that the service method was called
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('redirects to Dashboard on successful login', async () => {
    await wrapper.find('input#email').setValue('test@example.com'); // Use #email
    await wrapper.find('input#password').setValue('password');
    authService.login.mockResolvedValue({ success: true, user: { uid: 'test-uid' } }); // Mock 'login'

    // Spy on router.push before submitting
    const pushSpy = vi.spyOn(router, 'push');

    await wrapper.find('form').trigger('submit.prevent');

    // Wait for potential async operations like router push
    await wrapper.vm.$nextTick(); // Allow promises to resolve

    // Assert redirection
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith({ name: 'Dashboard' });

    pushSpy.mockRestore(); // Clean up spy
  });

  it('displays an error message on failed login', async () => {
    await wrapper.find('input#email').setValue('test@example.com'); // Use #email
    await wrapper.find('input#password').setValue('wrongpassword');
    const errorMessage = 'Invalid credentials';
    // Simulate failed login by rejecting the promise
    authService.login.mockRejectedValue(new Error(errorMessage));

    await wrapper.find('form').trigger('submit.prevent');

    // Wait for potential async operations and DOM updates
    await wrapper.vm.$nextTick();

    // Assert error message is displayed in the correct element (p tag in this case)
    const errorElement = wrapper.find('p'); // Find the <p> tag used for errors
    expect(errorElement.exists()).toBe(true);
    expect(errorElement.text()).toContain(errorMessage);
  });

});