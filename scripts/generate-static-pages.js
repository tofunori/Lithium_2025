// scripts/generate-static-pages.js
// Script to generate static HTML files for all facilities and save them to public/facilities/

const fs = require('fs').promises;
const path = require('path');
const { generateFacilityPageHTML } = require('../api/page-generator');

// Path to the facilities data file
const dataFilePath = path.join(__dirname, '..', 'data', 'facilities.json');
// Output directory for the generated HTML files
const outputDir = path.join(__dirname, '..', 'public', 'facilities');

async function generateStaticPages() {
    console.log('Starting static facility page generation...');
    
    try {
        // Ensure the output directory exists
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`Ensured output directory exists: ${outputDir}`);
        
        // Read the facilities data
        const jsonData = await fs.readFile(dataFilePath, 'utf8');
        const facilitiesData = JSON.parse(jsonData);
        
        if (!facilitiesData || !facilitiesData.features || !Array.isArray(facilitiesData.features)) {
            throw new Error('Invalid data format in facilities.json. Expected { "type": "FeatureCollection", "features": [...] }');
        }
        
        console.log(`Found ${facilitiesData.features.length} facilities to process.`);
        
        // Process each facility
        for (const feature of facilitiesData.features) {
            const props = feature.properties;
            
            // Basic check for essential props like id and name
            if (!props || !props.id || !props.name) {
                console.warn("Skipping feature due to missing id or name:", feature);
                continue; // Skip this feature
            }
            
            const facilityId = props.id;
            console.log(`Processing facility: ${props.name} (ID: ${facilityId})...`);
            
            // Find related facilities (same company, different ID)
            const relatedFacilitiesProps = facilitiesData.features
                .filter(f => f.properties.company === props.company && f.properties.id !== facilityId)
                .map(f => ({
                    id: f.properties.id,
                    name: f.properties.name || 'Unnamed Facility'
                }));
            
            // Generate HTML content using the imported function
            const html = generateFacilityPageHTML(props, relatedFacilitiesProps);
            
            // Write the HTML content to a file
            const outputPath = path.join(outputDir, `${facilityId}.html`);
            await fs.writeFile(outputPath, html, 'utf8');
            
            console.log(`Generated and saved: ${outputPath}`);
        }
        
        console.log('\nAll pages generated successfully!');
        console.log(`Output directory: ${outputDir}`);
        
    } catch (error) {
        console.error('Error generating static pages:', error);
        process.exit(1);
    }
}

// Run the function
generateStaticPages();