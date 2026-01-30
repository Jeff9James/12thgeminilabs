# ⚡ Quick PWA Test Guide

## 🎯 5-Minute PWA Verification

### **Step 1: Open the App**
```
http://localhost:3000
```

### **Step 2: Open DevTools (F12)**

### **Step 3: Check Service Worker**
1. Go to **Application** tab
2. Click **Service Workers** (left sidebar)
3. ✅ Should see: "Status: activated and running"
4. ✅ Should show: `/sw.js`

### **Step 4: Check Manifest**
1. Still in **Application** tab
2. Click **Manifest** (left sidebar)
3. ✅ Should see: App name, icons, theme color
4. ✅ Should see: File handlers, shortcuts

### **Step 5: Test Install**
1. Wait 30 seconds on the page
2. ✅ Install prompt should appear (bottom-right)
3. Click "Install App"
4. ✅ App should open in standalone window

### **Step 6: Test Offline**
1. In DevTools, go to **Network** tab
2. Check "Offline" checkbox
3. Reload the page (F5)
4. ✅ App should still load (from cache)

### **Step 7: Run Lighthouse**
1. In DevTools, go to **Lighthouse** tab
2. Select "Progressive Web App"
3. Click "Analyze page load"
4. ✅ Should score 90+ (aim for 100)

---

## 🎨 Visual Checklist

### **Install Prompt Should Look Like:**
```
┌─────────────────────────────────────┐
│  🖥️  Install Gemini Files           │
│                                     │
│  Get quick access and work offline │
│  with our app                       │
│                                     │
│  [⬇ Install App]  [Later]          │
│                                     │
│  ✓ Work offline                     │
│  ✓ Faster load times                │
│  ✓ Access local files               │
└─────────────────────────────────────┘
```

### **Service Worker Console:**
```
[PWA] Initializing...
[PWA] Capabilities: { serviceWorker: true, ... }
[PWA] Display mode: browser
[PWA] Service worker registered successfully
[SW] Service worker loaded
[SW] Installing service worker...
[SW] Precaching assets
[SW] Skip waiting
```

---

## ✅ What to Look For

### **In Browser:**
- ✅ No console errors
- ✅ Install icon (⊕) in address bar (Chrome)
- ✅ Install prompt after 30s
- ✅ PWA badge in DevTools

### **In Application Tab:**
- ✅ Manifest loaded correctly
- ✅ Service Worker "activated and running"
- ✅ All icons present (192x192, 512x512)
- ✅ Cache Storage has entries

### **In Network Tab:**
- ✅ `/sw.js` loaded (200 OK)
- ✅ `/manifest.json` loaded (200 OK)
- ✅ Icons loaded (200 OK)

---

## 🚨 Common Issues & Fixes

### **Service Worker Not Registering?**
```bash
# Hard refresh
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### **Install Prompt Not Showing?**
- Wait full 30 seconds
- Check localStorage: `pwa-install-dismissed`
- Try incognito window

### **Icons Not Loading?**
```bash
npm run generate-icons
```

### **Offline Mode Not Working?**
- Visit pages while online first (to cache)
- Check Service Worker is active
- Check Cache Storage has entries

---

## 🎯 Expected Results

### **Lighthouse PWA Score:**
```
Progressive Web App: 100/100 ✅
- ✅ Installable
- ✅ PWA optimized
- ✅ Works offline
- ✅ Themed
- ✅ Content sized correctly
```

### **Manifest Check:**
```json
{
  "name": "Gemini Files - AI Multi-Modal Analysis",
  "short_name": "Gemini Files",
  "display": "standalone",
  "theme_color": "#2563eb",
  "icons": [ ... ],
  "file_handlers": [ ... ]
}
```

---

## 📱 Mobile Testing

### **Android (Chrome):**
1. Deploy to public URL or use `ngrok`
2. Open in Chrome mobile
3. Wait for install banner
4. Tap "Install"
5. Check home screen

### **iOS (Safari):**
1. Deploy to public URL
2. Open in Safari
3. Tap Share button
4. Scroll down
5. Tap "Add to Home Screen"

---

## 🎊 Success Criteria

- [ ] Service Worker registered
- [ ] Manifest loaded
- [ ] Icons showing in DevTools
- [ ] Install prompt appears
- [ ] Can install app
- [ ] Works offline
- [ ] Lighthouse score 90+

**All checked? Congratulations! Your PWA is working perfectly! 🚀**

---

## 💡 Next Actions

1. ✅ Test locally (you're here!)
2. ⬜ Deploy to production (Vercel/Netlify)
3. ⬜ Test on real mobile devices
4. ⬜ Add to app stores (optional)
5. ⬜ Phase 2: Local File Access

**Ready to proceed with Phase 2?** 🎯
