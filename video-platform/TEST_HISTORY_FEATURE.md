# Testing the History Feature

## Quick Start

Your development server is running at: **http://localhost:3000**

## Test Scenarios

### Scenario 1: Test File Chat History

1. **Navigate to My Files**
   - Go to http://localhost:3000/files
   - Upload a file (video, PDF, image, audio, spreadsheet, or document)

2. **Start a Chat Session**
   - Click on the uploaded file to view its details
   - Scroll down to the "Chat with File AI" section
   - Ask a few questions (e.g., "What is this file about?", "Summarize the content")

3. **View in History**
   - Navigate to the History page via:
     - Sidebar → History (Clock icon)
     - Or directly: http://localhost:3000/history
   - You should see your chat session listed with:
     - File name and type icon
     - "Single File" badge (blue)
     - Message count
     - Timestamp (e.g., "2 minutes ago")

4. **Test Actions**
   - Click "Show Preview" - Should display the last 3 messages
   - Click "View Session" - Should navigate back to the file detail page
   - Click "Delete" - Should remove the chat session after confirmation

### Scenario 2: Test Unified Chat History

1. **Navigate to Chat Page**
   - Go to http://localhost:3000/chat
   - Make sure you have at least one file uploaded

2. **Start a Multi-File Conversation**
   - Ask questions like:
     - "Summarize all my files"
     - "What are the key points across all documents?"
   - Have a conversation with 3-4 messages

3. **Optional: Test MCP Integration**
   - Click "MCP Server" button
   - Connect to: `https://mcp.deepwiki.com/mcp`
   - Ask a question that triggers MCP tools, e.g.:
     - "Tell me about the moinfra/mcp-client-sdk repository"

4. **View in History**
   - Navigate to http://localhost:3000/history
   - You should see your unified chat session with:
     - "Chat with X Files" title
     - "Multi-File" badge (purple)
     - Message count
     - File count
     - MCP badges (if you used MCP servers)

5. **Test Actions**
   - Click "Show Preview" - Should show the last 3 Q&A pairs
   - Click "View Session" - Should navigate back to the chat page

### Scenario 3: Test Filtering & Sorting

1. **Go to History Page**
   - http://localhost:3000/history

2. **Test Type Filters**
   - Click "All" - Shows all sessions
   - Click "File Chats" - Shows only single-file conversations
   - Click "Multi-File" - Shows only unified chat sessions

3. **Test Sorting**
   - Select "Most Recent" - Sessions sorted by timestamp
   - Select "Most Messages" - Sessions sorted by message count

### Scenario 4: Test Session Management

1. **Clear a Session**
   - Click "Start New Conversation" in the Chat page
   - Verify the unified chat history is cleared
   - Check History page - unified session should be gone

2. **Clear a File Chat**
   - Go to a file detail page with an existing chat
   - Click "Clear Chat" in the chat interface
   - Check History page - that file's session should be gone

### Scenario 5: Test Empty State

1. **Clear All Sessions**
   - Go to History page
   - Delete all existing sessions

2. **Verify Empty State**
   - Should see "No chat sessions yet" message
   - Should see "Go to Files" and "Go to Chat" buttons
   - Click buttons to verify navigation works

## Visual Checks

### File Type Icons
- ✅ Video files show video camera icon
- ✅ Audio files show music note icon
- ✅ Images show image icon
- ✅ PDFs/Documents show document icon
- ✅ Spreadsheets show spreadsheet icon

### Color Coding
- ✅ File chat cards have blue accents
- ✅ Unified chat cards have purple accents
- ✅ MCP badges are green

### Responsiveness
- ✅ Works on desktop (sidebar visible)
- ✅ Works on mobile (sidebar collapses to menu)
- ✅ Cards stack properly on small screens

## Expected Behavior

### ✅ What Should Work

1. **File Chat Sessions**
   - Automatically saved to localStorage as `chat_{fileId}`
   - Persist across page refreshes
   - Show in History page with correct metadata
   - Can be deleted individually

2. **Unified Chat Sessions**
   - Automatically saved to localStorage as `unified_chat_history`
   - Updated in real-time as you chat
   - Show file count and MCP usage
   - Cleared when starting new conversation

3. **Navigation**
   - "View Session" takes you back to the correct page
   - Sidebar "History" link highlights when active
   - Back button works correctly

4. **Performance**
   - History page loads quickly (even with many sessions)
   - Animations are smooth
   - No lag when expanding/collapsing previews

### ⚠️ Known Limitations

1. **Single Unified Session**
   - Currently only tracks the most recent unified chat session
   - Starting a new conversation overwrites the previous one
   - Future enhancement: Support multiple unified sessions with unique IDs

2. **No Session Restoration**
   - Viewing a session navigates to the page but doesn't restore the exact chat state
   - The chat history is available on the file/chat page but may need to scroll

3. **No Export Feature**
   - Can't export chat sessions (future enhancement)

## Troubleshooting

### Issue: History page is empty
- **Check**: Do you have any existing chat sessions?
- **Solution**: Start a new chat session in Files or Chat page

### Issue: Sessions not showing up
- **Check**: Open browser console and check for localStorage errors
- **Solution**: Try refreshing the page or clearing localStorage and starting fresh

### Issue: MCP badges not showing
- **Check**: Did you actually connect and use an MCP server?
- **Solution**: MCP badges only appear if MCP tools were used in the conversation

### Issue: Timestamps wrong
- **Solution**: The timestamps use relative formatting. They should show "X minutes/hours/days ago"

## Browser Compatibility

Tested on:
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari

## Need Help?

If you encounter any issues:
1. Check browser console for errors
2. Verify localStorage is enabled
3. Try clearing localStorage: `localStorage.clear()`
4. Restart the dev server

## Success Criteria

✅ You've successfully tested the History feature when:
1. File chat sessions appear in History
2. Unified chat sessions appear in History
3. Filtering and sorting work correctly
4. Session previews expand/collapse properly
5. Navigation to sessions works
6. Deletion with confirmation works
7. Empty state displays when no sessions exist
8. MCP badges show when MCP servers are used

Happy testing! 🎉
