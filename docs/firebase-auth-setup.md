# Firebase Auth Integration Setup Guide

This guide will walk you through setting up Firebase Authentication alongside your existing JWT authentication system. This approach allows both systems to coexist, minimizing risk during the transition.

## Step 1: Create Development Branch

Run these commands in your terminal:

```bash
# Create and switch to a development branch
git checkout -b develop

# Push the branch to GitHub (optional but recommended)
git push -u origin develop

# Create a feature branch for Firebase Auth
git checkout -b feature/firebase-auth develop
```

## Step 2: Install Firebase SDK

```bash
# Install Firebase SDK
npm install firebase
```

## Step 3: Create Firebase Configuration

Create a new file for your Firebase configuration:

### File: `js/firebase-config.js`

```javascript
// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "your-project",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_ID",
  appId: process.env.FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Export the config
export const getFirebaseConfig = () => firebaseConfig;
```

## Step 4: Create Auth Service

Create a new file for your authentication service:

### File: `js/auth-service.js`

```javascript
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(getFirebaseConfig());
const auth = getAuth(app);

// Feature flag to control which auth system to use
const useFirebaseAuth = localStorage.getItem('useFirebaseAuth') === 'true';

// Auth Service
export const authService = {
  // Check if using Firebase Auth
  isUsingFirebaseAuth() {
    return useFirebaseAuth;
  },
  
  // Toggle auth system
  toggleAuthSystem(useFirebase) {
    localStorage.setItem('useFirebaseAuth', useFirebase ? 'true' : 'false');
    return useFirebase;
  },
  
  // Login with email/password
  async login(email, password) {
    if (useFirebaseAuth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return {
          success: true,
          user: userCredential.user,
          token: await userCredential.user.getIdToken()
        };
      } catch (error) {
        console.error("Firebase login error:", error);
        throw error;
      }
    } else {
      // Use existing JWT login
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: email, password }),
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          localStorage.setItem('authToken', result.token);
          return {
            success: true,
            token: result.token
          };
        } else {
          throw new Error(result.message || 'Login failed');
        }
      } catch (error) {
        console.error("JWT login error:", error);
        throw error;
      }
    }
  },
  
  // Logout
  async logout() {
    if (useFirebaseAuth) {
      try {
        await signOut(auth);
        localStorage.removeItem('authToken'); // Remove any existing token
      } catch (error) {
        console.error("Firebase logout error:", error);
        throw error;
      }
    } else {
      // Use existing JWT logout
      localStorage.removeItem('authToken');
    }
  },
  
  // Get current user
  getCurrentUser() {
    if (useFirebaseAuth) {
      return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, 
          user => {
            unsubscribe();
            resolve(user);
          },
          error => {
            reject(error);
          }
        );
      });
    } else {
      // Check for JWT token
      const token = localStorage.getItem('authToken');
      return Promise.resolve(token ? { token } : null);
    }
  },
  
  // Get auth token for API calls
  async getToken() {
    if (useFirebaseAuth) {
      const user = auth.currentUser;
      if (user) {
        return user.getIdToken();
      }
      return null;
    } else {
      return localStorage.getItem('authToken');
    }
  },
  
  // Create a new user (Firebase Auth only)
  async createUser(email, password) {
    if (!useFirebaseAuth) {
      throw new Error('User creation is only available with Firebase Auth');
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
  
  // Send password reset email (Firebase Auth only)
  async resetPassword(email) {
    if (!useFirebaseAuth) {
      throw new Error('Password reset is only available with Firebase Auth');
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      console.error("Error sending password reset:", error);
      throw error;
    }
  }
};
```

## Step 5: Update Login Page

Modify your login page to use the new auth service:

### File: `login.html` (modifications)

```html
<!-- Add this before your existing script tag -->
<script type="module">
  import { authService } from './js/auth-service.js';
  
  // Add this to your existing script
  document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessageDiv = document.getElementById('errorMessage');
    errorMessageDiv.classList.add('d-none');
    
    try {
      const result = await authService.login(email, password);
      
      if (result.success) {
        console.log('Login successful');
        window.location.href = 'index.html';
      } else {
        errorMessageDiv.textContent = result.message || 'Login failed. Please check your credentials.';
        errorMessageDiv.classList.remove('d-none');
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMessageDiv.textContent = error.message || 'An error occurred during login. Please try again.';
      errorMessageDiv.classList.remove('d-none');
    }
  });
  
  // Add a toggle for auth system (for testing)
  const authSystemToggle = document.createElement('div');
  authSystemToggle.className = 'form-check mt-3';
  authSystemToggle.innerHTML = `
    <input class="form-check-input" type="checkbox" id="useFirebaseAuth">
    <label class="form-check-label" for="useFirebaseAuth">
      Use Firebase Authentication (Experimental)
    </label>
  `;
  
  document.getElementById('loginForm').appendChild(authSystemToggle);
  
  // Initialize toggle state
  document.getElementById('useFirebaseAuth').checked = authService.isUsingFirebaseAuth();
  
  // Add event listener for toggle
  document.getElementById('useFirebaseAuth').addEventListener('change', function(e) {
    authService.toggleAuthSystem(e.target.checked);
  });
</script>
```

