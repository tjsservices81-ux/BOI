import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

console.log('🔍 DEBUGGING PDF STRUCTURE AND LOGO POSITIONING');
console.log('===============================================');

// Test different margin and positioning scenarios
const scenarios = [
  { name: 'Current Setup', margin: 60, logoX: 40, logoY: 40 },
  { name: 'No Margin Logo', margin: 60, logoX: 70, logoY: 70 },
  { name: 'Zero Margin', margin: 0, logoX: 40, logoY: 40 },
  { name: 'Large Logo', margin: 60, logoX: 70, logoY: 70 }
];

async function testScenario(scenario, index) {
  console.log(`\n${index + 1}. TESTING: ${scenario.name}`);
  console.log(`   Margin: ${scenario.margin}, Logo at (${scenario.logoX}, ${scenario.logoY})`);
  
  const doc = new PDFDocument({ 
    margin: scenario.margin,
    size: 'A4'
  });
  
  const chunks = [];
  doc.on('data', chunks.push.bind(chunks));
  
  return new Promise((resolve) => {
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const filename = `test-scenario-${index + 1}-${scenario.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      fs.writeFileSync(filename, buffer);
      console.log(`   ✅ Saved: ${filename} (${buffer.length} bytes)`);
      resolve(buffer);
    });
    
    // Add page background for reference
    doc.rect(0, 0, 595, 842).stroke('#f0f0f0');
    
    // Mark margins
    if (scenario.margin > 0) {
      doc.rect(scenario.margin, scenario.margin, 
               595 - (scenario.margin * 2), 
               842 - (scenario.margin * 2))
         .stroke('#ff0000');
    }
    
    // Try to embed logo
    const logoPath = path.join(process.cwd(), 'BOI_logo.png');
    console.log(`   Logo exists: ${fs.existsSync(logoPath)}`);
    
    if (fs.existsSync(logoPath)) {
      try {
        // Add a background rectangle first
        doc.rect(scenario.logoX - 5, scenario.logoY - 5, 170, 60)
           .fill('#ffff00');
        
        // Embed logo
        doc.image(logoPath, scenario.logoX, scenario.logoY, { 
          width: 160
        });
        console.log(`   ✅ Logo embedded at (${scenario.logoX}, ${scenario.logoY})`);
        
        // Add border after logo
        doc.rect(scenario.logoX - 2, scenario.logoY - 2, 164, 54)
           .stroke('#0000ff');
           
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Add text below
    doc.font('Helvetica-Bold')
       .fontSize(16)
       .fillColor('#000000')
       .text(`Test: ${scenario.name}`, scenario.logoX, scenario.logoY + 80);
    
    doc.end();
  });
}

// Run all scenarios
async function runAllTests() {
  for (let i = 0; i < scenarios.length; i++) {
    await testScenario(scenarios[i], i);
  }
  
  console.log('\n🔍 ADDITIONAL LOGO FILE ANALYSIS:');
  const logoPath = path.join(process.cwd(), 'BOI_logo.png');
  
  if (fs.existsSync(logoPath)) {
    const stats = fs.statSync(logoPath);
    console.log(`   File size: ${stats.size} bytes`);
    console.log(`   File path: ${logoPath}`);
    console.log(`   Readable: ${fs.constants.R_OK}`);
    
    // Try to read first few bytes
    const buffer = fs.readFileSync(logoPath);
    console.log(`   PNG signature: ${buffer.slice(0, 8).toString('hex')}`);
    console.log(`   Should be: 89504e470d0a1a0a for valid PNG`);
  }
  
  console.log('\n✅ ALL TESTS COMPLETED - Check generated PDF files');
}

runAllTests().catch(console.error);