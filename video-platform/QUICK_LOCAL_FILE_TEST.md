# ⚡ Quick Local File Access Test

## 🎯 5-Minute Test Guide

### **Step 1: Open the App**
```
http://localhost:3000/analyze
```

### **Step 2: Look for "Access Local Files" Button**
- Should be blue with a HardDrive icon
- Located next to "Select File" button

### **Step 3: Click It!**
Modal should open with:
- ✅ Title: "Local File Access"
- ✅ Three buttons: "Pick Files", "Browse Folder", (and "Refresh" if folder loaded)
- ✅ Clean, modern UI

---

## 🧪 Test Scenarios

### **Scenario 1: Quick File Pick** ⚡
1. Click "Pick Files"
2. System file picker opens
3. Navigate to any file (video, PDF, image, etc.)
4. Select file
5. ✅ File should be selected for analysis
6. ✅ Preview should show

**Expected:** Instant file selection, seamless upload flow

---

### **Scenario 2: Folder Browse** 📁
1. Click "Browse Folder"
2. System folder picker opens
3. Navigate to a folder with files (e.g., Documents, Downloads)
4. Select folder
5. Grant permission if prompted
6. ✅ Directory tree loads
7. ✅ Files are listed

**Expected:** Directory structure visible, files clickable

---

### **Scenario 3: Navigate & Select** 🗂️
1. With folder loaded
2. Click folder names to expand/collapse
3. Click file names to select
4. ✅ Selected files show checkmark
5. ✅ Selection count updates at bottom
6. Click "Select X Files" button
7. ✅ Files ready for analysis

**Expected:** Tree navigation works, selection persists

---

### **Scenario 4: Search** 🔍
1. With folder loaded
2. Type in search box (e.g., "report")
3. ✅ Files filter in real-time
4. Clear search
5. ✅ All files show again

**Expected:** Instant search filtering

---

### **Scenario 5: Filter** 🎛️
1. With folder loaded
2. Click filter dropdown
3. Select "Videos (.mp4)"
4. ✅ Only .mp4 files show
5. Change to "All Files"
6. ✅ All files show

**Expected:** Filter works correctly

---

### **Scenario 6: Recent Folders** 💾
1. After accessing a folder once
2. Close modal
3. Reopen modal
4. ✅ Should see "Recent Folders" section
5. Click folder name
6. ✅ Loads instantly
7. Click X to remove
8. ✅ Folder removed from list

**Expected:** Persistent storage works

---

### **Scenario 7: Refresh** 🔄
1. With folder loaded
2. Add/remove files in that folder (outside app)
3. Click "Refresh" button
4. ✅ Directory re-scans
5. ✅ New files appear

**Expected:** Live updates from filesystem

---

### **Scenario 8: Multiple Selection** ☑️
1. Browse folder
2. Select multiple files
3. ✅ All selections show checkmark
4. ✅ Count shows "X files selected"
5. Click "Clear Selection"
6. ✅ All deselected
7. Reselect some files
8. Click "Select X Files"
9. ✅ All files ready

**Expected:** Multi-select works perfectly

---

## 🚨 Error Cases to Test

### **Test 1: Unsupported Browser**
- Open in Safari or mobile browser
- ✅ Should show warning message
- ✅ Warning explains requirements
- ✅ Regular upload still works

### **Test 2: Permission Denied**
- Click "Browse Folder"
- Deny permission prompt
- ✅ Modal stays open
- ✅ Can try again

### **Test 3: Empty Folder**
- Browse to empty folder
- ✅ Shows "0 files" message
- ✅ No errors

### **Test 4: Large Folder**
- Browse folder with 1000+ files
- ✅ Shows loading spinner
- ✅ Eventually loads (may take time)
- ✅ Search/filter still work

---

## ✅ Success Checklist

**Browser Detection:**
- [ ] Shows warning on Safari/mobile
- [ ] Works on Chrome/Edge/Brave

**File Picker:**
- [ ] Opens system picker
- [ ] Accepts files
- [ ] Integrates with upload flow

