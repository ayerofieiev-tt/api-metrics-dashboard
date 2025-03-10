const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputSvg = path.join(__dirname, 'public', 'api-icon.svg');
const outputDir = path.join(__dirname, 'public');

// Read the SVG file
const svgBuffer = fs.readFileSync(inputSvg);

// Create favicon.ico (64x64)
sharp(svgBuffer)
  .resize(64, 64)
  .toFile(path.join(outputDir, 'favicon.ico'))
  .then(() => console.log('Created favicon.ico'))
  .catch(err => console.error('Error creating favicon.ico:', err));

// Create logo192.png (192x192)
sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(path.join(outputDir, 'logo192.png'))
  .then(() => console.log('Created logo192.png'))
  .catch(err => console.error('Error creating logo192.png:', err));

// Create logo512.png (512x512)
sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(path.join(outputDir, 'logo512.png'))
  .then(() => console.log('Created logo512.png'))
  .catch(err => console.error('Error creating logo512.png:', err));