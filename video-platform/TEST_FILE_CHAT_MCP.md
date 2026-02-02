# 🧪 FileChat MCP - Visual Test Guide

## Quick Verification (2 Minutes)

Follow these steps to verify MCP support is working correctly:

---

## Test 1: MCP Connection ⚡

### Steps:
```
1. npm run dev
2. Open http://localhost:3000
3. Upload ANY file (video, PDF, image, etc.)
4. Click on the uploaded file
5. Look at the chat header
```

### Expected Result:
```
✅ You should see:
   - A ⚡ button in the header (gray when disconnected)
   - "Chat with [Type] AI" title
   - File name subtitle
   
✅ Click the ⚡ button:
   - MCP panel should expand
   - URL field shows: https://mcp.deepwiki.com/mcp
   - "Connect MCP Server" button visible
```

### Visual Check:
```
┌─────────────────────────────────────────────┐
│ 💬 Chat with Video AI      [⚡] [Clear]    │
│ Ask questions about video.mp4               │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐     │
│ │ 🔌 MCP Server              [Connect] │     │
│ │ [https://mcp.deepwiki.com/mcp_____] │     │
│ │ [Connect MCP Server]                │     │
│ └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

**Status**: □ PASS  □ FAIL

---

## Test 2: Server Connection 🔌

### Steps:
```
1. In the MCP panel (from Test 1)
2. Click "Connect MCP Server"
3. Wait 2-3 seconds
```

### Expected Result:
```
✅ Panel should show:
   - "✓ Connected to DeepWiki"
   - "3 tools available • v1.0.0" (or similar)
   - [Disconnect] button
   
✅ Header should show:
   - Green pulsing badge: "⚡ MCP" next to title
   
✅ Tool list should appear:
   - read_wiki_structure
   - read_wiki_contents (or similar)
   - ask_question
```

### Visual Check:
```
┌─────────────────────────────────────────────┐
│ 💬 Chat with Video AI  [⚡ MCP] [Clear]    │ ← Green badge!
│ Ask questions about video.mp4               │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐     │
│ │ ✓ Connected to DeepWiki             │     │
│ │ 3 tools available • v1.0.0          │     │
│ │ [Disconnect]                        │     │
│ │                                     │     │
│ │ 🔧 Available Tools                  │     │
│ │ ┌─────────────────────────────┐     │     │
│ │ │ read_wiki_structure         │     │     │
│ │ │ Get repository docs...      │     │     │
│ │ ├─────────────────────────────┤     │     │
│ │ │ ask_question                │     │     │
│ │ │ Ask questions about...      │     │     │
│ │ └─────────────────────────────┘     │     │
│ └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

**Status**: □ PASS  □ FAIL

---

## Test 3: Auto-Detection 🤖

### Steps:
```
1. Make sure MCP is connected (green badge visible)
2. In the chat input, type:
   "Tell me about moinfra/mcp-client-sdk"
3. Press Enter or click Send
4. Wait for response (may take 5-10 seconds)
```

### Expected Result:
```
✅ You should see:
   1. Your message appears (blue bubble)
   2. AI starts "Analyzing..." (gray bubble with dots)
   3. AI response appears with:
      - Main answer about mcp-client-sdk
      - Section: "Additional information from MCP server:"
      - Wiki structure or documentation
      
✅ Below AI message:
   - "MCP Tools Used:" section
   - Green badges: "✓ read_wiki_structure(moinfra/...)"
   - Green badges: "✓ ask_question(moinfra/...)"
```

### Visual Check:
```
┌─────────────────────────────────────────────┐
│ Tell me about moinfra/mcp-client-sdk        │ ← Your message
│                                 2:30 PM     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🤖 The moinfra/mcp-client-sdk is a...      │ ← AI response
│                                             │
│ ---                                         │
│ **Additional information from MCP server:** │ ← MCP data!
│ Wiki Structure for moinfra/mcp-client-sdk:  │
│ - Getting Started                           │
│ - API Reference                             │
│ - Examples                                  │
│                                             │
│ MCP Tools Used:                             │
│ [✓ read_wiki_structure(moinfra/...)]       │ ← Green badges!
│ [✓ ask_question(moinfra/...)]              │
└─────────────────────────────────────────────┘
```

