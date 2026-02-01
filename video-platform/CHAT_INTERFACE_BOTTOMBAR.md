# Chat Interface with Bottom Input Bar

## Overview

When user switches to Chat mode in `/search`, the interface should transform:

### Search Mode (Current - Keep as is):
- Input box at top (in hero section)
- Filter/sort controls below input
- Results in grid below
- Example queries below input

### Chat Mode (New):
- NO input box at top
- Just title and mode toggle
- Conversation thread in main area
- **Input box fixed at bottom** with:
  - Filter/sort controls above it
  - Text input with send button
  - Example queries (on first load only)

## Key Changes Needed

### 1. Hero Section - Conditional Rendering

```typescript
{/* Search Bar - Only show in Search Mode */}
{mode === 'search' && (
  <motion.form onSubmit={handleSearch} className="relative">
    {/* Current search input */}
  </motion.form>
)}

{/* Chat Mode Initial Prompt */}
{mode === 'chat' && chatHistory.length === 0 && (
  <motion.div className="text-center">
    <p className="text-xl text-purple-100">
      Ask a question and start a conversation with your files
    </p>
  </motion.div>
)}

{/* Filter and Sort - Only in Search Mode (top) */}
{mode === 'search' && (
  <motion.div className="mt-6">
    {/* Current filter/sort UI */}
  </motion.div>
)}
```

### 2. Main Content Area

```typescript
{/* Results Section */}
<div className={`max-w-7xl mx-auto px-6 ${mode === 'chat' ? 'pb-32' : 'py-12'}`}>
  {/* Chat history or search results */}
</div>
```

### 3. Fixed Bottom Bar (Chat Mode Only)

```typescript
{/* Chat Input Box - Fixed at Bottom */}
{mode === 'chat' && (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
    <div className="max-w-7xl mx-auto px-6 py-4">
      {/* Conversation counter + clear button */}
      {chatHistory.length > 0 && (
        <div className="mb-3 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {chatHistory.length} exchanges
          </span>
          <button onClick={clearConversation}>
            New Conversation
          </button>
        </div>
      )}

      {/* Filter and Sort Controls (compact) */}
      <div className="mb-4">
        <div className="bg-gray-50 rounded-xl p-3">
          {/* Compact filter/sort UI */}
        </div>
      </div>

      {/* Chat Input Form */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              chatHistory.length === 0 
                ? "Ask a question about your files..."
                : "Ask a follow-up question..."
            }
            className="w-full pl-12 pr-32 py-4 rounded-xl border-2 border-purple-200"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-purple-600"
          >
            {isSearching ? 'Thinking...' : (chatHistory.length === 0 ? 'Ask' : 'Send')}
          </button>
        </div>

        {/* Example queries - only show when no history */}
        {chatHistory.length === 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {examples.map(ex => (
              <button onClick={() => setQuery(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  </div>
)}
```

## Visual Comparison

### Search Mode:
```
┌─────────────────────────────────────┐
│  HERO SECTION                       │
│  [Mode Toggle: Search | Chat]      │
│  ┌───────────────────────────────┐ │
│  │ 🔍 Search input... [Search]  │ │
│  └───────────────────────────────┘ │
│  [Example queries]                  │
│  ┌───────────────────────────────┐ │
│  │ [Sort] [Filters]              │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  RESULTS                            │
│  ┌────┐ ┌────┐ ┌────┐              │
│  │ 📄 │ │ 📄 │ │ 📄 │              │
│  └────┘ └────┘ └────┘              │
└─────────────────────────────────────┘
```

### Chat Mode:
```
┌─────────────────────────────────────┐
│  HERO SECTION                       │
│  [Mode Toggle: Search | Chat]      │
│  Ask a question and start...       │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  CONVERSATION THREAD                │
│  ┌──────────────────────────────┐  │
│  │ User: What's in my files?    │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ 🤖 AI: Based on your files...│  │
│  │ Sources: [1] File1.mp4       │  │
│  └──────────────────────────────┘  │
│                                     │
│  [Source Files Grid Below]          │
│                                     │
│  [padding for bottom bar]           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  FIXED BOTTOM BAR                   │
│  3 exchanges  [New Conversation]    │
│  ┌───────────────────────────────┐ │
│  │ [Sort] [Filters]              │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │ 💬 Ask follow-up...  [Send]  │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Implementation Status

Due to file size and complexity, I recommend implementing this in steps:

1. ✅ Hero section - Conditional render based on mode
2. ✅ Main area - Add bottom padding in chat mode
3. ✅ Bottom bar - Fixed position with chat input
4. ✅ Filters/Sort - Move to bottom bar in chat mode
5. ✅ Example queries - Show only on empty history

## CSS Classes Needed

```css
/* Chat mode - add bottom padding to main content */
.pb-32 { padding-bottom: 8rem; }

/* Fixed bottom bar */
.fixed.bottom-0 {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
}

/* Ensure content doesn't hide under fixed bar */
body {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## Benefits

1. **Natural Chat Feel** - Input at bottom like all chat apps
2. **More Space** - Conversation visible without scrolling up
3. **Clear Distinction** - Visual difference between modes
4. **Better UX** - Filters accessible but not intrusive
5. **Mobile Friendly** - Bottom input is thumb-accessible

## Testing Checklist

- [ ] Search mode unchanged (input at top)
- [ ] Chat mode shows input at bottom
- [ ] Bottom bar stays fixed on scroll
- [ ] Filters work in both positions
- [ ] Mobile responsive
- [ ] No layout shift when switching modes
- [ ] Z-index correct (bar above content)
- [ ] Keyboard navigation works

