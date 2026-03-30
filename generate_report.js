import fs from 'fs';
import htmlToDocx from 'html-to-docx';

async function generateReport() {
  console.log('Reading source files to include in report...');
  
  const readSafe = (path) => {
    try { return fs.readFileSync(path, 'utf8').replace(/</g, '&lt;').replace(/>/g, '&gt;'); } 
    catch(e) { return '// File not found'; }
  };
  
  const serverCode = readSafe('server.ts');
  const appCode = readSafe('src/App.tsx');
  const homeCode = readSafe('src/pages/Home.tsx');
  const navCode = readSafe('src/components/Navbar.tsx');
  const seatCode = readSafe('src/pages/SeatSelection.tsx');

  console.log('Constructing robust 45-page HTML academic structure...');

  let htmlContent = fs.readFileSync('report_template.html', 'utf8');
  
  // Source code injection removed as per pure-theory request
  // The placeholders are no longer in the template


  console.log('Generating Microsoft Word (.docx) file from comprehensive HTML payload...');
  try {
    const buffer = await htmlToDocx(htmlContent, {
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1-inch margins
      title: 'Cineverse Project Report',
      orientation: 'portrait'
    });

    fs.writeFileSync('Cineverse_Project_Report_v4.docx', buffer);
    console.log('SUCCESS! Cineverse_Project_Report_v4.docx has been created.');
  } catch (err) {
    console.error('Failed to generate DOCX file:', err);
  }
}

generateReport();
