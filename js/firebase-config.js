// Firebase configuration
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAxKoyOLiNvBxHFFIs-M6lBs_cfcVvWR0Y",
  authDomain: "leafy-bulwark-442103-e7.firebaseapp.com",
  databaseURL: "https://leafy-bulwark-442103-e7-default-rtdb.firebaseio.com", // Added databaseURL if needed, otherwise can be removed
  projectId: "leafy-bulwark-442103-e7",
  storageBucket: "leafy-bulwark-442103-e7.firebasestorage.app",
  messagingSenderId: "700446305381",
  appId: "1:700446305381:web:dd9c60cdf042ddba2eaa8c",
  measurementId: "G-574JWJ4QTZ" // Added measurementId if needed, otherwise can be removed
};

// Export the config
export const getFirebaseConfig = () => firebaseConfig;