**Folder Picker:**
- [ ] Opens system picker
- [ ] Requests permission
- [ ] Loads directory tree

**UI/UX:**
- [ ] Modal opens/closes smoothly
- [ ] Buttons clearly labeled
- [ ] Icons display correctly
- [ ] Loading states show
- [ ] Error messages clear

**Directory Browser:**
- [ ] Tree view works
- [ ] Expand/collapse works
- [ ] File selection works
- [ ] Checkmarks show
- [ ] Stats update

**Search & Filter:**
- [ ] Search works in real-time
- [ ] Filter dropdown works
- [ ] Can clear search
- [ ] Can change filters

**Persistence:**
- [ ] Saves directory handles
- [ ] Recent folders show
- [ ] Can reload saved folders
- [ ] Can remove folders

**Integration:**
- [ ] Works with analyze page
- [ ] Files ready for upload
- [ ] Preview shows correctly
- [ ] Upload flow continues

---

## 🎨 What You Should See

### **Main Button:**
```
┌─────────────────────────┐
│ 💿 Access Local Files   │
└─────────────────────────┘
```

### **Modal - Initial State:**
```
┌──────────────────────────────────────┐
│  Local File Access              [X]  │
├──────────────────────────────────────┤
│  Pick individual files or browse     │
│  entire folders                      │
├──────────────────────────────────────┤
│  [📤 Pick Files]  [📁 Browse Folder] │
├──────────────────────────────────────┤
│                                      │
│  No folder selected                  │
│                                      │
└──────────────────────────────────────┘
```

### **Modal - With Folder:**
```
┌──────────────────────────────────────┐
│  Local File Access              [X]  │
├──────────────────────────────────────┤
│  [📤 Pick Files]  [📁 Browse Folder]  │
│  [🔄 Refresh]                        │
├──────────────────────────────────────┤
│  [🔍 Search...] [Filter: All Files ▼]│
├──────────────────────────────────────┤
│  📁 Documents                        │
│    ☑️ 📄 report.pdf        1.2 MB    │
│    ☐ 📄 presentation.pptx  3.5 MB    │
│    📁 Projects ▼                     │
│      ☑️ 🎬 video.mp4       45 MB     │
│      ☐ 📝 notes.txt        5 KB      │
│                                      │
│  2 files selected | 4 total files   │
├──────────────────────────────────────┤
│  [Clear Selection]  [Select 2 Files] │
└──────────────────────────────────────┘
```

### **Unsupported Browser:**
```
┌──────────────────────────────────────┐
│  ⚠️ File System Access Not Supported │
│                                      │
│  Your browser doesn't support the    │
│  File System Access API.             │
│                                      │
│  Requirements:                       │
│  • Chrome 86+ or Edge 86+            │
│  • Desktop browser (not mobile)     │
│                                      │
│  You can still upload files using   │
│  the regular upload button.         │
└──────────────────────────────────────┘
```

---

## 🎯 Quick Verification

**Works if:**
✅ Button appears on analyze page
✅ Modal opens when clicked
✅ Can pick individual files
✅ Can browse folders
✅ Directory tree displays
✅ Can select files
✅ Search/filter work
✅ Files ready for analysis

**Doesn't work if:**
❌ Button doesn't appear
❌ Modal doesn't open
❌ Browser throws errors
❌ Can't access files
❌ Permission denied repeatedly
❌ IndexedDB errors

---

## 💡 Pro Tips

1. **Test with Real Data:** Use actual folders with various file types
2. **Test Large Folders:** See how it handles 100+ files
3. **Test Deep Nesting:** Folders with multiple subdirectories
4. **Test Permissions:** Grant and revoke to see behavior
5. **Test Persistence:** Close tab, reopen, check saved folders

---

## 🚀 Ready for Phase 3?

Once local file access is working smoothly, we can add:

**Phase 3: Revolutionary AI Search**
- Index local files metadata
- Chunk files for Gemini
- Search across local + cloud
- On-demand analysis
- Privacy-first approach

**All tests passing? Let's go! 🎯**
