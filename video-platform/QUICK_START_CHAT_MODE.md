# Quick Start: Chat Mode

## What's New?

The Search page now has a **Chat Mode** that lets you ask natural language questions and get AI-powered answers with citations.

## How to Use

### 1. Navigate to Search Page
```
http://localhost:3000/search
```

### 2. Toggle Between Modes

**Search Mode (Blue):**
- Use for finding specific content
- Enter keywords or phrases
- Get grid of matching moments

**Chat Mode (Purple):**
- Use for asking questions
- Enter natural language queries
- Get AI answer + source files

### 3. Try Chat Mode

1. Click the **[Chat]** button at the top
2. Notice the purple theme
3. Enter a question like:
   - "What are the main topics discussed?"
   - "Summarize the key points"
   - "What does the document say about X?"
4. Click **[Ask]**
5. Wait 3-7 seconds
6. See the AI response with citations at top
7. See source files below

## Example Queries

### Search Mode (Keywords):
```
✓ "action scenes"
✓ "budget numbers"
✓ "mountain images"
✓ "meeting discussions"
```

### Chat Mode (Questions):
```
✓ "What action scenes are in my videos?"
✓ "What does the budget document say?"
✓ "Describe the mountain images I have"
✓ "Summarize what was discussed in meetings"
```

## Visual Differences

### Search Mode:
```
🔵 Blue theme
📄 Results only
⚡ 2-5 seconds
```

### Chat Mode:
```
🟣 Purple theme
🤖 AI answer + results
⚡ 3-7 seconds
```

## Key Features

✅ **Same Search Speed** - Uses same parallel AI search
✅ **Low Thinking** - Optimized for speed
✅ **Citations** - Shows which files were used
✅ **Cached** - Repeat questions are instant
✅ **Filters Work** - All filters apply to both modes

## Troubleshooting

### No AI Response?
- Check if files are uploaded and analyzed
- Check console for errors
- Verify GEMINI_API_KEY is set

### Response Too Generic?
- Try more specific questions
- Ensure your files contain relevant info
- Check the source files section

### Slow Response?
- First query: 3-7 seconds (normal)
- Repeat query: <500ms (cached)
- Check network connection

## Performance

| Action | Time |
|--------|------|
| Search | 2-5s |
| Chat (first) | 3-7s |
| Chat (cached) | <500ms |
| Mode switch | <100ms |

## Running Locally

```bash
# 1. Ensure you're in the right directory
cd video-platform

# 2. Install dependencies (if needed)
npm install

# 3. Set up environment
cp .env.local.example .env.local
# Add your GEMINI_API_KEY

# 4. Run dev server
npm run dev

# 5. Open browser
http://localhost:3000/search
```

## Testing

Quick test steps:
1. Upload some files
2. Go to /search
3. Try Search mode first (baseline)
4. Switch to Chat mode
5. Ask a question
6. Verify AI response appears
7. Click on source files

## Documentation

- **Full Docs**: `SEARCH_CHAT_MODE.md`
- **Testing Guide**: `TEST_CHAT_MODE.md`
- **Visual Guide**: `SEARCH_CHAT_VISUAL_GUIDE.md`
- **Implementation**: `CHAT_MODE_IMPLEMENTATION_COMPLETE.md`

## Need Help?

Check the documentation files or look at the console logs for errors.

---

**Ready to try?** Upload some files and head to `/search`! 🚀
