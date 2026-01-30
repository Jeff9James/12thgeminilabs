const fs = require('fs');
const path = require('path');

function cleanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const cleaned = lines.filter(line => {
      const trimmed = line.trim();
      return !(
        trimmed.startsWith('<<<<<<< ') ||
        trimmed === '=======' ||
        trimmed.startsWith('>>>>>>> ')
      );
    });
    
    if (lines.length !== cleaned.length) {
      fs.writeFileSync(filePath, cleaned.join('\n'), 'utf8');
      console.log('✅ Cleaned:', filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error cleaning', filePath, error.message);
    return false;
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath);
    }
  });
}

console.log('🔍 Searching for merge conflict markers...\n');

let cleanedCount = 0;
walkDir('.', (filePath) => {
  if (cleanFile(filePath)) {
    cleanedCount++;
  }
});

console.log(`\n✨ Done! Cleaned ${cleanedCount} file(s)`);
