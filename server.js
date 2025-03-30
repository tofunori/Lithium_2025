const express = require('express');
const fs = require('fs').promises; // Use promise-based fs
const path = require('path');
const session = require('express-session'); // Import express-session
const admin = require('firebase-admin'); // Firebase Admin SDK
const multer = require('multer'); // Middleware for handling multipart/form-data (file uploads)

const app = express();
const port = 3000;
const dataFilePath = path.join(__dirname, 'data', 'facilities.json');

// --- Firebase Initialization ---
// IMPORTANT: Replace with the actual path to your service account key file
// Ensure this file is in your .gitignore and kept secure!
const serviceAccountPath = path.join(__dirname, 'config', 'leafy-bulwark-442103-e7-firebase-adminsdk-fbsvc-31a9c3e896.json');
const serviceAccount = require(serviceAccountPath);

// IMPORTANT: Replace with your actual Firebase Storage bucket name
const firebaseBucketName = 'leafy-bulwark-442103-e7.firebasestorage.app';

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: firebaseBucketName
    });
    console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    // Consider exiting the process if Firebase is essential
    // process.exit(1);
}
const bucket = admin.storage().bucket();
// --- End Firebase Initialization ---


// --- Multer Configuration (for handling file uploads in memory) ---
const storage = multer.memoryStorage(); // Store files in memory as Buffer objects
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limit file size (e.g., 10MB) - adjust as needed
});
// --- End Multer Configuration ---


// Middleware to parse JSON bodies
app.use(express.json()); // Needed for parsing link data

// Middleware to serve static files (HTML, CSS, JS, images) from the root directory
app.use(express.static(path.join(__dirname)));

// Session Configuration
app.use(session({
    secret: 'your-very-secret-key', // CHANGE THIS in a real app! Use environment variable.
    resave: false,
    saveUninitialized: false, // Don't save sessions for non-logged-in users
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Simple hardcoded credentials (replace with database lookup in real app)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password';


// Middleware function to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next(); // User is logged in, proceed to the next middleware/route handler
    }
    res.status(401).json({ message: 'Unauthorized: You must be logged in to perform this action.' });
}


// --- API Endpoints ---

// POST Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Set session variable
        req.session.user = { username: ADMIN_USERNAME };
        console.log('Login successful for user:', username);
        res.json({ success: true, message: 'Login successful' });
    } else {
        console.log('Login failed for user:', username);
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// GET Logout
app.get('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        console.log('User logged out');
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// GET Session Status
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// GET all facilities
app.get('/api/facilities', async (req, res) => {
    try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error("Error reading facility data:", err);
        res.status(500).send('Error reading facility data');
    }
});

// GET a specific facility by ID
app.get('/api/facilities/:id', async (req, res) => {
    const facilityId = req.params.id;
    try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        const facilitiesData = JSON.parse(data);
        const facility = facilitiesData.features.find(feature => feature.properties.id === facilityId);

        if (!facility) {
            return res.status(404).json({ message: `Facility with ID ${facilityId} not found.` });
        }
        res.json(facility);
    } catch (err) {
        console.error(`Error reading facility data for ID ${facilityId}:`, err);
        res.status(500).send(`Error reading facility data for ID ${facilityId}`);
    }
});

// POST (create) a new facility - Protected
app.post('/api/facilities', isAuthenticated, async (req, res) => {
    try {
        if (!req.body || !req.body.properties || !req.body.properties.name) {
            return res.status(400).json({ message: 'Missing required facility data (e.g., name).' });
        }

        const newFacilityFeature = req.body;
        const generatedId = newFacilityFeature.properties.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (!newFacilityFeature.properties.id) {
             newFacilityFeature.properties.id = generatedId;
        }
        const facilityId = newFacilityFeature.properties.id;

        if (!newFacilityFeature.geometry) {
            newFacilityFeature.geometry = { type: "Point", coordinates: [0, 0] };
        }
        // Initialize documents array if not present
        if (!newFacilityFeature.properties.documents) {
            newFacilityFeature.properties.documents = [];
        }

        const data = await fs.readFile(dataFilePath, 'utf8');
        let facilitiesData = JSON.parse(data);

        const existingIndex = facilitiesData.features.findIndex(feature => feature.properties.id === facilityId);
        if (existingIndex !== -1) {
            return res.status(409).json({ message: `Facility with ID ${facilityId} already exists.` });
        }

        facilitiesData.features.push(newFacilityFeature);
        await fs.writeFile(dataFilePath, JSON.stringify(facilitiesData, null, 2), 'utf8');

        console.log(`Facility ${facilityId} created successfully.`);
        res.status(201).json(newFacilityFeature);

    } catch (err) {
        console.error('Error creating facility:', err);
        res.status(500).send('Error creating facility');
    }
});


// PUT (update) a specific facility by ID - Protected
app.put('/api/facilities/:id', isAuthenticated, async (req, res) => {
    const facilityId = req.params.id;
    const updatedProperties = req.body;

    try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        let facilitiesData = JSON.parse(data);
        const facilityIndex = facilitiesData.features.findIndex(feature => feature.properties.id === facilityId);

        if (facilityIndex === -1) {
            return res.status(404).json({ message: `Facility with ID ${facilityId} not found.` });
        }

        // Ensure documents array exists before merging
        const existingDocuments = facilitiesData.features[facilityIndex].properties.documents || [];

        facilitiesData.features[facilityIndex].properties = {
            ...facilitiesData.features[facilityIndex].properties,
            ...updatedProperties,
            id: facilityId, // Ensure ID is not overwritten
            // Preserve documents if not included in update (important!)
            documents: updatedProperties.documents || existingDocuments
        };

        await fs.writeFile(dataFilePath, JSON.stringify(facilitiesData, null, 2), 'utf8');

        console.log(`Facility ${facilityId} updated successfully.`);
        res.json(facilitiesData.features[facilityIndex].properties);

    } catch (err) {
        console.error(`Error updating facility ${facilityId}:`, err);
        res.status(500).send(`Error updating facility ${facilityId}`);
    }
});


