const express = require('express');
const fs = require('fs').promises; // Use promise-based fs
const path = require('path');
const session = require('express-session'); // Import express-session

const app = express();
const port = 3000;
const dataFilePath = path.join(__dirname, 'data', 'facilities.json');

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to serve static files (HTML, CSS, JS, images) from the root directory
app.use(express.static(path.join(__dirname)));

// Session Configuration
app.use(session({
    secret: 'your-very-secret-key', // CHANGE THIS in a real app!
    resave: false,
    saveUninitialized: false, // Don't save sessions for non-logged-in users
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Simple hardcoded credentials (replace with database lookup in real app)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password';


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
        // Return the whole feature object (including geometry) or just properties?
        // Let's return the whole feature for now, frontend can decide what to use.
        res.json(facility);
    } catch (err) {
        console.error(`Error reading facility data for ID ${facilityId}:`, err);
        res.status(500).send(`Error reading facility data for ID ${facilityId}`);
    }
});

// POST (create) a new facility - Protected
app.post('/api/facilities', isAuthenticated, async (req, res) => {
    try {
        // Basic validation (add more as needed)
        if (!req.body || !req.body.properties || !req.body.properties.name) {
            return res.status(400).json({ message: 'Missing required facility data (e.g., name).' });
        }

        const newFacilityFeature = req.body; // Assuming the body is a valid GeoJSON Feature object

        // Generate a simple ID from the name (can be improved)
        const generatedId = newFacilityFeature.properties.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (!newFacilityFeature.properties.id) {
             newFacilityFeature.properties.id = generatedId;
        }
        const facilityId = newFacilityFeature.properties.id;

        // Ensure geometry exists (even if basic)
        if (!newFacilityFeature.geometry) {
            newFacilityFeature.geometry = { type: "Point", coordinates: [0, 0] }; // Default coordinates
        }

        // Read current data
        const data = await fs.readFile(dataFilePath, 'utf8');
        let facilitiesData = JSON.parse(data);

        // Check if ID already exists
        const existingIndex = facilitiesData.features.findIndex(feature => feature.properties.id === facilityId);
        if (existingIndex !== -1) {
            // If ID exists, maybe generate a slightly different one? Or return error.
            // For now, return error.
            return res.status(409).json({ message: `Facility with ID ${facilityId} already exists.` });
        }

        // Add the new facility feature
        facilitiesData.features.push(newFacilityFeature);

        // Write updated data back
        await fs.writeFile(dataFilePath, JSON.stringify(facilitiesData, null, 2), 'utf8');

        console.log(`Facility ${facilityId} created successfully.`);
        res.status(201).json(newFacilityFeature); // Respond with the created facility data

    } catch (err) {
        console.error('Error creating facility:', err);
        res.status(500).send('Error creating facility');
    }
});


// Middleware function to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next(); // User is logged in, proceed to the next middleware/route handler
    }
    res.status(401).json({ message: 'Unauthorized: You must be logged in to perform this action.' });
}

// PUT (update) a specific facility by ID - Protected
app.put('/api/facilities/:id', isAuthenticated, async (req, res) => { // Added isAuthenticated middleware
    const facilityId = req.params.id;
    // Assuming the request body contains the updated 'properties' object
    const updatedProperties = req.body;

    try {
        // Read the existing data
        const data = await fs.readFile(dataFilePath, 'utf8');
        let facilitiesData = JSON.parse(data);

        // Find the index of the facility to update
        const facilityIndex = facilitiesData.features.findIndex(feature => feature.properties.id === facilityId);

        if (facilityIndex === -1) {
            return res.status(404).json({ message: `Facility with ID ${facilityId} not found.` });
        }

        // Update the properties of the found facility
        // Merge existing properties with updated ones to avoid losing unchanged fields
        // Ensure the ID remains unchanged even if sent in the body
        facilitiesData.features[facilityIndex].properties = {
            ...facilitiesData.features[facilityIndex].properties, // Keep existing properties
            ...updatedProperties,                                // Apply updates
            id: facilityId                                       // Ensure ID is not overwritten
        };

        // Write the updated data back to the file
        await fs.writeFile(dataFilePath, JSON.stringify(facilitiesData, null, 2), 'utf8'); // Pretty print JSON

        console.log(`Facility ${facilityId} updated successfully.`);
        // Send back the updated facility properties
        res.json(facilitiesData.features[facilityIndex].properties);

    } catch (err) {
        console.error(`Error updating facility ${facilityId}:`, err);
        res.status(500).send(`Error updating facility ${facilityId}`);
    }
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});