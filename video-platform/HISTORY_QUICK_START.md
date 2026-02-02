# History Feature - Quick Start Guide

## 🚀 What's New?

A brand new **History** page that shows all your chat conversations in one place!

## 📍 How to Access

1. **From Sidebar**: Click the **History** button (Clock icon) in the left sidebar
2. **Direct URL**: Navigate to `http://localhost:3000/history`

## 💡 What You'll See

### For Each Chat Session:

#### 📁 File Chat Sessions
- File name and type (video, audio, image, PDF, document, spreadsheet)
- Blue badge: "Single File"
- When you chatted (e.g., "5 minutes ago")
- Number of messages exchanged

#### 📚 Multi-File Chat Sessions  
- Number of files discussed
- Purple badge: "Multi-File"
- When you chatted
- Number of messages exchanged
- List of files involved

#### 🔌 MCP Server Usage (if applicable)
- Green badges showing which MCP servers were used
- Example: "DeepWiki MCP" when you asked about GitHub repos

## 🎮 What You Can Do

### View a Session
Click **"View Session"** to jump back to the file or chat page and continue the conversation.

### Preview Messages
Click **"Show Preview"** to see the last 3 messages without leaving the History page.

### Delete a Session
Click **"Delete"** to permanently remove the chat history. You'll be asked to confirm.

## 🔍 Filtering & Sorting

### Filter by Type
- **All** - Show everything
- **File Chats** - Only single-file conversations
- **Multi-File** - Only multi-file conversations

### Sort Options
- **Most Recent** (default) - Latest chats first
- **Most Messages** - Longest conversations first

## 🎯 Quick Tips

1. **Chat history is saved automatically** - No need to manually save anything!
2. **Sessions persist** - They'll be there even after you close the browser
3. **Start fresh** - Click "Start New Conversation" in the Chat page to begin a new session
4. **MCP tracking** - If you use MCP servers, they'll be shown with green badges

## 📱 Works Everywhere

- ✅ Desktop (full sidebar)
- ✅ Tablet (collapsible sidebar)
- ✅ Mobile (hamburger menu)

## 🆘 Need Help?

### No sessions showing?
- Make sure you've had at least one chat with a file or on the Chat page
- Click the "Refresh" button in the History page

### Can't find a specific chat?
- Use the type filters (File Chats / Multi-File)
- Sort by "Most Recent" or "Most Messages"

### Want to clean up?
- Delete old sessions you don't need anymore
- Confirm when prompted

## 🎨 Visual Guide

```
┌─────────────────────────────────────────┐
│  History                    [Clock Icon] │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ 📄 my-document.pdf               │   │
│  │ [Single File]                    │   │
│  │ 5 messages • 2 hours ago         │   │
│  │ [View] [Preview] [Delete]        │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ 📚 Chat with 3 Files             │   │
│  │ [Multi-File] 🔌 DeepWiki MCP     │   │
│  │ 12 messages • Yesterday          │   │
│  │ [View] [Preview] [Delete]        │   │
│  └──────────────────────────────────┘   │
│                                          │
└─────────────────────────────────────────┘
```

## 🎉 That's It!

You're ready to manage your chat history like a pro!

**Pro Tip**: The History page auto-updates whenever you have new chat sessions, so you can always see your latest conversations.

---

**Need more info?** Check out:
- `HISTORY_FEATURE.md` - Full feature documentation
- `TEST_HISTORY_FEATURE.md` - Comprehensive testing guide
- `HISTORY_IMPLEMENTATION_SUMMARY.md` - Technical details