// --- Document/Link Management Endpoints ---

// POST Upload a document file for a specific facility
app.post('/api/facilities/:id/documents', isAuthenticated, upload.single('document'), async (req, res) => {
    const facilityId = req.params.id;

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const originalFilename = req.file.originalname;
    const destination = `${facilityId}/${originalFilename}`; // Path within the bucket

    try {
        // --- Upload to Firebase Storage ---
        const fileUpload = bucket.file(destination);
        await fileUpload.save(req.file.buffer, {
            metadata: { contentType: req.file.mimetype }
        });
        console.log(`File ${originalFilename} uploaded to Firebase Storage at ${destination}`);

        // --- Update facilities.json ---
        const data = await fs.readFile(dataFilePath, 'utf8');
        let facilitiesData = JSON.parse(data);
        const facilityIndex = facilitiesData.features.findIndex(feature => feature.properties.id === facilityId);

        if (facilityIndex === -1) {
            return res.status(404).json({ message: `Facility with ID ${facilityId} not found.` });
        }

        if (!facilitiesData.features[facilityIndex].properties.documents) {
            facilitiesData.features[facilityIndex].properties.documents = [];
        }

        // Add or update document metadata
        const existingDocIndex = facilitiesData.features[facilityIndex].properties.documents.findIndex(
            doc => doc.type === 'file' && doc.filename === originalFilename
        );
        const newDocMetadata = {
            type: 'file', // Explicitly set type
            filename: originalFilename,
            storagePath: destination,
            uploadedAt: new Date().toISOString(),
            mimetype: req.file.mimetype,
            size: req.file.size
        };

        if (existingDocIndex > -1) {
            facilitiesData.features[facilityIndex].properties.documents[existingDocIndex] = newDocMetadata;
            console.log(`Updated metadata for existing file: ${originalFilename}`);
        } else {
            facilitiesData.features[facilityIndex].properties.documents.push(newDocMetadata);
            console.log(`Added metadata for new file: ${originalFilename}`);
        }

        await fs.writeFile(dataFilePath, JSON.stringify(facilitiesData, null, 2), 'utf8');

        res.status(201).json({
            message: 'File uploaded successfully',
            documents: facilitiesData.features[facilityIndex].properties.documents
        });

    } catch (err) {
        console.error(`Error uploading file for facility ${facilityId}:`, err);
        res.status(500).json({ message: 'Error uploading file.' });
    }
});

// POST Add a website link for a specific facility
app.post('/api/facilities/:id/links', isAuthenticated, async (req, res) => {
    const facilityId = req.params.id;
    const { url, description } = req.body;

    if (!url || !description) {
        return res.status(400).json({ message: 'Missing URL or description for the link.' });
    }

    // Basic URL validation (can be improved)
    try {
        new URL(url);
    } catch (_) {
        return res.status(400).json({ message: 'Invalid URL format.' });
    }

    try {
        // --- Update facilities.json ---
        const data = await fs.readFile(dataFilePath, 'utf8');
        let facilitiesData = JSON.parse(data);
        const facilityIndex = facilitiesData.features.findIndex(feature => feature.properties.id === facilityId);

        if (facilityIndex === -1) {
            return res.status(404).json({ message: `Facility with ID ${facilityId} not found.` });
        }

        if (!facilitiesData.features[facilityIndex].properties.documents) {
            facilitiesData.features[facilityIndex].properties.documents = [];
        }

        // Add link metadata (consider checking for duplicate URLs/descriptions if needed)
        const newLinkMetadata = {
            type: 'link', // Explicitly set type
            url: url,
            description: description,
            addedAt: new Date().toISOString()
        };

        facilitiesData.features[facilityIndex].properties.documents.push(newLinkMetadata);
        console.log(`Added link '${description}' for facility ${facilityId}`);

        await fs.writeFile(dataFilePath, JSON.stringify(facilitiesData, null, 2), 'utf8');

        // Respond with the updated documents list for the facility
        res.status(201).json({
            message: 'Link added successfully',
            documents: facilitiesData.features[facilityIndex].properties.documents
        });

    } catch (err) {
        console.error(`Error adding link for facility ${facilityId}:`, err);
        res.status(500).json({ message: 'Error adding link.' });
    }
});


// GET a temporary signed URL to download/view a specific document file
// Note: This endpoint only works for type: 'file'
app.get('/api/facilities/:id/documents/:filename/url', isAuthenticated, async (req, res) => {
    const facilityId = req.params.id;
    const filename = req.params.filename;
    const storagePath = `${facilityId}/${filename}`; // Path within the bucket

    try {
        // Optional: Verify this entry exists in facilities.json and is type 'file' before checking storage
        // ... (read facilities.json, find facility, find document by filename, check type)

        const [exists] = await bucket.file(storagePath).exists();
        if (!exists) {
            console.warn(`Attempt to access non-existent file in storage: ${storagePath}`);
            return res.status(404).json({ message: 'File not found in storage.' });
        }

        const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        };

        const [url] = await bucket.file(storagePath).getSignedUrl(options);
        console.log(`Generated signed URL for ${storagePath}`);
        res.json({ url });

    } catch (err) {
        console.error(`Error generating signed URL for ${storagePath}:`, err);
        res.status(500).json({ message: 'Error generating download URL.' });
    }
});

// --- End Document/Link Management Endpoints ---


// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});