**Status**: □ PASS  □ FAIL

---

## Test 4: Manual Tool Call 🔧

### Steps:
```
1. Open MCP panel (⚡ button)
2. Scroll to tool list
3. Click on "ask_question"
4. Fill in:
   - repoName: "moinfra/mcp-client-sdk"
   - question: "How do I initialize a client?"
5. Click "Call Tool"
6. Wait for result
```

### Expected Result:
```
✅ Tool call message appears:
   🔧 Tool: `ask_question`
   Arguments: repoName: "moinfra/...", question: "How..."
   
✅ Tool result message appears:
   - Detailed answer about initialization
   - MCP Tools Used: [✓ ask_question]
```

### Visual Check:
```
┌─────────────────────────────────────────────┐
│ 🔧 Tool: `ask_question`                     │ ← Tool call
│ Arguments: repoName: "moinfra/...", ...    │
│                                 2:31 PM     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🤖 To initialize a client, you need to...  │ ← Result
│                                             │
│ MCP Tools Used:                             │
│ [✓ ask_question]                           │
└─────────────────────────────────────────────┘
```

**Status**: □ PASS  □ FAIL

---

## Test 5: Error Handling ❌

### Test 5a: Invalid URL
```
Steps:
1. Disconnect from MCP
2. Change URL to: "https://invalid-url.com"
3. Click Connect

Expected:
✅ Red error box appears
✅ Message: "Failed to connect" or similar
```

**Status**: □ PASS  □ FAIL

### Test 5b: Missing Parameters
```
Steps:
1. Connect to MCP
2. Select "ask_question" tool
3. Leave repoName EMPTY
4. Click "Call Tool"

Expected:
✅ Error message in chat
✅ Helpful error text
```

**Status**: □ PASS  □ FAIL

---

## Test 6: UI/UX Features 🎨

### Test 6a: Panel Toggle
```
Steps:
1. Click ⚡ button to open panel
2. Click ⚡ button again to close panel

Expected:
✅ Panel opens smoothly
✅ Panel closes smoothly
✅ Button state changes
```

**Status**: □ PASS  □ FAIL

### Test 6b: Connection Status
```
Steps:
1. Observe header when disconnected
2. Connect to MCP
3. Observe header when connected
4. Disconnect
5. Observe header again

Expected:
✅ Gray ⚡ when disconnected
✅ Green pulsing "⚡ MCP" when connected
✅ Badge disappears when disconnected
```

**Status**: □ PASS  □ FAIL

### Test 6c: Tool Selection
```
Steps:
1. Connect to MCP
2. Click different tools in list
3. Observe UI changes

Expected:
✅ Selected tool highlights (white background)
✅ Argument form appears below
✅ Can switch between tools smoothly
```

**Status**: □ PASS  □ FAIL

---

## Test 7: Integration with File Chat 📁

### Test 7a: Works with All File Types
```
Test with:
□ Video file
□ Audio file
□ PDF file
□ Image file
□ Spreadsheet
□ Text file

For each:
1. Upload file
2. Open file detail page
3. Connect to MCP
4. Ask about a GitHub repo

Expected:
✅ MCP works with ALL file types
✅ Chat functionality not broken
✅ File analysis still works
```

**Status**: □ PASS  □ FAIL

### Test 7b: Combined Queries
```
Steps:
1. Upload a video
2. Connect to MCP
3. Ask: "Summarize this video and compare it to docs in moinfra/mcp-client-sdk"

Expected:
✅ AI analyzes the video
✅ AI fetches MCP data
✅ AI provides combined answer
✅ Shows MCP tools used
```

**Status**: □ PASS  □ FAIL

---

## Test 8: Repository Detection 🔍

