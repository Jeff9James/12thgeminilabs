const fs = require('fs');

const packageJson = {
  "name": "video-platform",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "generate-icons": "node scripts/generate-icons.js"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@vercel/blob": "^2.0.1",
    "@vercel/kv": "^3.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.29.2",
    "jose": "^6.1.3",
    "lucide-react": "^0.563.0",
    "next": "16.1.4",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "tailwind-merge": "^3.4.0",
    "uuid": "^13.0.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20.19.30",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/uuid": "^10.0.0",
    "eslint": "^9",
    "eslint-config-next": "16.1.4",
    "sharp": "^0.34.5",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
};

// Write without BOM
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n', { encoding: 'utf8' });
console.log('✅ package.json fixed (removed BOM)');
