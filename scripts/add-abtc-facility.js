// scripts/add-abtc-facility.js
// Script to add the ABTC Nevada facility to Firestore

const admin = require('firebase-admin');
const path = require('path');

// --- Firebase Initialization (Copy from migrate-to-firestore.js) ---
let serviceAccount;
const firebaseBucketName = process.env.FIREBASE_STORAGE_BUCKET || 'leafy-bulwark-442103-e7.firebasestorage.app'; // Match your project

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("Attempting Firebase init via environment variable...");
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error("FATAL ERROR: Could not parse FIREBASE_SERVICE_ACCOUNT environment variable.", e);
        process.exit(1);
    }
} else {
    console.log("Attempting Firebase init via local file...");
    // Adjust path relative to THIS script file's location
    const serviceAccountPath = path.join(__dirname, '..', 'config', 'leafy-bulwark-442103-e7-firebase-adminsdk-fbsvc-31a9c3e896.json');
    try {
        serviceAccount = require(serviceAccountPath);
    } catch (e) {
        console.error(`FATAL ERROR: Could not load local service account file at ${serviceAccountPath}. Ensure the file exists and path is correct.`, e);
        process.exit(1);
    }
}

if (serviceAccount) {
    try {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: firebaseBucketName // Optional here, but good practice
            });
            console.log('Firebase Admin SDK initialized successfully.');
        } else {
            console.log('Firebase Admin SDK already initialized.');
        }
    } catch (error) {
        console.error('Error initializing Firebase Admin SDK:', error);
        process.exit(1);
    }
} else {
     console.error("FATAL ERROR: Firebase Service Account could not be loaded.");
     process.exit(1);
}
const db = admin.firestore();
// --- End Firebase Initialization ---

// Define the ABTC Nevada facility data
const abtcFacility = {
    type: "Feature",
    properties: {
        id: "abtc-nevada",
        name: "ABTC Nevada Recycling Plant",
        company: "American Battery Technology Company",
        address: "2500 Peru Drive, McCarran, NV 89437",
        status: "Operating",
        capacity: "20,000 tonnes per year",
        technology: "Universal Li-ion recycling (recovers Li, Co, Ni, Mn)",
        description: "ABTC's Nevada facility uses a hydrometallurgical process to recycle lithium-ion batteries and extract critical minerals.",
        website: "https://americanbatterytechnology.com/",
        yearStarted: "2021",
        region: "West",
        country: "USA",
        companyLogo: "images/logos/abtc.png",
        facilityImage: "images/facilities/abtc-nevada.jpg",
        timeline: [
            {
                "year": "2020",
                "event": "Facility planning and design"
            },
            {
                "year": "2021",
                "event": "Initial operations began"
            },
            {
                "year": "2022",
                "event": "Expanded capacity"
            }
        ],
        feedstock: "End-of-life lithium-ion batteries and manufacturing scrap",
        products: "Battery-grade materials (lithium, cobalt, nickel, manganese)",
        fundingSource: "Private investment, DOE grant"
    },
    geometry: {
        type: "Point",
        coordinates: [
            -119.6012,
            39.5527
        ]
    }
};

// Create a root folder for the facility's filesystem
const rootFolderId = `root-abtc-nevada`;
const filesystem = {};

// Create root folder metadata
filesystem[rootFolderId] = {
    id: rootFolderId,
    type: 'folder',
    name: '/',
    parentId: null,
    createdAt: new Date().toISOString(),
    children: []
};

// Add the filesystem to the facility data
abtcFacility.properties.filesystem = filesystem;

// Add the facility to Firestore
async function addAbtcFacility() {
    try {
        await db.collection("facilities").doc("abtc-nevada").set(abtcFacility);
        console.log("Successfully added ABTC Nevada facility to Firestore");
    } catch (error) {
        console.error("Error adding ABTC Nevada facility:", error);
    }
}

// Run the function
addAbtcFacility().then(() => {
    console.log("Script completed");
    process.exit(0);
}).catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
});