### Test queries that SHOULD trigger MCP:
```
□ "Tell me about moinfra/mcp-client-sdk"
□ "How does the typescript-sdk work?"
□ "Show me docs for modelcontextprotocol/typescript-sdk"
□ "Explain the MCP protocol from the repo"
□ "What's in the moinfra/mcp-client-sdk repository?"
```

### Test queries that should NOT trigger MCP:
```
□ "What is this video about?"
□ "Summarize this file"
□ "What are the key points?"
□ "Explain this content"
```

**Status**: □ PASS  □ FAIL

---

## Test 9: Performance ⚡

### Timing Checks:
```
□ Connection time: < 3 seconds
□ Auto-detection response: < 10 seconds
□ Manual tool call: < 5 seconds
□ UI interactions: Instant
□ Panel animations: Smooth
```

**Status**: □ PASS  □ FAIL

---

## Test 10: Persistence 💾

### Chat History:
```
Steps:
1. Connect to MCP
2. Ask a question
3. Refresh page
4. Open same file

Expected:
✅ Chat messages are preserved
✅ MCP connection is NOT preserved (need to reconnect)
✅ Can reconnect and continue conversation
```

**Status**: □ PASS  □ FAIL

---

## 🎯 Final Verification Checklist

Run through ALL tests above and check each one.

### Critical Features (Must Pass):
- [ ] MCP button appears
- [ ] Can connect to DeepWiki
- [ ] Auto-detection works
- [ ] Manual tools work
- [ ] Tool badges appear
- [ ] Error handling works

### UI/UX Features (Should Pass):
- [ ] Panel toggles smoothly
- [ ] Connection status updates
- [ ] Tool selection works
- [ ] Animations are smooth
- [ ] Colors and styling match

### Integration (Should Pass):
- [ ] Works with all file types
- [ ] Doesn't break existing features
- [ ] Chat history persists
- [ ] Timestamps still work (video/audio)

---

## 📊 Test Results Summary

```
Total Tests: 10
Tests Passed: ____ / 10
Tests Failed: ____ / 10

Critical Issues: ____
Minor Issues: ____
Notes: ________________
```

---

## 🐛 If Tests Fail

### MCP Button Not Showing
```
Check:
1. Component is imported correctly
2. Props are passed correctly
3. No JavaScript errors in console
4. React is rendering properly
```

### Connection Fails
```
Check:
1. Internet connection is working
2. URL is correct: https://mcp.deepwiki.com/mcp
3. No CORS errors in console
4. MCP server is online (check status)
```

### Auto-Detection Not Working
```
Check:
1. MCP is actually connected (green badge)
2. Repository name format is correct (owner/repo)
3. Console for any errors
4. Try manual tool call instead
```

### Tool Badges Not Showing
```
Check:
1. mcpToolsUsed is being set in message
2. UI section for badges is rendering
3. CSS is not hiding badges
4. Data is in correct format
```

---

## ✅ Success Criteria

**ALL of these must be true:**

- [x] TypeScript compiles without errors
- [ ] MCP button appears in FileChat header
- [ ] Can connect to DeepWiki successfully
- [ ] Connection status shows correctly
- [ ] Tool list appears when connected
- [ ] Auto-detection triggers for GitHub repos
- [ ] MCP data appears in AI responses
- [ ] Green tool badges show which tools were used
- [ ] Can manually call tools
- [ ] Tool results appear in chat
- [ ] Errors are handled gracefully
- [ ] UI is smooth and responsive

**If ALL boxes are checked**: ✅ **IMPLEMENTATION SUCCESSFUL!**

---

## 📞 Support

**If you encounter issues:**

1. Check browser console for errors
2. Verify network requests (DevTools > Network tab)
3. Try disconnecting and reconnecting MCP
4. Clear browser cache and reload
5. Check the troubleshooting section in FILE_CHAT_MCP_QUICK_START.md

**Common Issues:**
- **CORS errors**: Normal, server should handle
- **Timeout**: Try again, might be server load
- **Empty results**: Repository might not have wiki/docs

---

**Test Date**: __________  
**Tester**: __________  
**Overall Result**: □ PASS  □ FAIL  
**Notes**: _______________________________