## Step 6: Update API Authentication Middleware

Modify your API to accept both JWT and Firebase tokens:

### File: `api/index.js` (modifications)

```javascript
// Add Firebase Admin SDK initialization
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with your service account
// This should use environment variables in production
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("Could not parse FIREBASE_SERVICE_ACCOUNT environment variable.", e);
  }
} else {
  // For local development, you can use a local file
  try {
    serviceAccount = require('../config/firebase-service-account.json');
  } catch (e) {
    console.error("Could not load local Firebase service account file.", e);
  }
}

// Initialize Firebase Admin if we have credentials
if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: firebaseBucketName
    });
    console.log('Firebase Admin SDK initialized for authentication.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

// Updated isAuthenticated middleware to handle both JWT and Firebase tokens
function isAuthenticated(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided.' });
  }
  
  const token = authHeader.split(' ')[1];
  
  // First try to verify as a Firebase token
  if (admin && admin.auth) {
    admin.auth().verifyIdToken(token)
      .then(decodedToken => {
        req.user = decodedToken; // Attach decoded user payload
        console.log('Authenticated with Firebase token');
        next(); // Proceed to the protected route
      })
      .catch(firebaseError => {
        console.log('Not a valid Firebase token, trying JWT...');
        
        // If not a valid Firebase token, try as a JWT token
        jwt.verify(token, JWT_SECRET, (jwtError, user) => {
          if (jwtError) {
            console.warn('JWT Verification Failed:', jwtError.message);
            return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
          }
          
          req.user = user; // Attach decoded user payload
          console.log('Authenticated with JWT token');
          next(); // Proceed to the protected route
        });
      });
  } else {
    // If Firebase Admin is not initialized, fall back to JWT only
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.warn('JWT Verification Failed:', err.message);
        return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
      }
      
      req.user = user; // Attach decoded user payload
      console.log('Authenticated with JWT token (Firebase Admin not available)');
      next(); // Proceed to the protected route
    });
  }
}
```

## Step 7: Create a Firebase Service Account File

For local development, you'll need a Firebase service account file. You can download this from the Firebase Console:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the file as `config/firebase-service-account.json`

## Step 8: Update Common.js to Use Auth Service

Modify your common.js file to use the new auth service:

### File: `js/common.js` (modifications)

```javascript
// Add this import at the top of the file
import { authService } from './auth-service.js';

// Replace the checkAuthStatus function with this:
async function checkAuthStatus() {
  const authStatusElement = document.getElementById('authStatus');
  if (!authStatusElement) {
    console.warn("Auth status element not found.");
    return;
  }
  
  try {
    const user = await authService.getCurrentUser();
    
    if (user) {
      // User is logged in
      const displayName = authService.isUsingFirebaseAuth() 
        ? (user.email || 'User') 
        : 'Admin';
      
      authStatusElement.innerHTML = `
        <span>Welcome, ${displayName}!</span>
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
      // User is logged out
      authStatusElement.innerHTML = `
        <a href="login.html" class="btn btn-sm btn-outline-success">Admin Login</a>
      `;
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    authStatusElement.innerHTML = `
      <a href="login.html" class="btn btn-sm btn-outline-success">Admin Login</a>
    `;
  }
}

// Replace the handleLogout function with this:
async function handleLogout(event) {
  event.preventDefault();
  console.log("Logout clicked");
  
  try {
    await authService.logout();
    console.log("Logged out successfully");
    
    const authStatusElement = document.getElementById('authStatus');
    if (authStatusElement) {
      authStatusElement.innerHTML = `<a href="login.html" class="btn btn-sm btn-outline-success">Admin Login</a>`;
    }
    
    loadPageContent('index.html');
  } catch (error) {
    console.error('Error during logout:', error);
  }
}
```

## Step 9: Test the Integration

1. Start your local development server
2. Navigate to the login page
3. Try logging in with both authentication methods
4. Verify that protected API endpoints work with both token types

## Step 10: Commit Your Changes

```bash
# Add your changes
git add .

# Commit your changes
git commit -m "Add Firebase Auth integration alongside existing JWT auth"

# Push your changes to the feature branch
git push -u origin feature/firebase-auth
```

## Next Steps

Once you've verified that the Firebase Auth integration works alongside your existing JWT authentication, you can:

1. Create a pull request to merge the feature branch into develop
2. Test the integration in a staging environment
3. Gradually transition users to Firebase Auth
4. Eventually remove the JWT authentication code when all users have migrated

This approach allows you to safely implement Firebase Authentication without disrupting your existing users.