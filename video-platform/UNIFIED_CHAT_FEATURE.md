# Unified Chat Feature - Complete Implementation

## 🎉 Overview

The **Unified Chat** feature provides a conversational AI interface powered by **Gemini 3 Flash** that has access to ALL files uploaded in your "My Files" section. This creates a unified knowledge base where you can ask questions, request analysis, and get insights across all your uploaded content.

## ✨ Key Features

### 1. **Multi-File Context**
- Chat with AI that has access to ALL your uploaded files simultaneously
- Select specific files or use all files in your library
- AI can compare, contrast, and analyze across multiple files

### 2. **Supported File Types**
The chat interface works with all file types supported by Gemini:
- 🎥 **Videos** (MP4, MOV, AVI, etc.)
- 🎵 **Audio** (MP3, WAV, M4A, etc.)
- 🖼️ **Images** (JPG, PNG, GIF, WEBP, etc.)
- 📄 **PDFs** (Documents, reports, presentations)
- 📝 **Documents** (Text files, Word docs, etc.)
- 📊 **Spreadsheets** (CSV, Excel, etc.)

### 3. **Advanced Capabilities**

#### Cross-File Analysis
```
User: "Compare the main topics in my video presentations and PDF documents"
AI: Analyzes all videos and PDFs, finding common themes and differences
```

#### Contextual Understanding
```
User: "What images contain mountains?"
AI: Reviews all uploaded images and identifies those with mountains
```

#### Temporal References (for videos/audio)
```
User: "Find all the moments where someone mentions 'budget' in my videos"
AI: Returns timestamps like [2:30], [5:45], [12:15] across all videos
```

#### Document Search
```
User: "What does the Q4 report say about revenue?"
AI: Searches through PDFs and documents to find relevant information
```

## 🏗️ Architecture

### Frontend (`/app/chat/page.tsx`)

**Key Components:**

1. **File Selector Sidebar**
   - Displays all uploaded files with Gemini URIs
   - Checkbox selection for individual files
   - "Select All" / "Clear All" quick actions
   - Visual indicators for file types and categories

2. **Chat Interface**
   - Message history with user/assistant distinction
   - Real-time typing indicators
   - Auto-scroll to latest messages
   - Support for multi-line input (Shift+Enter)

3. **Context Display**
   - Shows number of selected files
   - File type badges with color coding
   - Upload date information

**State Management:**
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thoughtSignature?: string; // For Gemini 3 continuity
}

interface UploadedFile {
  id: string;
  filename: string;
  category?: string;
  geminiFileUri?: string; // Critical: only files with this can be used
  mimeType?: string;
  uploadedAt: string;
}
```

### Backend (`/app/api/chat/unified/route.ts`)

**API Endpoint:** `POST /api/chat/unified`

**Request Body:**
```json
{
  "message": "What are the key points in my documents?",
  "files": [
    {
      "uri": "gs://gemini-files/xyz123",
      "mimeType": "application/pdf",
      "filename": "report.pdf"
    }
  ],
  "history": [
    {
      "role": "user",
      "content": "Previous question",
      "thoughtSignature": "..."
    },
    {
      "role": "assistant",
      "content": "Previous answer",
      "thoughtSignature": "..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Here are the key points from your documents...",
  "thoughtSignature": "xyz_signature_for_continuity"
}
```

### Integration with Gemini 3 Flash

**Model Configuration:**
```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  generationConfig: {
    temperature: 1.0, // Keep at default per Gemini 3 docs
  }
});
```

**Context Building:**
1. All selected files are attached as `fileData` parts
2. System instruction explains available files and capabilities
3. Conversation history includes thought signatures for continuity
4. Current user message appended

## 🎯 How It Works

### Step-by-Step Flow

#### 1. **File Loading**
```typescript
// On page load, fetch all files from localStorage
const storedFiles = localStorage.getItem('uploadedFiles');
const storedVideos = localStorage.getItem('uploadedVideos');

// Filter only files uploaded to Gemini (have geminiFileUri)
const geminiFiles = allFiles.filter(f => f.geminiFileUri);
```

#### 2. **File Selection**
- All files auto-selected by default
- Users can toggle individual files or use bulk actions
- Selected count displayed prominently

#### 3. **Message Sending**
```typescript
// Build request with selected file URIs
const selectedFileData = files.filter(f => selectedFiles.includes(f.id));

