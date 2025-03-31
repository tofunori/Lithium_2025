// js/common.js - Handles header loading, theme, auth, and SPA routing

// --- Page Initializers Mapping (Store NAMES now) ---
const pageInitializerNames = {
    'index.html': 'initDashboardPage',
    '': 'initDashboardPage', // Handle root path
    'facilities.html': 'initFacilitiesPage',
    'charts.html': 'initChartsPage',
    'documents.html': 'initDocumentsPage',
    'about.html': null // No specific JS needed for about page yet
};

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', function() {
    const headerPlaceholder = document.getElementById('header-placeholder');

    if (headerPlaceholder) {
        fetch('/includes/_header.html') // Changed to absolute path
            .then(response => response.ok ? response.text() : Promise.reject(`HTTP error loading header! status: ${response.status}`))
            .then(html => {
                headerPlaceholder.innerHTML = html;
                setActiveNavLink();
                initializeThemeSwitcher();
                return checkAuthStatus(); // Return promise to chain
            })
            .then(() => {
                 // Initial Page JS Execution (Run directly since script is already loaded, but use setTimeout for safety)
                 setTimeout(() => {
                     const fullPath = window.location.pathname;
                     const initialPageName = fullPath.split('/').pop() || 'index.html';
                     console.log(`Initial page path: ${fullPath}`);

                     let initializerName = null;
                     if (fullPath.includes('/facilities/')) {
                         initializerName = 'initFacilityDetailPage'; // Use the detail page initializer
                         console.log(`Initial load is facility page, using initializer: ${initializerName}`);
                     } else {
                         initializerName = pageInitializerNames[initialPageName]; // Look up in map for main pages
                     }

                     if (initializerName && typeof window[initializerName] === 'function') {
                         console.log(`Running initializer for initial load: ${initialPageName}`);
                         try {
                            window[initializerName]();
                         } catch (initError) {
                             console.error(`Error running initializer for ${initialPageName}:`, initError);
                         }
                     } else {
                         console.log(`No initializer function found in window scope for initial load: ${initialPageName} (Expected: ${initializerName})`);
                     }
                 }, 0); // Delay execution slightly

                 // Initialize Router AFTER everything else (Router init doesn't need delay)
                 initializeRouter();
                 // Set Initial Subtitle
                 const pageSubtitleElement = document.getElementById('page-subtitle-main');
                 const headerSubtitleElement = document.getElementById('page-subtitle');
                 if (pageSubtitleElement && headerSubtitleElement) {
                     headerSubtitleElement.textContent = pageSubtitleElement.textContent;
                 }
            })
            .catch(error => {
                console.error('Error during initial setup:', error);
                if (headerPlaceholder) headerPlaceholder.innerHTML = '<p class="text-danger">Error loading site header.</p>';
            });
    } else {
        console.error('Header placeholder element not found.');
    }
});


// --- SPA Routing Logic ---

function initializeRouter() {
    console.log("Initializing SPA Router...");
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) {
        console.error("Cannot initialize router: Header placeholder not found.");
        return;
    }

    // Event delegation for navigation links
    headerPlaceholder.addEventListener('click', (event) => {
        const link = event.target.closest('a.nav-link');
        if (link) {
            const url = link.getAttribute('href');
            if (url && !url.startsWith('#') && !url.startsWith('javascript:') && !url.startsWith('http://') && !url.startsWith('https://')) {
                 if (link.id === 'logoutLink') return;
                event.preventDefault();
                console.log(`Navigating to: ${url}`);
                loadPageContent(url);
            }
        }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        console.log("Popstate event triggered:", event.state);
        const url = event.state?.path || window.location.pathname;
        if (url === window.location.pathname && !event.state) {
            console.log("Popstate ignored for initial state.");
            return;
        }
        loadPageContent(url, false);
    });
     console.log("Router initialized.");
}

