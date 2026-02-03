# 🎨 Visual UI Guide: Auto-Metadata & Dual Chat/Search Modes

## 📱 File Chat Page UI

### Header Layout (Before):
```
┌────────────────────────────────────────────────────────────┐
│  💬 Chat with Video AI                        🔧 MCP       │
│  Ask questions about example-video.mp4                     │
│  Click timestamps to jump to moments!                      │
└────────────────────────────────────────────────────────────┘
```

### Header Layout (After - NEW!):
```
┌────────────────────────────────────────────────────────────┐
│  💬 Chat with Video AI                 🔧 MCP  [Clear]     │
│  Ask questions about example-video.mp4                     │
│  Click timestamps to jump to moments!                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Chat Mode: (~90% cheaper)                          │  │
│  │  [⚡ Quick] [🔍 Detailed]                            │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Toggle States:

**Quick Mode Active (Default):**
```
Chat Mode: (~90% cheaper)
┌─────────────┐  ┌─────────────┐
│ ⚡ Quick    │  │ 🔍 Detailed │  <- Transparent, smaller
└─────────────┘  └─────────────┘
     ↑ Green, scaled up, shadow
```

**Detailed Mode Active:**
```
Chat Mode: (full accuracy)
┌─────────────┐  ┌─────────────┐
│ ⚡ Quick    │  │ 🔍 Detailed │  <- Blue, scaled up, shadow
└─────────────┘  └─────────────┘
     ↑ Transparent, smaller
```

### Tooltips:
- **Quick:** "Fast mode using saved analysis metadata (reduces AI costs by ~90%)"
- **Detailed:** "Detailed mode using full file (more accurate but slower and uses more AI tokens)"

---

## 🔍 Search Page UI

### Search Header (Before):
```
┌────────────────────────────────────────────────────────────┐
│                  Find moments that matter                   │
│  Search across all your files using natural language       │
│                                                             │
│  [Search input box................................] [Search]│
└────────────────────────────────────────────────────────────┘
```

### Search Header (After - NEW!):
```
┌────────────────────────────────────────────────────────────┐
│                  Find moments that matter                   │
│  Search across all your files using natural language       │
│                                                             │
│  [Search input box................................] [Search]│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         Search Mode:                                │  │
│  │  [⚡ Quick Mode] [🔍 Detailed Mode]                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  [Sort: Relevance ▼] [Configure Filters]                   │
└────────────────────────────────────────────────────────────┘
```

### Search Mode Toggle States:

**Quick Mode Active (Default):**
```
Search Mode:
┌─────────────────┐  ┌─────────────────┐
│ ⚡ Quick Mode   │  │ 🔍 Detailed Mode│  <- White/transparent
└─────────────────┘  └─────────────────┘
     ↑ Green background, bright, scaled
```

**Detailed Mode Active:**
```
Search Mode:
┌─────────────────┐  ┌─────────────────┐
│ ⚡ Quick Mode   │  │ 🔍 Detailed Mode│  <- Blue, bright, scaled
└─────────────────┘  └─────────────────┘
     ↑ White/transparent
