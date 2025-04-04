// Import Firebase functions directly from CDN ES Module URLs
// Using a recent version (e.g., 10.12.2) - update if needed based on installed version
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { getFirebaseConfig } from '../firebase-config.js'; // Adjusted path

// Initialize Firebase
const app = initializeApp(getFirebaseConfig());
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

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
    // Reload the page to apply the change consistently
    window.location.reload(); 
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
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
          async user => { // Make the callback async
            unsubscribe();
            if (user) {
              // If user is logged in, fetch their role from Firestore
              try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                let role = 'viewer'; // Default role if not found or field missing
                if (userDocSnap.exists()) {
                  role = userDocSnap.data().role || role;
                } else {
                  console.warn(`User document not found in Firestore for UID: ${user.uid}. Assigning default role.`);
                }
                // Return user object with role included
                resolve({ ...user, role: role });
              } catch (firestoreError) {
                console.error("Error fetching user role from Firestore:", firestoreError);
                // Resolve with user but without role, or reject? Decide based on desired behavior.
                // For now, resolve with user and default role on error.
                resolve({ ...user, role: 'viewer' });
              }
            } else {
              // User is logged out
              resolve(null);
            }
          },
          error => { // Error during initial auth state check
            reject(error);
          }
        );
      });
    } else {
      // Check for JWT token
      const token = localStorage.getItem('authToken');
      // Return a consistent structure, even if it's just the token
      // Return a consistent structure, potentially including a default role for JWT admin?
      // For now, just return token info or null. Role logic for JWT is handled in backend middleware.
      return Promise.resolve(token ? { token: token, role: 'admin' } : null); // Assume JWT token implies admin for frontend simplicity
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