# Quick Start Guide - Gemini Video Platform

## 🚀 Get Started in 2 Minutes

This guide will help you get the professional video platform up and running immediately.

---

## Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/app/apikey))

---

## 📦 Installation

```bash
# Navigate to the video-platform directory
cd video-platform

# Install dependencies (if not already done)
npm install

# Create environment file
cp .env.local .env.local
```

---

## 🔑 Environment Setup

Edit `.env.local` and add your API key:

```env
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Vercel KV (for production)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token

# Optional: Vercel Blob (for production)
BLOB_READ_WRITE_TOKEN=your_blob_token
```

---

## 🏃 Run Development Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 📱 Navigation Guide

### 1. **Home Page** (`/`)
- **What:** Landing page with hero section
- **Action:** Click "Upload & Analyze" or "Try Search"

### 2. **My Videos** (`/videos`)
- **What:** View all your uploaded videos
- **Action:** Click on any video card to view details
- **Note:** Videos stored in localStorage (no login required)

### 3. **Search** (`/search`)
- **What:** Natural language video search
- **Action:** 
  - Type a query like "Find scenes with action"
  - Click example queries for quick testing
  - Results show with timestamps and snippets

### 4. **Analyze** (`/analyze`)
- **What:** Upload and analyze videos
- **Action:**
  - Drag & drop a video file
  - Or click "Select Video"
  - Click "Analyze Video" to start
  - View scene breakdown with timeline

### 5. **Examples** (`/examples`)
- **What:** Demo videos with use cases
- **Action:** Browse example queries and scenarios

---

## 🎯 Key Features to Try

### 1. Upload a Video
```
Navigate to: /analyze
→ Select/Drop a video file
→ Click "Analyze Video"
→ Watch real-time analysis
→ Explore timeline and scenes
```

### 2. Search Your Videos
```
Navigate to: /search
→ Type: "Find moments where..."
→ View results with timestamps
→ Click to play from specific time
```

### 3. View Video Library
```
Navigate to: /videos
→ Browse all uploaded videos
→ Click any video card
→ Switch between Analysis/Chat tabs
→ Click timestamps to jump to scenes
```

---

## 🎨 UI Components Overview

### Sidebar
- **Desktop:** Fixed left sidebar (288px wide)
- **Mobile:** Collapsible with hamburger menu
- **Sections:** My Videos, Search, Analyze, Examples

### Cards
- **Video Cards:** Thumbnail, metadata, actions
- **Search Results:** Relevance score, timestamp, snippet
- **Scene Cards:** Clickable timestamps, descriptions

### Timeline
- **Color-coded segments:**
  - 🔴 Red = Action scenes
  - 🔵 Blue = Dialogue
  - 🟣 Purple = Transitions
- **Interactive:** Click to seek
- **Indicator:** White line shows current time

---

## 🛠️ Customization

### Change Theme Colors
Edit `tailwind.config.js` or `app/globals.css`:

```css
/* Primary Blue → Your color */
--primary: #2563eb → #your-color

/* Gradient backgrounds */
from-blue-600 to-indigo-600 → from-your-color to-your-color
```

### Add New Navigation Item
Edit `components/Sidebar.tsx`:

```typescript
const navItems = [
  // ...existing items
  {
    name: 'Your Page',
    href: '/your-page',
    icon: YourIcon, // from lucide-react
  },
];
```

### Modify Hero Text
Edit `app/page.tsx`:

```typescript
<h1 className="text-5xl...">
  Your Custom Title
</h1>
<p className="text-xl...">
  Your custom tagline
</p>
```

---

## 🔧 Development Tips

### Hot Reload
- All changes auto-reload in development
- Edit any `.tsx` file and save
- Browser refreshes automatically

### Check Console
- Open DevTools (F12)
- Watch for API errors or warnings
- Check localStorage for video data

### Test Responsiveness
- Use DevTools Device Toolbar (Ctrl+Shift+M)
- Test on mobile, tablet, desktop sizes
- Sidebar collapses on mobile

---

## 📊 Data Storage

