const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const lenisScript = '<script src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js"></script>';

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('lenis.min.js')) {
    content = content.replace(/<\/head>/i, match => lenisScript + '\n' + match);
    fs.writeFileSync(file, content);
    console.log('Added Lenis to ' + file);
  }
});