await fetch('/api/chat/unified', {
  method: 'POST',
  body: JSON.stringify({
    message: userInput,
    files: selectedFileData.map(f => ({
      uri: f.geminiFileUri,
      mimeType: f.mimeType,
      filename: f.filename,
    })),
    history: conversationHistory,
  }),
});
```

#### 4. **AI Processing**
The API:
- Attaches all selected files to the context
- Includes system instructions for cross-file analysis
- Maintains conversation history with thought signatures
- Generates response using Gemini 3 Flash

#### 5. **Response Handling**
- Display AI response in chat
- Store thought signature for next turn (Gemini 3 continuity)
- Auto-scroll to new message
- Re-enable input for next question

## 🔧 Technical Details

### Thought Signatures (Gemini 3 Feature)

**What are they?**
Encrypted representations of the model's internal reasoning state.

**Why important?**
- Maintains reasoning continuity across multiple turns
- Improves response quality in complex conversations
- Required for Gemini 3 Flash (even at `minimal` thinking level)

**Implementation:**
```typescript
// Extract from response
let thoughtSignature: string | null = null;
if (response.candidates && response.candidates[0]?.content?.parts) {
  for (const part of response.candidates[0].content.parts) {
    if ((part as any).thoughtSignature) {
      thoughtSignature = (part as any).thoughtSignature;
    }
  }
}

// Include in next request
{
  role: 'model',
  parts: [{ 
    text: msg.content,
    thoughtSignature: msg.thoughtSignature // Return it
  }]
}
```

### File URI Management

**Critical:** Only files with `geminiFileUri` can be used in chat.

**When does a file get a Gemini URI?**
- During upload via the Files API (`/api/files/route.ts`)
- After successful upload to Gemini servers
- Stored in localStorage metadata

**Format:** `gs://gemini-files/[unique-id]`

### System Prompt

The chat uses a comprehensive system prompt:
```
You are a helpful AI assistant with access to N file(s):
1. video1.mp4 (video/mp4)
2. document.pdf (application/pdf)
...

Your capabilities:
- Analyze and answer questions about ANY of these files
- Compare and find connections across multiple files
- Summarize content from one or all files
- Extract specific information when requested
- Provide detailed analysis of multimedia content
- Read and interpret documents

IMPORTANT INSTRUCTIONS:
1. Base answers on actual file content
2. Mention files by name when referencing
3. Include timestamps for video/audio [MM:SS]
4. Reference sections/pages for documents
5. Be specific with evidence
6. State clearly if info not in files
7. Analyze across files for patterns
```

## 📱 User Interface

### Layout

```
┌─────────────────────────────────────────────────────┐
│  [Database Icon] File Context              [Close]  │
│  Select files for AI to access                      │
│  [Select All] [Clear All]                           │
├─────────────────────────────────────────────────────┤
│  □ [Video] vacation.mp4           2024-01-15        │
│  ☑ [PDF] report.pdf               2024-01-14        │
│  ☑ [Image] photo.jpg              2024-01-13        │
│  ...                                                 │
├─────────────────────────────────────────────────────┤
│  Selected: 2 / 10 files                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  [Brain Icon] Unified Chat                          │
│  Chat with Gemini 3 Flash across all your files    │
│                                    [Database] 2 Files│
├─────────────────────────────────────────────────────┤
│  ℹ️ AI has access to 2 selected files              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Example Cards for First-Time Users]               │
│  "Summarize all my video files"                     │
│  "What are the key points in my documents?"         │
│  "Find common themes across all files"              │
│  "What images contain landscapes?"                  │
│                                                      │
│  --- After First Message ---                        │
│                                                      │
│  [User Avatar] You                                  │
│  What are the main topics?                          │
│  10:30 AM                                           │
│                                                      │
│  [AI Avatar] Gemini                                 │
│  Based on your files, the main topics are...        │
│  10:30 AM                                           │
│                                                      │
├─────────────────────────────────────────────────────┤
│  [Textarea] Ask anything about your files...        │
│  Powered by Gemini 3 Flash • 2 files selected      │
│                                          [Send 📤]   │
└─────────────────────────────────────────────────────┘
```

### Color Coding

**File Type Badges:**
- 🎥 Video: Blue (`bg-blue-100 text-blue-700`)
- 🎵 Audio: Purple (`bg-purple-100 text-purple-700`)
- 🖼️ Image: Green (`bg-green-100 text-green-700`)
- 📄 PDF: Red (`bg-red-100 text-red-700`)
- 📝 Document: Orange (`bg-orange-100 text-orange-700`)
- 📊 Spreadsheet: Pink (`bg-pink-100 text-pink-700`)

## 💡 Example Use Cases

### 1. **Content Review**
```
"Review all my presentation videos and give me a summary of each topic covered"
```
**AI Response:** Analyzes all videos, provides summaries with timestamps

### 2. **Document Search**
```
"Find references to 'Q3 budget' across all my PDFs and documents"
```
**AI Response:** Searches documents, provides relevant excerpts and page numbers

### 3. **Cross-Media Analysis**
```
"Compare what's shown in my images with what's discussed in my audio recordings"
```
**AI Response:** Analyzes both media types, finds connections

### 4. **Content Organization**
```
"Help me categorize my files by topic"
```
**AI Response:** Reviews all files, suggests categories based on content

### 5. **Fact Checking**
```
"Does the information in video A match what's written in document B?"
```
**AI Response:** Cross-references both files, identifies matches/discrepancies