### localStorage Keys
```javascript
// Video metadata
'uploadedVideos' → Array of video objects

// Analysis results
'analysis_{videoId}' → Analysis data

// Clear all data
localStorage.clear()
```

### Video Metadata Structure
```typescript
{
  id: string;          // Unique ID
  filename: string;    // Original filename
  uploadedAt: string;  // ISO timestamp
  analyzed: boolean;   // Analysis status
  duration?: number;   // Video duration in seconds
}
```

---

## 🚨 Troubleshooting

### Server Won't Start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### API Errors
```bash
# Check environment variables
cat .env.local

# Verify API key is set
echo $GEMINI_API_KEY
```

### Sidebar Not Showing
- Check browser width (sidebar hides on mobile by default)
- Click hamburger menu (≡) on mobile

### Videos Not Loading
- Check localStorage in DevTools
- Verify video file is under 2GB
- Ensure file type is supported (MP4, MOV, AVI, WebM)

---

## 📝 Next Steps

### 1. Connect Real API
- Implement Gemini API calls in `/app/api/` routes
- Replace mock data with actual responses
- Add error handling and loading states

### 2. Add Database
- Use Vercel KV for metadata
- Use Vercel Blob for video storage
- Implement user authentication

### 3. Enhance Features
- Add video trimming
- Implement batch processing
- Add export functionality
- Enable video sharing

---

## 🎓 Learning Resources

### Documentation
- [Gemini 3 API Docs](../GEMINI_3_API_DOCS.md)
- [Gemini File API Docs](../GEMINI_FILE_API_DOCS.md)
- [Visual Guide](./VISUAL_GUIDE.md)
- [Implementation Complete](./UI_OVERHAUL_COMPLETE.md)

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)

### Tailwind CSS
- [Tailwind Documentation](https://tailwindcss.com/docs)
- [Utility Classes](https://tailwindcss.com/docs/utility-first)

### Framer Motion
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Animation Examples](https://www.framer.com/motion/examples/)

---

## 🤝 Contributing

### Code Style
- Use TypeScript for type safety
- Follow ESLint rules
- Use Prettier for formatting
- Write semantic HTML

### Component Structure
```
components/
  └── YourComponent.tsx
      ├── Imports
      ├── Types/Interfaces
      ├── Component logic
      └── JSX return
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Add: your feature description"

# Push to remote
git push origin feature/your-feature
```

---

## 📞 Support

### Issues
- Check [Troubleshooting](#-troubleshooting) section
- Review console errors
- Verify API key and environment setup

### Documentation
- [UI_OVERHAUL_COMPLETE.md](./UI_OVERHAUL_COMPLETE.md) - Full implementation details
- [VISUAL_GUIDE.md](./VISUAL_GUIDE.md) - UI component layouts
- [GEMINI_3_API_DOCS.md](../GEMINI_3_API_DOCS.md) - API reference

---

## ✨ Demo Workflow

### Complete User Journey
```
1. Visit Homepage (/)
   → See hero with bold taglines
   → Browse features

2. Click "Upload & Analyze" → Go to /analyze
   → Upload a video file
   → Watch analysis progress
   → See scene breakdown

3. Video auto-saves → Go to /videos
   → View in "My Videos"
   → Click to see details

4. Switch to "Chat" tab
   → Ask questions about video
   → Get AI responses

5. Try Search → Go to /search
   → Search: "Find action scenes"
   → See results with timestamps
   → Click to play
```

---

## 🎉 You're Ready!

The platform is now running with a professional UI that includes:
- ✅ Left sidebar navigation
- ✅ Hero section with taglines
- ✅ Big search bar
- ✅ Timeline visualization
- ✅ Result cards with thumbnails
- ✅ Responsive design
- ✅ Smooth animations

**Start exploring and building amazing video applications with Gemini 3!**

---

## 📸 Quick Screenshots

### Desktop View
- Full sidebar visible
- 3-column grid layouts
- Large video player

### Tablet View
- Collapsed sidebar
- 2-column grids
- Touch-friendly buttons

### Mobile View
- Hamburger menu
- Single column
- Full-width components

---

**Ready to go? Run `npm run dev` and visit http://localhost:3000** 🚀
