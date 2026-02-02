# Chat History Feature

## Overview

The History page provides a comprehensive view of all your chat sessions across the platform, including:

1. **File Chat Sessions** - Individual conversations with specific files
2. **Unified Chat Sessions** - Multi-file conversations from the Chat page

## Features

### 📋 Chat Session Display

Each chat session shows:

- **File Information**
  - For single-file chats: File name and type (video, audio, image, PDF, document, spreadsheet)
  - For multi-file chats: Number of files involved
  
- **Session Metadata**
  - Last updated timestamp (with smart relative formatting: "5 minutes ago", "2 hours ago", etc.)
  - Total message count
  - MCP servers used (if any)
  
- **Session Actions**
  - **View Session** - Navigate to the file or chat page to continue the conversation
  - **Show/Hide Preview** - Expand to see the last 3 messages from the session
  - **Delete** - Remove the chat session permanently

### 🔍 Filtering & Sorting

**Filter by Type:**
- All sessions
- File chats only (single file conversations)
- Multi-file chats only (unified chat sessions)

**Sort by:**
- Most Recent (default)
- Most Messages

### 🎨 Visual Indicators

- **Color-coded badges** distinguish between file chats (blue) and multi-file chats (purple)
- **File type icons** for easy identification (video, audio, image, document, spreadsheet, etc.)
- **MCP badges** show which external servers were used in the conversation (e.g., DeepWiki MCP)

### 📊 Message Preview

Click "Show Preview" on any session to view:
- The last 3 messages from the conversation
- User questions in blue
- AI responses in white
- Line-clamped text to keep the interface clean

## Data Storage

### File Chat Sessions
- Stored in localStorage with key: `chat_{fileId}`
- Contains array of messages with roles, content, timestamps, and MCP tool usage

### Unified Chat Sessions
- Main history: `unified_chat_history`
- Metadata: `unified_chat_metadata`
- Includes questions, answers, citations, and MCP tools used

## Navigation

Access the History page through:
1. The sidebar navigation (History icon with Clock)
2. Direct URL: `/history`

## Implementation Details

### Components
- **History Page**: `/app/history/page.tsx`
- Integrates with existing chat storage in:
  - FileChat component (`/components/FileChat.tsx`)
  - Chat page (`/app/chat/page.tsx`)

### Storage Pattern
```typescript
// File chat storage
localStorage.setItem(`chat_${fileId}`, JSON.stringify(messages));

// Unified chat storage
localStorage.setItem('unified_chat_history', JSON.stringify(history));
localStorage.setItem('unified_chat_metadata', JSON.stringify({
  lastUpdated: string,
  fileCount: number,
  mcpConnected: boolean
}));
```

### MCP Server Detection
The system automatically detects and displays MCP servers used:
- DeepWiki MCP (read_wiki_structure, read_wiki_contents, ask_question)
- Generic MCP Server (other tools)

## User Experience

### Empty State
When no chat sessions exist, users see:
- Helpful message: "No chat sessions yet"
- Call-to-action buttons:
  - "Go to Files" - Start chatting with individual files
  - "Go to Chat" - Start a multi-file conversation

### Active State
- Animated card entrance for each session
- Hover effects on session cards
- Smooth expansion/collapse for message previews
- Confirmation dialog before deletion

### Loading State
- Spinner with "Loading chat history..." message
- Smooth transition to content once loaded

## Refresh Feature
Click the "Refresh" button in the controls to reload all chat sessions from localStorage.

## Benefits

1. **Track Conversations** - Never lose track of your AI interactions
2. **Context Switching** - Quickly jump back into any previous conversation
3. **File Association** - See which files you've been discussing
4. **MCP Transparency** - Know when external AI tools were used
5. **Clean Up** - Easy deletion of unwanted chat sessions

## Future Enhancements

Potential improvements for production:
- Export chat sessions as text/JSON
- Search within chat history
- Session tagging and categories
- Multiple unified chat sessions (currently shows the most recent)
- Session restoration with full context
- Analytics dashboard (most chatted files, average messages, etc.)