```

### Tooltips:
- **Quick Mode:** "Fast mode using saved analysis metadata (reduces AI costs by ~90%)"
- **Detailed Mode:** "Detailed mode using full files (more accurate but slower and uses more AI tokens)"

---

## 🎨 Visual Design Specs

### Color Palette:

**Quick Mode (Cost-Saving):**
- Background: `bg-green-500`
- Text: `text-white`
- Shadow: `shadow-lg`
- Scale: `scale-105`
- Border: `border-white/20`

**Detailed Mode (High-Accuracy):**
- Background: `bg-blue-500`
- Text: `text-white`
- Shadow: `shadow-lg`
- Scale: `scale-105`
- Border: `border-white/20`

**Inactive State:**
- Background: `bg-white/20`
- Text: `text-white/70`
- Hover: `hover:bg-white/30`
- Scale: `scale-100`

### Typography:

**Mode Label:**
- Size: `text-xs`
- Weight: `font-semibold`
- Color: `text-white`

**Cost Indicator:**
- Size: `text-[10px]`
- Color: `text-blue-200`
- Opacity: `opacity-70`

**Button Text:**
- Size: `text-xs` or `text-sm`
- Weight: `font-semibold`
- Icons: `⚡` (lightning), `🔍` (magnifying glass)

### Spacing & Layout:

**Chat Header:**
```css
.mode-toggle-container {
  display: flex;
  align-items: center;
  gap: 0.75rem; /* 12px */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border-radius: 0.5rem; /* 8px */
  padding: 0.5rem 0.75rem; /* 8px 12px */
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

**Search Mode Section:**
```css
.search-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem; /* 12px */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border-radius: 0.75rem; /* 12px */
  padding: 0.75rem 1rem; /* 12px 16px */
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

---

## 🎭 Interactive States

### Button Hover Effects:

**Inactive Button Hover:**
```
Before:  bg-white/20 scale-100
         ↓
After:   bg-white/30 scale-100 (slightly brighter)
```

**Active Button (Always):**
```
Green (Quick):  bg-green-500 scale-105 shadow-lg
Blue (Detailed): bg-blue-500 scale-105 shadow-lg
```

### Transition Animations:
```css
.mode-button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 📊 Responsive Design

### Desktop (≥1024px):
```
┌──────────────────────────────────────────────────┐
│  Chat Mode: (~90% cheaper)                       │
│  [⚡ Quick] [🔍 Detailed]                         │
└──────────────────────────────────────────────────┘
```

### Tablet (768px-1023px):
```
┌─────────────────────────────────┐
│  Mode: (~90% cheaper)           │
│  [⚡ Quick] [🔍 Detailed]        │
└─────────────────────────────────┘
```

### Mobile (<768px):
```
┌─────────────────────┐
│  Mode:              │
│  [⚡] [🔍]          │
└─────────────────────┘
```

---

## 💡 User Feedback Indicators

### Console Logs (Developer Transparency):

**Chat Quick Mode:**
```javascript
✅ Quick Mode: Using metadata only (90% cost savings)
```

**Chat Detailed Mode:**
```javascript
🔍 Detailed Mode: Using full file
```

**Search Quick Mode:**
```javascript
✅ Quick Mode: Searched metadata only (major cost savings)
```

**Search Detailed Mode:**
```javascript
🔍 Detailed Mode: AI processed all files
```

### Visual Indicators in UI:

**Quick Mode Active:**
- ✅ Green badge
- ⚡ Lightning icon
- "(~90% cheaper)" label
- Scaled up + shadow

**Detailed Mode Active:**
- ✅ Blue badge
- 🔍 Magnifying glass icon
- "(full accuracy)" label
- Scaled up + shadow

---

## 🎯 User Journey Flow

### First-Time User (Chat):
```
1. Opens file detail page
2. Sees "Chat with [File]" button
3. Clicks it
4. Sees mode toggle: ⚡ Quick (green) is default
5. Tooltip shows: "~90% cheaper"
6. Asks question → Fast response!
7. If needs more detail → Clicks 🔍 Detailed
8. Asks again → More accurate but slower
```

### First-Time User (Search):
```
1. Goes to /search page
2. Sees mode toggle above search bar
3. ⚡ Quick Mode is default (green)
4. Enters search query
5. Instant results from metadata
6. If unsatisfied → Clicks 🔍 Detailed Mode
7. AI processes all files
8. Gets semantic results
```

---

## 🔔 Accessibility

### ARIA Labels:
```html
<button 
  aria-label="Quick mode: Fast chat using saved metadata, 90% cost reduction"
  title="Fast mode using saved analysis metadata (reduces AI costs by ~90%)"
>
  ⚡ Quick
</button>

<button 
  aria-label="Detailed mode: Accurate chat using full file"
  title="Detailed mode using full file (more accurate but slower)"
>
  🔍 Detailed
</button>
```

### Keyboard Navigation:
- Tab to cycle through buttons
- Enter/Space to activate
- Visual focus indicators

### Screen Reader Support:
- Clear button labels
- Mode change announcements
- Cost/accuracy tradeoffs explained

---

## 📱 Mobile Optimizations

### Touch Targets:
- Minimum 44x44px tap areas
- Adequate spacing between buttons
- No accidental taps

### Responsive Layout:
```
Desktop:  Full labels + icons
Tablet:   Shorter labels + icons
Mobile:   Icons only + tooltips
```

---

## 🎨 Theme Integration

### Light Theme (Future):
```css
.mode-toggle-light {
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.button-active-light {
  background: #22c55e; /* Green for Quick */
  background: #3b82f6; /* Blue for Detailed */
}
```

### Dark Theme (Current):
```css
.mode-toggle-dark {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.button-active-dark {
  background: #22c55e; /* Green for Quick */
  background: #3b82f6; /* Blue for Detailed */
}
```

---

## ✨ Animation Details

### Mode Switch Animation:
```
1. User clicks button
2. Scale transition: 1.0 → 1.05 (active)
3. Shadow appears: 0 → lg
4. Color transition: transparent → green/blue
5. Duration: 200ms
6. Easing: cubic-bezier(0.4, 0, 0.2, 1)
```

### Loading States:
```
Quick Mode:   Fast response (1-2s)
              → No loading indicator needed

Detailed Mode: Slower response (5-10s)
               → Show "Analyzing..." with dots
```

---

## 🎓 Visual Hierarchy

### Importance Order:
1. **Active mode button** (Largest, brightest)
2. **Mode label** ("Chat Mode:")
3. **Cost indicator** (Small, secondary)
4. **Inactive button** (Transparent, smaller)

### Visual Weight:
```
Active Button:    100% (Bright, scaled, shadow)
Mode Label:       80% (White, medium)
Cost Indicator:   60% (Blue-tinted, small)
Inactive Button:  40% (Transparent, normal)
```

---

## 📐 Exact Measurements

### Chat Mode Toggle:
- Container height: `40px`
- Button height: `32px`
- Button padding: `8px 12px`
- Gap between buttons: `12px`
- Border radius: `6px`

### Search Mode Toggle:
- Container height: `48px`
- Button height: `40px`
- Button padding: `12px 16px`
- Gap between buttons: `12px`
- Border radius: `8px`

---

## 🎉 Final Visual Result

### Chat Page:
```
┌─────────────────────────────────────────────────────────────┐
│  💬 Chat with Video AI                                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Chat Mode: (~90% cheaper)                             │ │
│  │ [⚡ Quick]━━━━━━━━━━┐  ┌──────────────┐              │ │
│  │ │ Green, glowing    │  │ 🔍 Detailed  │              │ │
│  │ │ Scaled 1.05       │  │ Transparent  │              │ │
│  │ └───────────────────┘  └──────────────┘              │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Search Page:
```
┌─────────────────────────────────────────────────────────────┐
│           🔍 Find moments that matter                       │
│  [Search box.......................................] [Search]│
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │         Search Mode:                                  │ │
│  │  [⚡ Quick Mode]━━━━━━━┐  ┌────────────────────┐     │ │
│  │  │ Green, bright      │  │ 🔍 Detailed Mode   │     │ │
│  │  │ "~90% cheaper"     │  │ Transparent         │     │ │
│  │  └────────────────────┘  └────────────────────┘     │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

**This visual guide shows exactly what users will see after implementation!** 🎨✨
