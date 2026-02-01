# Testing Chat Mode - Quick Guide

## Prerequisites
1. Have some files uploaded (videos, PDFs, images, audio, etc.)
2. Files must be analyzed/uploaded to Gemini (has `geminiFileUri`)
3. Navigate to `/search` page

## Test Steps

### 1. Visual Check
- [ ] Mode toggle is visible in hero section
- [ ] Toggle shows "Search" and "Chat" buttons
- [ ] Search mode has blue theme
- [ ] Chat mode has purple theme

### 2. Search Mode (Baseline)
```
1. Ensure "Search" mode is selected (blue)
2. Enter: "action scenes" or "meetings"
3. Click "Search"
4. Verify: Results show up in grid format
5. Verify: No AI response box above results
6. Verify: Status shows "Using parallel AI search for faster results"
```

### 3. Chat Mode (New Feature)
```
1. Click "Chat" toggle button (turns purple)
2. Verify: Placeholder changes to "Ask a question..."
3. Verify: Button changes to "Ask"
4. Verify: Example queries change to questions
5. Enter a question: "What was discussed in the video?"
6. Click "Ask"
7. Wait for response...
```

### 4. Expected Chat Mode Results
```
✅ AI Response Box appears at top:
   - Purple/pink gradient background
   - Bot icon on left
   - "LOW THINKING" badge
   - Answer text (concise, 1-3 paragraphs)
   - "Sources" section with file names

✅ File Results appear below:
   - Same grid layout as search mode
   - Header says "Source Files" not "Search Results"
   - Shows 1-10 relevant file snippets
   - Each has relevance score
```

### 5. Performance Check
```
⏱️ Search Mode timing:
   - Parallel search: ~2-5 seconds
   
⏱️ Chat Mode timing:
   - Parallel search: ~2-5 seconds (same)
   - AI answer generation: +1-2 seconds
   - Total: ~3-7 seconds
   
✅ Should be similar speed!
```

### 6. Caching Test
```
1. Run a Chat mode query: "Summarize the content"
2. Note the timing
3. Run THE SAME query again
4. Verify: "Results from cache" appears
5. Verify: Response is instant (<500ms)
6. Verify: AI response is the same
```

### 7. Filter Compatibility
```
1. Open "Configure Filters"
2. Select some file types (e.g., only videos)
3. Add some file filters
4. Switch to Chat mode
5. Ask a question
6. Verify: Only filtered files used in response
7. Verify: Citations only reference filtered files
```

### 8. Mode Switching
```
1. Start in Search mode
2. Enter query: "action scenes"
3. Switch to Chat mode (before searching)
4. Verify: Query remains in input
5. Click "Ask"
6. Verify: Gets AI response
7. Switch back to Search mode
8. Verify: Same query still there
```

### 9. Error Handling
```
Test 1: No files uploaded
- Switch to Chat mode
- Enter question
- Verify: Alert says "No files found"

Test 2: All files filtered out
- Apply filters that exclude all files
- Enter question
- Verify: Alert about filters

Test 3: No matching content
- Ask question about unrelated topic
- Verify: Either "No results found" or AI says "no information available"
```

### 10. Citation Accuracy
```
1. Upload a file with specific content (e.g., "Budget2024.pdf" about budget)
2. Ask: "What does the budget document say?"
3. Check AI response:
   ✅ Answer mentions budget information
   ✅ Citations include "Budget2024.pdf"
   ✅ Source files section shows the PDF
   ✅ Clicking the PDF opens detail page
```

## Example Test Questions

### Good Chat Mode Questions:
- "What are the main topics discussed?"
- "Summarize the key points from the presentation"
- "What recommendations were made?"
- "Explain the process shown in the video"
- "What is the budget for this project?"

### Good Search Mode Queries:
- "action scenes"
- "budget numbers"
- "mountain images"
- "meeting discussions"
- "product features"

## Expected Behavior Differences

| Aspect | Search Mode | Chat Mode |
|--------|-------------|-----------|
| **Input** | Keywords/phrases | Natural questions |
| **Response** | File grid only | AI answer + file grid |
| **Theme** | Blue | Purple |
| **Button** | "Search" | "Ask" |
| **Results Label** | "Found X results" | "Source Files X references" |
| **Top Section** | None | AI Response Box |

## Common Issues & Solutions

### Issue: AI response is too generic
**Solution**: This is expected if files don't contain relevant info

### Issue: Citations don't match results
**Solution**: Check that top 10 results are actually relevant to question

### Issue: Chat mode is slower than expected
**Solution**: 
1. Check network connection
2. Verify LOW THINKING is configured in API
3. Check console for errors

### Issue: Mode toggle doesn't change theme
**Solution**: Hard refresh browser (Ctrl+F5)

### Issue: No AI response in Chat mode
**Solution**: 
1. Check console for errors
2. Verify GEMINI_API_KEY is set
3. Check API response includes `aiResponse` field

## Success Criteria

✅ **Feature Complete** when:
1. Mode toggle works smoothly
2. Search mode behaves exactly as before (no regression)
3. Chat mode generates AI responses with citations
4. Performance is nearly identical between modes
5. Caching works for both modes
6. Filters apply to both modes
7. No console errors
8. UI is polished and responsive

## Performance Benchmarks

Target metrics:
- **Search Mode**: 2-5 seconds (unchanged)
- **Chat Mode**: 3-7 seconds (search + AI generation)
- **Cached**: <500ms (both modes)
- **Mode Switch**: Instant (<100ms)

## Next Steps After Testing

If all tests pass:
1. ✅ Mark feature as complete
2. 📝 Document any issues found
3. 🎨 Consider UI polish (animations, loading states)
4. 🚀 Deploy to production

---

**Test Date**: ___________  
**Tested By**: ___________  
**Result**: ⬜ Pass ⬜ Fail ⬜ Needs Work  
**Notes**: 
