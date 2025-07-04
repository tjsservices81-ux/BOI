import fs from 'fs';
import PDFDocument from 'pdfkit';

console.log('🔍 DEEP PNG FILE ANALYSIS');
console.log('========================');

const logoPath = 'BOI_logo.png';
const logoBuffer = fs.readFileSync(logoPath);

console.log(`File size: ${logoBuffer.length} bytes`);
console.log(`PNG signature: ${logoBuffer.slice(0, 8).toString('hex')}`);

// Check PNG chunks
let offset = 8; // Skip PNG signature
console.log('\nPNG Chunks:');

while (offset < logoBuffer.length - 8) {
  const chunkLength = logoBuffer.readUInt32BE(offset);
  const chunkType = logoBuffer.slice(offset + 4, offset + 8).toString('ascii');
  
  console.log(`  ${chunkType}: ${chunkLength} bytes at offset ${offset}`);
  
  if (chunkType === 'IHDR') {
    const width = logoBuffer.readUInt32BE(offset + 8);
    const height = logoBuffer.readUInt32BE(offset + 12);
    const bitDepth = logoBuffer.readUInt8(offset + 16);
    const colorType = logoBuffer.readUInt8(offset + 17);
    console.log(`    Dimensions: ${width}x${height}`);
    console.log(`    Bit depth: ${bitDepth}, Color type: ${colorType}`);
  }
  
  offset += 8 + chunkLength + 4; // chunk header + data + CRC
  
  if (offset >= logoBuffer.length) break;
}

// Test if PDFKit can handle different image formats
console.log('\n🔍 TESTING PDFKIT IMAGE COMPATIBILITY');

// Test 1: Try the original PNG
console.log('\nTest 1: Original PNG');
try {
  const doc1 = new PDFDocument();
  const chunks1 = [];
  doc1.on('data', chunks1.push.bind(chunks1));
  doc1.on('end', () => {
    const buffer = Buffer.concat(chunks1);
    console.log(`  Result: Success, PDF size: ${buffer.length} bytes`);
  });
  
  doc1.image(logoPath, 50, 50, { width: 100 });
  doc1.text('Test with original PNG', 50, 200);
  doc1.end();
  
} catch (error) {
  console.log(`  Error: ${error.message}`);
}

// Test 2: Check what happens with a simple shape instead
console.log('\nTest 2: Simple shapes only');
try {
  const doc2 = new PDFDocument();
  const chunks2 = [];
  doc2.on('data', chunks2.push.bind(chunks2));
  doc2.on('end', () => {
    const buffer = Buffer.concat(chunks2);
    console.log(`  Result: Success, PDF size: ${buffer.length} bytes`);
  });
  
  // Draw a blue rectangle where logo should be
  doc2.rect(50, 50, 160, 50)
     .fill('#1a5490');
  
  doc2.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor('#ffffff')
     .text('BOI LOGO AREA', 55, 70);
  
  doc2.text('Test without image', 50, 200);
  doc2.end();
  
} catch (error) {
  console.log(`  Error: ${error.message}`);
}

console.log('\n✅ PNG ANALYSIS COMPLETE');