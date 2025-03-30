document.addEventListener('DOMContentLoaded', function() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const pageSubtitleElement = document.getElementById('page-subtitle-main'); // Optional: Element in main page to get subtitle from

    if (headerPlaceholder) {
        fetch('includes/_header.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                headerPlaceholder.innerHTML = html;

                // Set Active Nav Link
                setActiveNavLink();

                // Set Page Subtitle (if element exists on main page)
                const headerSubtitleElement = document.getElementById('page-subtitle');
                if (pageSubtitleElement && headerSubtitleElement) {
                    headerSubtitleElement.textContent = pageSubtitleElement.textContent;
                } else if (headerSubtitleElement) {
                    // Set a default or leave empty if no specific subtitle found
                    // headerSubtitleElement.textContent = "Dashboard Overview";
                }


                // Initialize Theme Switcher (moved from inline script)
                initializeThemeSwitcher();

                // Initialize Auth Check (moved from inline script)
                checkAuthStatus();
            })
            .catch(error => {
                console.error('Error loading header:', error);
                headerPlaceholder.innerHTML = '<p class="text-danger">Error loading header content.</p>';
            });
    } else {
        console.error('Header placeholder element not found.');
    }
});

function setActiveNavLink() {
    const currentPagePath = window.location.pathname.split('/').pop(); // Gets 'index.html', 'about.html', etc.
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href').split('/').pop();
        link.classList.remove('active'); // Remove active class from all
        link.removeAttribute('aria-current');

        // Handle root path case for index.html
        if ((currentPagePath === '' || currentPagePath === 'index.html') && linkPath === 'index.html') {
             link.classList.add('active');
             link.setAttribute('aria-current', 'page');
        } else if (currentPagePath === linkPath && linkPath !== 'index.html') {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

// --- Theme Switcher Logic (Moved from inline script) ---
function initializeThemeSwitcher() {
    const themeSwitch = document.getElementById('themeSwitch');
    const themeIcon = document.querySelector('label[for="themeSwitch"] i');
    if (!themeSwitch || !themeIcon) return; // Elements might not be loaded yet if fetch failed

    const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;

    // Apply saved theme on initial load
    if (currentTheme) {
        document.body.classList.add(currentTheme);
        if (currentTheme === 'dark-theme') {
            themeSwitch.checked = true;
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
             themeIcon.classList.remove('fa-sun');
             themeIcon.classList.add('fa-moon');
        }
    } else {
        // Default icon if no theme saved
         themeIcon.classList.add('fa-moon');
    }

    // Listener for theme switch toggle
    themeSwitch.addEventListener('change', function(e) {
        if (e.target.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark-theme');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light-theme'); // Explicitly save light theme
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    });
}

// --- Authentication Check Logic (Moved from inline script) ---
async function checkAuthStatus() {
    const authStatusElement = document.getElementById('authStatus');
    if (!authStatusElement) return; // Element might not be loaded yet

    try {
        const response = await fetch('/api/session'); // Ensure this API endpoint is correct
        if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
        }
        const sessionData = await response.json();

        if (sessionData.loggedIn && sessionData.user) {
            authStatusElement.innerHTML = `
                <span>Welcome, ${sessionData.user.username}!</span>
                <a href="new-facility.html" class="btn btn-sm btn-success ms-2"><i class="fas fa-plus"></i> Add Facility</a>
                <a href="#" id="logoutLink" class="btn btn-sm btn-outline-danger ms-2">Logout</a>
            `;
            // Add event listener for logout *after* the element is added
            const logoutLink = document.getElementById('logoutLink');
             if (logoutLink) {
                logoutLink.addEventListener('click', handleLogout);
             }

        } else {
            authStatusElement.innerHTML = `
                <a href="login.html" class="btn btn-sm btn-outline-success">Admin Login</a>
            `;
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        authStatusElement.innerHTML = '<span class="text-danger">Session check failed</span>';
    }
}

async function handleLogout(event) {
    event.preventDefault();
    try {
        const response = await fetch('/api/logout'); // Ensure this API endpoint is correct
         if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            window.location.reload(); // Reload to reflect logout state
        } else {
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('An error occurred during logout.');
    }
}