const fs = require('fs').promises;
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const VIEWS_DIR = path.join(SRC_DIR, 'views');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');

// Files in src/ to explicitly ignore
const IGNORE_JS_FILES = new Set([
  'main.js',
  'firebase-config.js',
  'common.js',
  'facilityData.js',
  // Add any other known essential JS files here
]);

// Function to list files in a directory recursively or non-recursively
async function listFiles(dir, recursive = false, fileList = []) {
  try {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const res = path.resolve(dir, dirent.name);
      if (dirent.isDirectory() && recursive) {
        await listFiles(res, recursive, fileList);
      } else if (dirent.isFile()) {
        fileList.push(res);
      }
    }
    return fileList;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Warning: Directory not found: ${dir}. Skipping.`);
      return []; // Return empty array if directory doesn't exist
    }
    throw error; // Re-throw other errors
  }
}

// Function to get the base name for comparison (removes extension, common suffixes, and hyphens)
function getBaseName(filePath) {
  let name = path.basename(filePath, path.extname(filePath));
  // Remove common suffixes (case-insensitive)
  name = name.replace(/-page$/i, '')
             .replace(/-view$/i, '')
             .replace(/View$/i, '')
             .replace(/Component$/i, '');
  // Remove hyphens and convert to lowercase for consistent comparison
  name = name.replace(/-/g, '').toLowerCase();
  return name;
}

async function findLegacyJsFiles() {
  console.log('Searching for legacy JavaScript files...');

  // 1. Get Vue component/view base names
  const vueViewFiles = await listFiles(VIEWS_DIR);
  const vueComponentFiles = await listFiles(COMPONENTS_DIR, true); // Search components recursively
  const vueFiles = [...vueViewFiles, ...vueComponentFiles];
  const vueBaseNames = new Set(vueFiles.filter(f => f.endsWith('.vue')).map(getBaseName));
  console.log(`Found ${vueBaseNames.size} unique Vue component/view base names.`);

  // 2. Get JS files directly in src/
  const srcFiles = await listFiles(SRC_DIR);
  const srcJsFiles = srcFiles.filter(f => f.endsWith('.js') && path.dirname(f) === SRC_DIR);
  console.log(`Found ${srcJsFiles.length} JavaScript files directly in src/.`);

  // 3. Compare and identify potential legacy files
  const legacyFiles = [];
  for (const jsFile of srcJsFiles) {
    const jsFileName = path.basename(jsFile);
    if (IGNORE_JS_FILES.has(jsFileName)) {
      continue; // Skip explicitly ignored files
    }

    const jsBaseName = getBaseName(jsFile);
    if (vueBaseNames.has(jsBaseName)) {
      legacyFiles.push(jsFile);
    }
  }

  // 4. Output results
  if (legacyFiles.length > 0) {
    console.log('\nPotential legacy JavaScript files found in src/ (verify before deleting):');
    legacyFiles.forEach(file => console.log(`- ${path.relative(path.join(__dirname, '..'), file)}`));
    console.log('\nRecommendation: Review these files and delete them if they are no longer needed.');
  } else {
    console.log('\nNo obvious legacy JavaScript files found in src/ based on matching Vue component names.');
  }
}

findLegacyJsFiles().catch(err => {
  console.error('Error finding legacy JS files:', err);
  process.exit(1);
});