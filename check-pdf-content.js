import fs from 'fs';

console.log('🔍 ANALYZING PDF CONTENT FOR LOGO EMBEDDING');
console.log('==========================================');

// Check if logo data is actually in the PDF
const pdfFile = 'test-scenario-1-current-setup.pdf';
if (fs.existsSync(pdfFile)) {
  const pdfBuffer = fs.readFileSync(pdfFile);
  const logoBuffer = fs.readFileSync('BOI_logo.png');
  
  console.log(`PDF Size: ${pdfBuffer.length} bytes`);
  console.log(`Logo Size: ${logoBuffer.length} bytes`);
  
  // Check for PNG signature in PDF
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const pngInPdf = pdfBuffer.indexOf(pngSignature);
  
  console.log(`PNG signature found in PDF at byte: ${pngInPdf}`);
  
  // Look for image objects in PDF
  const imageObjectPattern = /\/Type\s*\/XObject[\s\S]*?\/Subtype\s*\/Image/g;
  const pdfText = pdfBuffer.toString('latin1');
  const imageObjects = pdfText.match(imageObjectPattern);
  
  console.log(`Image objects found: ${imageObjects ? imageObjects.length : 0}`);
  if (imageObjects) {
    imageObjects.forEach((obj, i) => {
      console.log(`  Image ${i + 1}: ${obj.substring(0, 100)}...`);
    });
  }
  
  // Check for specific logo content
  const logoStart = logoBuffer.slice(0, 16);
  const logoInPdf = pdfBuffer.indexOf(logoStart);
  console.log(`Logo content found in PDF at: ${logoInPdf}`);
  
} else {
  console.log('❌ Test PDF file not found');
}

// Now check the actual production PDF
console.log('\n🔍 CHECKING PRODUCTION PDF STRUCTURE');
const prodPdfPattern = /TransferConfirmation-.*\.pdf/;
const files = fs.readdirSync('.');
const prodPdf = files.find(f => prodPdfPattern.test(f));

if (prodPdf) {
  console.log(`Found production PDF: ${prodPdf}`);
  // We can't read this as it's likely been sent via email
} else {
  console.log('No production PDF found locally');
}