## 🚀 Getting Started

### For Users

1. **Upload Files**
   - Go to "Analyze" page
   - Upload videos, images, audio, PDFs, or documents
   - Files automatically appear in "My Files"

2. **Open Unified Chat**
   - Click "Unified Chat" in sidebar (marked as "New")
   - See all your files in the left sidebar

3. **Select Files**
   - All files selected by default
   - Uncheck specific files if needed
   - Or use filters to include/exclude

4. **Start Chatting**
   - Type your question
   - AI has access to all selected files
   - Ask follow-up questions
   - AI maintains conversation context

### For Developers

**Prerequisites:**
- Gemini API key in `.env.local`
- Next.js 14+ environment
- Files uploaded via `/api/files` route

**Key Files:**
- `/app/chat/page.tsx` - Main chat UI
- `/app/api/chat/unified/route.ts` - Chat API endpoint
- `/components/Sidebar.tsx` - Navigation (includes chat link)

**Testing:**
```bash
# Run development server
npm run dev

# Navigate to
http://localhost:3000/chat

# Upload files first at
http://localhost:3000/analyze
```

## 🔐 Security & Privacy

- All file processing happens via Gemini API
- Files stored in Google Cloud for 48 hours max
- No files stored on our servers
- API key secured via environment variables
- CORS and request validation in place

## ⚡ Performance

**Optimization Strategies:**

1. **Parallel File Processing**
   - Files sent to Gemini in single request
   - Reduces API calls and latency

2. **Thought Signature Caching**
   - Maintains conversation state efficiently
   - Reduces re-processing of context

3. **Selective File Loading**
   - Only files with Gemini URIs loaded
   - Filters applied client-side for speed

4. **Auto-scroll Debouncing**
   - Smooth scrolling without performance hit

## 🐛 Troubleshooting

### "No files available"
**Cause:** No files uploaded or files haven't been processed by Gemini
**Solution:** Upload files via Analyze page first

### "Select at least one file"
**Cause:** All files deselected
**Solution:** Check at least one file in sidebar

### API Errors
**Cause:** API key issues or quota exceeded
**Solution:** 
- Check `.env.local` has valid `GEMINI_API_KEY`
- Verify API quota not exceeded
- Check Gemini API status

### Missing Timestamps in Responses
**Cause:** Video files not properly analyzed
**Solution:** System prompt includes timestamp instructions, but quality depends on Gemini's analysis

## 📚 API Reference

### POST `/api/chat/unified`

**Request:**
```typescript
{
  message: string;           // User's question
  files: Array<{            // Selected files
    uri: string;            // Gemini file URI
    mimeType: string;       // MIME type
    filename: string;       // Display name
  }>;
  history: Array<{          // Conversation history
    role: 'user' | 'assistant';
    content: string;
    thoughtSignature?: string;
  }>;
}
```

**Response (Success):**
```typescript
{
  success: true;
  response: string;          // AI's answer
  thoughtSignature: string;  // For next turn
}
```

**Response (Error):**
```typescript
{
  success: false;
  error: string;             // Error message
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing message)
- `429` - Rate limit exceeded
- `500` - Server error

## 🎓 Best Practices

### For Users

1. **Be Specific:** "What's discussed at [2:30] in video.mp4" > "What's in my video"
2. **Reference Files:** Mention specific files by name for targeted analysis
3. **Use Follow-ups:** Build on previous questions for deeper insights
4. **Select Relevant Files:** Deselect unrelated files for faster, focused responses

### For Developers

1. **Validate File URIs:** Ensure `geminiFileUri` exists before adding to context
2. **Handle Signatures:** Always store and return thought signatures
3. **Error Handling:** Provide clear error messages for API failures
4. **Rate Limiting:** Implement client-side delays for frequent requests
5. **UI Feedback:** Show loading states clearly during API calls

## 🔄 Future Enhancements

**Planned Features:**
- [ ] Export chat transcripts
- [ ] Save favorite conversations
- [ ] File upload directly from chat
- [ ] Voice input support
- [ ] Streaming responses (real-time)
- [ ] Preset prompt templates
- [ ] Multi-language support
- [ ] Advanced file filtering
- [ ] Chat history persistence
- [ ] Collaborative chats

## 📝 Changelog

### v1.0.0 (Current)
- ✅ Initial unified chat implementation
- ✅ Multi-file context support
- ✅ Thought signature continuity
- ✅ File selector sidebar
- ✅ Cross-file analysis
- ✅ All file types supported
- ✅ Responsive design
- ✅ Example prompts
- ✅ Error handling

## 🙏 Credits

- **Powered by:** Gemini 3 Flash (Google AI)
- **Framework:** Next.js 14
- **UI Components:** Tailwind CSS, Framer Motion
- **Icons:** Lucide React

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review API documentation
3. Check browser console for errors
4. Verify environment variables

---

**Built with ❤️ using Gemini 3 Flash API**
