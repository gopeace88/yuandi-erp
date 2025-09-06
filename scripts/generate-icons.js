const fs = require('fs');
const path = require('path');

// SVG template for the icon
const createSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb"/>
  <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="${size/4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">
    YUANDI
  </text>
  <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="${size/6}" fill="white" text-anchor="middle" dominant-baseline="middle">
    ERP
  </text>
</svg>
`;

// Generate icons
const sizes = [192, 512];

sizes.forEach(size => {
  const svg = createSVG(size);
  const fileName = `icon-${size}x${size}.svg`;
  const filePath = path.join(__dirname, '..', 'public', fileName);
  
  fs.writeFileSync(filePath, svg);
  console.log(`Generated ${fileName}`);
});

// Also create a simple PNG placeholder using data URL
const createPlaceholderPNG = () => {
  // 1x1 blue pixel as base64
  const bluePixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  
  [192, 512].forEach(size => {
    const fileName = `icon-${size}x${size}.png`;
    const filePath = path.join(__dirname, '..', 'public', fileName);
    
    fs.writeFileSync(filePath, Buffer.from(bluePixel, 'base64'));
    console.log(`Generated placeholder ${fileName}`);
  });
};

createPlaceholderPNG();

console.log('Icon generation complete!');