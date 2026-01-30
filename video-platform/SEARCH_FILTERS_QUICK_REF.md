# Search Filters & Sort - Quick Reference 🚀

## Visual Legend

| Color | Meaning |
|-------|---------|
| 🟢 Green | Include/Whitelist filters |
| 🔴 Red | Exclude/Blacklist filters |
| 🔵 Blue | Active/Selected state |
| ⚪ Gray | Inactive/Default state |

## Sort Options

```
📊 Sort Dropdown Options:
├─ 🎯 Relevance (default) - AI match quality
├─ 📅 Recently Uploaded ↓ - Newest first
├─ 📅 Recently Uploaded ↑ - Oldest first  
├─ 💬 Recently Used ↓ - Most recent interaction
├─ 💬 Recently Used ↑ - Least recent interaction
├─ 🔤 Name A→Z - Alphabetical ascending
└─ 🔤 Name Z→A - Alphabetical descending
```

## Filter Structure

```
🎛️ Filter Panel:
│
├─ 📂 File Types
│  ├─ Include Only: [Video] [Audio] [Image] [PDF] [Document] [Spreadsheet] [Text]
│  └─ Exclude:      [Video] [Audio] [Image] [PDF] [Document] [Spreadsheet] [Text]
│
└─ 📄 Specific Files
   ├─ Include Only: ☐ File1.mp4 ☐ File2.pdf ☐ File3.jpg ...
   └─ Exclude:      ☐ File1.mp4 ☐ File2.pdf ☐ File3.jpg ...
```

## Quick Actions

| Action | How To |
|--------|--------|
| Open filters | Click **Filter** button |
| Close filters | Click **Filter** button again |
| Clear all filters | Click **Clear Filters** (red button) |
| Change sort | Select from **Sort** dropdown |
| Check active filters | Look at blue badge number on **Filter** button |
| See filtered count | Check "Showing X of Y results" at top-right |

## Filter Combinations

### Valid Combinations ✅
- ✅ Include types + Exclude files
- ✅ Exclude types + Include files  
- ✅ Multiple include types
- ✅ Multiple exclude types
- ✅ Sort + Any filter combination

### Logic Rules
1. **Include** takes precedence over **Exclude**
2. **Type filters** applied before **File filters**
3. **Sort** applied after all filters
4. Empty include = show all (except excluded)
5. Multiple includes = OR logic (show any)

## Common Patterns

### 🎬 Videos Only
```
Filter → Include Types → [Video]
```

### 📄 Documents & PDFs
```
Filter → Include Types → [PDF] [Document]
```

### 🚫 Exclude Old Files
```
Sort → Recently Uploaded (Newest First)
Filter → Exclude Files → [☑ Old1.mp4] [☑ Old2.pdf]
```

### 🎯 Specific Project Search
```
Filter → Include Files → [☑ Project_Plan.pdf] [☑ Budget.xlsx]
```

### 🔍 Recent Work Only
```
Sort → Recently Used (Newest First)
(No filters needed)
```

## File Type Icons

| Type | Icon | Categories |
|------|------|-----------|
| Video | 🎬 | MP4, MOV, AVI, WebM, MKV |
| Audio | 🎵 | MP3, WAV, OGG, AAC, FLAC |
| Image | 🖼️ | JPG, PNG, WebP, GIF, BMP |
| PDF | 📄 | PDF documents |
| Document | 📝 | DOC, DOCX, ODT, RTF |
| Spreadsheet | 📊 | XLS, XLSX, ODS, CSV |
| Text | 📃 | TXT, MD, JSON, HTML |

## Usage Tracking

**Files marked as "used" when you:**
- 💬 Chat with them
- ✨ Analyze them

**Timestamp stored:**
- `lastUsedAt` in localStorage
- Used for "Recently Used" sorting

## Performance Notes

- ⚡ Instant filtering (client-side)
- 🎯 No re-search needed for filters
- 💾 Filters not saved (reset on refresh)
- 🔄 Results cached (faster repeated searches)

## UI Elements

### Filter Button
```
[ 🎛️ Filter ]  → Default state
[ 🎛️ Filter 3 ] → Active (3 filters applied)
```

### Results Counter
```
Showing 5 of 20 results
   ↑         ↑
   │         └─ Total before filtering
   └─ Visible after filtering
```

### Clear Button
```
[ ❌ Clear Filters ]  → Appears when filters active
```

## Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Navigate filters |
| `Space` | Toggle checkbox |
| `Esc` | Close filter panel |
| Click badge | Open filters |

## State Indicators

| Visual | State |
|--------|-------|
| Blue button | Filters open or active |
| Gray button | Filters closed and inactive |
| Badge number | Count of active filters |
| Green highlight | Inclusion filter active |
| Red highlight | Exclusion filter active |
| White checkbox | File not selected |
| Checked checkbox | File included/excluded |

## Example Workflows

### 1️⃣ Find Recent Videos
```
1. Search: "action scenes"
2. Sort: Recently Uploaded ↓
3. Filter: Include [Video]
4. Done!
```

### 2️⃣ Search Project Files
```
1. Search: "budget"
2. Filter: Include Files [Project_Plan.pdf] [Budget.xlsx]
3. Done!
```

### 3️⃣ Exclude Irrelevant Files
```
1. Search: "meeting"
2. Review results
3. Filter: Exclude Files [Unrelated1.mp4] [Unrelated2.pdf]
4. Better results!
```

### 4️⃣ Documents I've Worked With
```
1. Search: "notes"
2. Sort: Recently Used ↓
3. Filter: Include [Document] [PDF]
4. See recent work!
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No results | Clear filters or broaden search |
| Wrong order | Check sort dropdown selection |
| Missing file | Verify upload in My Files |
| Filter stuck | Refresh page |
| Counter wrong | Re-open filter panel |

## API Endpoints

No additional API calls for filtering/sorting:
- ✅ All done client-side
- ✅ Works offline after initial search
- ✅ Fast and responsive

## Browser Storage

```
localStorage:
├─ uploadedFiles[]
│  ├─ id
│  ├─ filename
│  ├─ category
│  ├─ uploadedAt
│  └─ lastUsedAt  ← Updated on chat/analyze
└─ uploadedVideos[] (legacy)
```

## Status Badge Examples

```
[ Filter ]      → No filters active
[ Filter 1 ]    → 1 filter active
[ Filter 5 ]    → 5 filters active (e.g., 2 types + 3 files)
```

## Color-Coded Filters

```
Include Only:
[🟢 Video] [⚪ Audio] [🟢 PDF]
   ↑        ↑         ↑
   ON      OFF       ON

Exclude:
[🔴 Audio] [⚪ Video]
   ↑        ↑
   ON      OFF
```

---

**Quick Tips:**
- 💡 Start with sort, then filter
- 💡 Use include for focused search
- 💡 Use exclude to remove noise
- 💡 Clear filters between searches
- 💡 Badge shows active filter count

**Need more details?** → See `SEARCH_FILTERS_USER_GUIDE.md`