async function loadPageContent(url, pushState = true) {
    console.log(`Loading content for: ${url}, pushState: ${pushState}`);
    const mainContentElement = document.getElementById('main-content');
    if (!mainContentElement) {
        console.error("Main content element (#main-content) not found!");
        return;
    }

    mainContentElement.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

    try {
        // Ensure the fetch URL is absolute from the root
        const absoluteUrl = new URL(url, window.location.origin).pathname;
        console.log(`Fetching absolute URL: ${absoluteUrl}`); // Debug log
        const response = await fetch(absoluteUrl);
        if (!response.ok) {
            throw new Error(response.status === 404 ? `Page not found (404) for ${absoluteUrl}` : `HTTP error! status: ${response.status} for ${absoluteUrl}`);
        }
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const newMainContent = doc.getElementById('main-content');
        const newTitle = doc.querySelector('title')?.textContent || 'Lithium Dashboard';
        const pageScriptTag = doc.querySelector('script[data-page-script="true"]'); // Find page script tag
        const pageScriptSrc = pageScriptTag ? pageScriptTag.getAttribute('src') : null;
        const pagePath = url.split('/').pop() || 'index.html';
        const initializerName = pageInitializerNames[pagePath];

        if (newMainContent) {
            // --- Update Core DOM ---
            mainContentElement.innerHTML = newMainContent.innerHTML;
            document.title = newTitle;
            if (pushState && window.location.pathname !== absoluteUrl) { // Check against absoluteUrl
                history.pushState({ path: absoluteUrl }, newTitle, absoluteUrl); // Use absoluteUrl
                console.log("Pushed state:", absoluteUrl);
            }
            setActiveNavLink(); // This should now work correctly with the updated URL
            const newPageSubtitleElement = doc.getElementById('page-subtitle-main');
            const headerSubtitleElement = document.getElementById('page-subtitle');
            if (headerSubtitleElement) {
                headerSubtitleElement.textContent = newPageSubtitleElement ? newPageSubtitleElement.textContent : '';
            }
            // --- End Update Core DOM ---


            // --- Handle Page Script Loading & Initialization ---
            const oldScript = document.getElementById('page-specific-script');
            if (oldScript) {
                console.log("Removing old page script.");
                oldScript.remove();
            }

            // Define the function to run the initializer *after* script loads
            const runInitializer = () => {
                // Determine the correct initializer name based on URL path
                let finalInitializerName = initializerName; // Start with the name from the map
                if (url.includes('/facilities/')) {
                    finalInitializerName = 'initFacilityDetailPage'; // Override for facility detail pages
                    console.log(`URL indicates facility page, using initializer: ${finalInitializerName}`);
                }

                // Now check and run using the potentially overridden name
                if (finalInitializerName && typeof window[finalInitializerName] === 'function') {
                    console.log(`Running initializer: ${finalInitializerName}`);
                    try {
                        window[finalInitializerName]();
                    } catch (initError) {
                        console.error(`Error running initializer ${finalInitializerName}:`, initError);
                    }
                } else {
                    console.log(`Initializer ${finalInitializerName || 'none specified'} not found or not a function.`);
                }
            };

            // Load and execute the script if found
            if (pageScriptSrc) {
                console.log(`Found page script: ${pageScriptSrc}. Loading...`);
                const newScript = document.createElement('script');
                newScript.id = 'page-specific-script'; // ID to find and remove later
                // Ensure the script src is absolute from the root
                newScript.src = pageScriptSrc.startsWith('/') ? pageScriptSrc : `/${pageScriptSrc}`;
                console.log(`Setting script src to: ${newScript.src}`); // Debug log
                newScript.onload = () => {
                    console.log(`Script ${newScript.src} loaded.`);
                    runInitializer(); // Run initializer AFTER script loads
                };
                newScript.onerror = () => {
                    console.error(`Failed to load page script: ${pageScriptSrc}`);
                    // Maybe still try to run initializer if it exists without script? Unlikely.
                };
                document.body.appendChild(newScript);
            } else {
                console.log(`No data-page-script found for ${url}.`);
                // If no script is needed, but an initializer function *is* defined
                // (e.g., for a simple page that just needs a minor JS tweak defined globally), run it directly.
                 runInitializer(); // Try running anyway, might be null/not found.
            }
            // --- End Handle Page Script ---

            window.scrollTo(0, 0);

        } else {
            throw new Error(`Could not find #main-content in fetched HTML for ${url}`);
        }

    } catch (error) {
        console.error('Error loading page content:', error);
        mainContentElement.innerHTML = `<p class="text-danger text-center">Failed to load page: ${error.message}. Please try again.</p>`;
    }
}


// --- Existing Functions (setActiveNavLink, Theme, Auth, Logout - unchanged from previous version) ---

function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const normalizedPath = currentPath === '/' ? 'index.html' : currentPath.substring(currentPath.lastIndexOf('/') + 1);
    console.log(`Setting active nav link for path: ${normalizedPath}`);
    const navLinks = document.querySelectorAll('#header-placeholder .navbar-nav .nav-link');
    if (!navLinks || navLinks.length === 0) {
        console.warn("No nav links found to set active state.");
        return;
    }
    navLinks.forEach(link => {
        const linkUrl = new URL(link.href, window.location.origin);
        const linkPath = linkUrl.pathname === '/' ? 'index.html' : linkUrl.pathname.substring(linkUrl.pathname.lastIndexOf('/') + 1);
        link.classList.remove('active');
        link.removeAttribute('aria-current');
        if (normalizedPath === linkPath) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

function initializeThemeSwitcher() {
    const themeSwitch = document.getElementById('themeSwitch');
    const themeIcon = document.querySelector('label[for="themeSwitch"] i');
    if (!themeSwitch || !themeIcon) {
        console.warn("Theme switch elements not found.");
        return;
    }
    const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
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
         themeIcon.classList.add('fa-moon');
    }
    if (!themeSwitch.hasAttribute('data-listener-added')) {
        themeSwitch.addEventListener('change', function(e) {
            if (e.target.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark-theme');
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light-theme');
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            }
        });
        themeSwitch.setAttribute('data-listener-added', 'true');
    }
}

async function checkAuthStatus() {
    const authStatusElement = document.getElementById('authStatus');
    if (!authStatusElement) {
         console.warn("Auth status element not found.");
         return; // Return a resolved promise
    }
    try {
        const response = await fetch('/api/session');
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
            const logoutLink = document.getElementById('logoutLink');
             if (logoutLink) {
                 if (!logoutLink.hasAttribute('data-listener-added')) {
                    logoutLink.addEventListener('click', handleLogout);
                    logoutLink.setAttribute('data-listener-added', 'true');
                 }
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
    console.log("Logout clicked");
    try {
        const response = await fetch('/api/logout');
         if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            loadPageContent('index.html');
            const authStatusElement = document.getElementById('authStatus');
            if(authStatusElement) {
                 authStatusElement.innerHTML = `<a href="login.html" class="btn btn-sm btn-outline-success">Admin Login</a>`;
            }
        } else {
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('An error occurred during logout.');
    }
}