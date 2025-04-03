// Import necessary Firebase and Express modules
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors"); // Import cors

// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore(); // Get Firestore instance

// Create an Express app
const app = express();

// --- Middleware ---
// Automatically allow cross-origin requests
app.use(cors({ origin: true }));
// Parse JSON request bodies
app.use(express.json());

// --- Routes ---

// GET /facilities - Retrieve all facilities in GeoJSON format
app.get("/facilities", async (req, res) => {
  try {
    console.log("API endpoint /facilities called");
    const snapshot = await db.collection("facilities").get();
    console.log(`Found ${snapshot.docs.length} facilities in Firestore`);
    
    const features = snapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure we return the data in the expected GeoJSON format
      return {
        type: data.type || "Feature",
        properties: data.properties || {},
        geometry: data.geometry || {}
      };
    });
    
    console.log(`Mapped ${features.length} features from Firestore data`);
    
    // Return in GeoJSON FeatureCollection format
    const response = {
      type: "FeatureCollection",
      features: features
    };
    console.log(`Sending response with ${features.length} features`);
    res.status(200).json(response);
  } catch (error) {
    console.error("Error getting facilities:", error);
    res.status(500).json({ error: "Failed to retrieve facilities", details: error.message });
  }
});
// GET /facilities/:id - Retrieve a specific facility
app.get("/facilities/:id", async (req, res) => {
    const facilityId = req.params.id;
    console.log(`API endpoint /facilities/${facilityId} called`);
    try {
        const docRef = db.collection("facilities").doc(facilityId);
        const doc = await docRef.get();
        if (!doc.exists) {
            console.log(`Facility with ID ${facilityId} not found.`);
            return res.status(404).json({ error: `Facility with ID ${facilityId} not found.` });
        }
        
        // Get the data and ensure it's in the expected GeoJSON format
        const data = doc.data();
        const response = {
            type: data.type || "Feature",
            properties: data.properties || {},
            geometry: data.geometry || {}
        };
        
        console.log(`Sending facility data for ID: ${facilityId}`);
        res.status(200).json(response);
    } catch (error) {
        console.error(`Error getting facility ${facilityId}:`, error);
        res.status(500).json({ error: `Failed to retrieve facility ${facilityId}`, details: error.message });
    }
});


// GET /doc_items - Retrieve document items based on parentId
app.get("/doc_items", async (req, res) => {
  const parentId = req.query.parentId;
  console.log(`API endpoint /doc_items called with parentId: ${parentId}`);

  if (!parentId) {
    return res.status(400).json({ error: "parentId query parameter is required." });
  }

  try {
    let query = db.collection("doc_items");

    // Firestore requires using '==' for equality checks.
    // If parentId is 'root', we query for items where parentId is null or 'root'
    // (adjust based on how root items are actually stored)
    // For simplicity now, let's assume 'root' is stored directly.
    query = query.where("parentId", "==", parentId);

    const snapshot = await query.get();
    console.log(`Found ${snapshot.docs.length} doc_items for parentId: ${parentId}`);

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(items);
  } catch (error) {
    console.error(`Error getting doc_items for parentId ${parentId}:`, error);
    res.status(500).json({ error: `Failed to retrieve document items for parent ${parentId}`, details: error.message });
  }
});



// PUT /facilities/:id - Update a specific facility
app.put("/facilities/:id", async (req, res) => {
  const facilityId = req.params.id;
  const updatedData = req.body;

  // Basic validation: Check if request body exists
  if (!updatedData || Object.keys(updatedData).length === 0) {
    return res.status(400).json({ error: "Request body cannot be empty." });
  }

  try {
    const docRef = db.collection("facilities").doc(facilityId);

    // Check if the document exists before trying to update
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: `Facility with ID ${facilityId} not found.` });
    }

    // Perform the update
    // Using update() is generally safer than set() with merge:true
    // as it fails if the document doesn't exist.
    await docRef.update(updatedData);

    console.log(`Successfully updated facility: ${facilityId}`);
    // Optionally return the updated data or just a success status
    // Fetching the updated doc again to return it:
    const updatedDoc = await docRef.get();
    res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
    // Or send No Content status:
    // res.status(204).send();

  } catch (error) {
    console.error(`Error updating facility ${facilityId}:`, error);
    // Handle potential errors during update
    res.status(500).json({ error: `Failed to update facility ${facilityId}`, details: error.message });
  }
});

// --- Export the Express app as a Cloud Function ---
// All requests to /api/* will be handled by the Express app
exports.api = functions.https.onRequest(app);


// --- Existing setAdminClaim function (kept separate for now) ---
/**
 * HTTP-triggered Cloud Function to set a custom 'admin' claim on a Firebase user.
 * Expects a POST request with a JSON body containing the user's email:
 * { "email": "user@example.com" }
 */
exports.setAdminClaim = functions.https.onRequest(async (req, res) => {
  // --- IMPORTANT SECURITY NOTE ---
  // This function is a basic example and lacks proper security checks.
  // In a production environment, you MUST verify that the caller of this function
  // has the necessary permissions to grant admin privileges.
  // For example, check if the request comes from an already authenticated admin user.
  // DO NOT deploy this function as-is to production without adding security rules.
  // ---

  // Check if the request method is POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Get the email from the request body
  const email = req.body.email;

  if (!email) {
    return res.status(400).json({ error: "Email is required in the request body" });
  }

  try {
    // Get the user record by email
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;

    // Set the custom claim { admin: true }
    await admin.auth().setCustomUserClaims(uid, { admin: true });

    // Send success response
    console.log(`Successfully set admin claim for user: ${email} (UID: ${uid})`);
    return res.status(200).json({ message: `Successfully set admin claim for ${email}` });

  } catch (error) {
    // Handle errors (e.g., user not found, permission issues)
    console.error("Error setting custom claim:", error);
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: `User with email ${email} not found.` });
    }
    // General error
    return res.status(500).json({ error: "Failed to set custom claim", details: error.message });
  }
});