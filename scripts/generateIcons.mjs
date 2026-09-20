import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
const svgPath = path.join(publicDir, 'icon.svg');

async function run() {
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Generate 32x32 PNG for favicon.ico
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();

  // Construct standard single-image PNG ICO format (widely supported by Chrome, Edge, Safari, Firefox)
  // Header: 6 bytes
  const icoHeader = Buffer.from([
    0x00, 0x00, // Reserved
    0x01, 0x00, // Type 1 = ICO
    0x01, 0x00, // 1 image
  ]);

  // Directory entry: 16 bytes
  const icoDir = Buffer.alloc(16);
  icoDir.writeUInt8(32, 0);                 // Width: 32
  icoDir.writeUInt8(32, 1);                 // Height: 32
  icoDir.writeUInt8(0, 2);                  // Color count (0 = 256+)
  icoDir.writeUInt8(0, 3);                  // Reserved
  icoDir.writeUInt16LE(1, 4);               // Color planes
  icoDir.writeUInt16LE(32, 6);              // Bits per pixel
  icoDir.writeUInt32LE(png32.length, 8);    // Size of image data
  icoDir.writeUInt32LE(22, 12);             // Offset of image data (6 + 16 = 22)

  const icoBuffer = Buffer.concat([icoHeader, icoDir, png32]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  // Also write to app/favicon.ico for Next.js app directory conventions
  fs.writeFileSync(path.resolve(process.cwd(), 'app/favicon.ico'), icoBuffer);

  console.log('✓ Generated public/favicon.ico & app/favicon.ico (' + icoBuffer.length + ' bytes)');

  // 2. Generate Apple Touch Icon (180x180)
  const appleTouch = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);
  console.log('✓ Generated public/apple-touch-icon.png (180x180)');

  // 3. Generate icon-192.png & icon-512.png for PWA / Manifest
  const icon192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

  const icon512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

  console.log('✓ Generated public/icon-192.png & public/icon-512.png');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
