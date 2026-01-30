const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Create a simple gradient icon with "GF" text (Gemini Files)
async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${size * 0.4}"
        font-weight="bold"
        fill="white"
      >GF</text>
    </svg>
  `;

  const buffer = Buffer.from(svg);
  
  await sharp(buffer)
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, `icon-${size}.png`));
  
  console.log(`✓ Generated icon-${size}.png`);
}

// Generate maskable icons (with padding for safe zone)
async function generateMaskableIcon(size) {
  const padding = size * 0.1; // 10% padding for safe zone
  const innerSize = size - (padding * 2);
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad)"/>
      <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" fill="rgba(255,255,255,0.2)" rx="${innerSize * 0.15}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${size * 0.35}"
        font-weight="bold"
        fill="white"
      >GF</text>
    </svg>
  `;

  const buffer = Buffer.from(svg);
  
  await sharp(buffer)
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, `icon-${size}-maskable.png`));
  
  console.log(`✓ Generated icon-${size}-maskable.png`);
}

// Generate favicon
async function generateFavicon() {
  const svg = `
    <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" fill="url(#grad)" rx="5"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="18"
        font-weight="bold"
        fill="white"
      >G</text>
    </svg>
  `;

  const buffer = Buffer.from(svg);
  
  await sharp(buffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  
  console.log('✓ Generated favicon.png');
}

// Generate placeholder screenshots
async function generateScreenshot(width, height, name) {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#4f46e5;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
      <text
        x="50%"
        y="40%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${width * 0.06}"
        font-weight="bold"
        fill="white"
      >Gemini Files</text>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${width * 0.03}"
        fill="rgba(255,255,255,0.9)"
      >AI-Powered Multi-Modal Analysis</text>
      <text
        x="50%"
        y="60%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${width * 0.025}"
        fill="rgba(255,255,255,0.7)"
      >Videos • Images • Audio • PDFs • Documents</text>
    </svg>
  `;

  const buffer = Buffer.from(svg);
  
  await sharp(buffer)
    .resize(width, height)
    .png()
    .toFile(path.join(publicDir, name));
  
  console.log(`✓ Generated ${name}`);
}

async function main() {
  console.log('🎨 Generating PWA icons and assets...\n');

  try {
    // Generate standard icons
    await generateIcon(192);
    await generateIcon(512);
    
    // Generate favicon
    await generateFavicon();
    
    // Generate screenshots
    await generateScreenshot(1280, 720, 'screenshot-wide.png');
    await generateScreenshot(750, 1334, 'screenshot-narrow.png');
    
    console.log('\n✅ All PWA assets generated successfully!');
    console.log('\nGenerated files:');
    console.log('  - icon-192.png');
    console.log('  - icon-512.png');
    console.log('  - favicon.png');
    console.log('  - screenshot-wide.png');
    console.log('  - screenshot-narrow.png');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

main();
