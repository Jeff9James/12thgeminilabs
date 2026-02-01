# Search & Chat Mode Testing Guide 🧪

## Quick Start

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to Search page**:
   ```
   http://localhost:3000/search
   ```

3. **Prepare test files** (if you don't have any):
   - Go to http://localhost:3000/files
   - Upload at least 2-3 files (videos, PDFs, images, etc.)
   - Wait for them to be processed

---

## Test Scenarios

### Scenario 1: Chat Input Layout (Desktop)

**What to Test**: Chat input box should not overlap sidebar on desktop

**Steps**:
1. Open http://localhost:3000/search on a desktop browser (width > 1024px)
2. Click the **Chat** mode toggle button (next to Search button)
3. Observe the chat input box at the bottom of the page

**Expected Result**:
- ✅ Chat input box should start AFTER the sidebar (with left margin)
- ✅ Sidebar should be fully visible on the left (width: 288px / 72 units)
- ✅ No overlapping between sidebar and chat input
- ✅ You should be able to click sidebar links without interference

**What it looks like**:
```
┌─────────────┬───────────────────────────────────────────────┐
│             │                                               │
│  Sidebar    │         Main Content Area                     │
│  (visible)  │         (Search/Chat interface)               │
│             │                                               │
│             ├───────────────────────────────────────────────┤
│             │  [Chat Input Box - starts here, not over]    │
└─────────────┴───────────────────────────────────────────────┘
```

---

### Scenario 2: Chat Input Layout (Mobile)

**What to Test**: Chat input should use full width on mobile

**Steps**:
1. Open http://localhost:3000/search 
2. Resize browser to mobile width (< 1024px) OR use device emulation
3. Switch to **Chat** mode
4. Check the chat input box

**Expected Result**:
- ✅ Chat input uses full width of the screen
- ✅ Sidebar is hidden (hamburger menu appears)
- ✅ No horizontal scrolling
- ✅ Chat input is easily tappable

---

### Scenario 3: Filter Persistence Across Modes

**What to Test**: Filters should persist when switching between Search and Chat modes

**Steps**:
1. Go to http://localhost:3000/search (Search mode)
2. Click **"Configure Filters"**
3. Set some filters:
   - Include Only: Video ✓
   - Exclude a specific file ✓
4. Note the **badge number** (e.g., "2 filters active")
5. Switch to **Chat mode**
6. Check if filters are still there
7. Switch back to **Search mode**
8. Verify filters are still active

**Expected Result**:
- ✅ Filters remain visible in both modes
- ✅ Filter settings don't reset when switching modes
- ✅ Active filter count badge shows correct number
- ✅ Filter panel can be opened/closed in both modes
- ✅ Queries in Chat mode respect the filters you set

---

### Scenario 4: Dynamic Color Theming

**What to Test**: Filter controls should change color based on mode

**Steps**:
1. In **Search mode** (blue theme):
   - Observe filter toggle button color when active
   - Note the filter count badge color
   - Check the mode toggle button color
2. Switch to **Chat mode** (purple theme):
   - Observe filter toggle button color when active
   - Note the filter count badge color
   - Check the mode toggle button color

**Expected Result**:

| Element | Search Mode | Chat Mode |
|---------|-------------|-----------|
| Mode toggle (active) | Blue background | Purple background |
| Filter toggle (active) | Blue text | Purple text |
| Filter count badge | Blue background | Purple background |
| Chat input border | - | Purple (`border-purple-200`) |
| Submit button | Blue | Purple |

---

### Scenario 5: Sort Settings Persistence

**What to Test**: Sort dropdown should persist across modes

**Steps**:
1. In **Search mode**, open the sort dropdown
2. Select "Recently Uploaded (Newest First)"
3. Switch to **Chat mode**
4. Check the sort dropdown

**Expected Result**:
- ✅ Sort dropdown shows your previous selection
- ✅ Results in Chat mode are sorted according to your setting
- ✅ Sort setting is maintained when switching back to Search

---

### Scenario 6: Full Workflow Test

**What to Test**: Complete user journey with filters and mode switching

**Steps**:
1. Go to http://localhost:3000/search
2. Upload 3-4 different types of files (video, PDF, image)
3. Configure filters:
   - Sort by: "Recently Uploaded"
   - Include Only: Video + PDF
4. Perform a search: "show me important information"
5. Switch to **Chat mode**
6. Ask a question: "Summarize the content of these files"
7. Verify AI response uses only filtered files
8. Ask follow-up: "What are the key points?"
9. Switch back to **Search mode**
10. Verify filters are still active

**Expected Result**:
- ✅ All steps complete without errors
- ✅ Filters remain active throughout
- ✅ Chat mode respects your filter settings
- ✅ No UI overlaps or layout issues
- ✅ Smooth transitions between modes

---

## Visual Regression Checks

### Desktop (Width > 1024px)
- [ ] Sidebar visible on left (288px wide)
- [ ] Chat input starts at `left: 288px` (lg:left-72)
- [ ] No horizontal scrollbar
- [ ] All text readable and not cut off

### Tablet (Width 768-1023px)
- [ ] Sidebar collapsible with hamburger menu
- [ ] Chat input uses full width
- [ ] Filter panel scrollable if needed

### Mobile (Width < 768px)
- [ ] Sidebar hidden by default
- [ ] Chat input full width
- [ ] Buttons appropriately sized for touch
- [ ] No text overflow

---

## Common Issues to Watch For

### ❌ Issues That Should NOT Happen:
1. Chat input overlapping sidebar on desktop
2. Filters disappearing when switching modes
3. Filter settings resetting
4. Z-index conflicts (elements layering incorrectly)
5. Horizontal scrolling on any viewport size
6. Build errors or TypeScript errors

### ✅ All Should Pass:
1. Clean build with `npm run build`
2. No console errors in browser
3. Smooth animations and transitions
4. Responsive on all screen sizes
5. Filter persistence verified
6. Color theming working correctly

---

## Quick Fix Verification

Run these commands to verify the fix:

```bash
# 1. Check for TypeScript errors
npx tsc --noEmit

# 2. Check for lint errors
npm run lint

# 3. Run production build
npm run build

# 4. Start dev server
npm run dev
```

All commands should complete successfully! ✅

---

## Need Help?

If any test fails, check:
1. **SEARCH_CHAT_MODE_FIX.md** - Detailed fix documentation
2. **app/search/page.tsx** - Main component file
3. **components/Sidebar.tsx** - Sidebar configuration
4. Browser console for errors
5. Network tab for failed requests

Happy testing! 🚀
