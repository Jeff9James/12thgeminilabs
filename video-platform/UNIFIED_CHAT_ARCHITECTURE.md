# Unified Chat Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                             │
│                         (Next.js Client)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    /app/chat/page.tsx                         │ │
│  │                                                               │ │
│  │  ┌────────────────┐    ┌─────────────────────────────────┐  │ │
│  │  │  File Selector │    │      Chat Interface             │  │ │
│  │  │  Sidebar       │    │                                 │  │ │
│  │  │                │    │  ┌──────────────────────────┐   │  │ │
│  │  │ □ video1.mp4   │    │  │ [User Message]           │   │  │ │
│  │  │ ☑ report.pdf   │    │  │ What are the topics?     │   │  │ │
│  │  │ ☑ image.jpg    │    │  └──────────────────────────┘   │  │ │
│  │  │                │    │                                 │  │ │
│  │  │ [Select All]   │    │  ┌──────────────────────────┐   │  │ │
│  │  │ [Clear All]    │    │  │ [AI Response]            │   │  │ │
│  │  │                │    │  │ The main topics are...   │   │  │ │
│  │  │ Selected:      │    │  └──────────────────────────┘   │  │ │
│  │  │ 2 / 3 files    │    │                                 │  │ │
│  │  └────────────────┘    │  ┌──────────────────────────┐   │  │ │
│  │                        │  │ [Input Area]             │   │  │ │
│  │                        │  │ Type here... [Send]      │   │  │ │
│  │                        │  └──────────────────────────┘   │  │ │
│  │                        └─────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                          │
                          │ HTTP POST /api/chat/unified
                          │ { message, files, history }
                          │
┌──────────────────────────▼──────────────────────────────────────────┐
│                         API LAYER                                   │
│                    (Next.js API Route)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         /app/api/chat/unified/route.ts                        │ │
│  │                                                               │ │
│  │  1. Validate Request                                          │ │
│  │     ├─ Check message exists                                   │ │
│  │     ├─ Validate file URIs                                     │ │
│  │     └─ Parse history                                          │ │
│  │                                                               │ │
│  │  2. Build Context                                             │ │
│  │     ├─ Attach file URIs                                       │ │
│  │     ├─ Add system prompt                                      │ │
│  │     ├─ Include conversation history                           │ │
│  │     └─ Add current message                                    │ │
│  │                                                               │ │
│  │  3. Call Gemini API                                           │ │
│  │     └─ model.generateContent(contents)                        │ │
│  │                                                               │ │
│  │  4. Process Response                                          │ │
│  │     ├─ Extract text                                           │ │
│  │     ├─ Extract thought signature                              │ │
│  │     └─ Format result                                          │ │
│  │                                                               │ │
│  │  5. Return JSON                                               │ │
│  │     { success, response, thoughtSignature }                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                          │
                          │ Google Generative AI SDK
                          │ (@google/generative-ai)
                          │
┌──────────────────────────▼──────────────────────────────────────────┐
│                      GEMINI 3 FLASH API                             │
│                   (Google AI Platform)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                   gemini-3-flash-preview                      │ │
│  │                                                               │ │
│  │  Input Processing:                                            │ │
│  │  ├─ Load files from URIs (gs://gemini-files/...)            │ │
│  │  ├─ Parse system instructions                                │ │
│  │  ├─ Process conversation history                             │ │
│  │  └─ Understand current query                                 │ │
│  │                                                               │ │
│  │  Multi-Modal Analysis:                                        │ │
│  │  ├─ Video: Scene detection, transcription, timestamps       │ │
│  │  ├─ Audio: Speech-to-text, speaker ID, key moments          │ │
│  │  ├─ Image: Object detection, OCR, descriptions              │ │
│  │  ├─ PDF: Text extraction, page refs, structure              │ │
│  │  ├─ Document: Content reading, keyword search               │ │
│  │  └─ Spreadsheet: Data analysis, patterns                    │ │
│  │                                                               │ │
│  │  Reasoning & Generation:                                      │ │
│  │  ├─ Cross-file analysis                                      │ │
│  │  ├─ Pattern recognition                                      │ │
│  │  ├─ Contextual understanding                                 │ │
│  │  ├─ Generate thought signature                               │ │
│  │  └─ Produce natural language response                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                          │
                          │ Response
                          │
┌──────────────────────────▼──────────────────────────────────────────┐
│                       DATA STORAGE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────┐     ┌────────────────────────────┐    │
│  │   localStorage         │     │   Gemini Cloud Storage     │    │
│  │   (Browser)            │     │   (Google Cloud)           │    │
│  │                        │     │                            │    │
│  │ • File metadata        │     │ • Actual file content      │    │
│  │ • Gemini URIs          │     │ • 48-hour retention        │    │
│  │ • Upload timestamps    │     │ • Encrypted in transit     │    │
│  │ • File categories      │     │ • Auto-deletion            │    │
│  └────────────────────────┘     └────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### 1. Initial File Upload (Before Chat)

```
User uploads file
       │
       ▼
   Analyze Page
       │
       ├─ File validation
       ├─ Upload to Gemini via Files API
       │  └─ Returns: gs://gemini-files/[id]
       │
       ├─ Store metadata in localStorage
       │  └─ { id, filename, geminiFileUri, mimeType, ... }
       │
       └─ File appears in "My Files"
```

### 2. Chat Message Flow

```
User types message
       │
       ▼
   Click Send
       │
       ├─ Validate: message not empty
       ├─ Validate: files selected
       │
       ▼
Create user message
       │
       ├─ id: timestamp
       ├─ role: 'user'
       ├─ content: message text
       └─ timestamp: now
       │
       ▼
Add to messages state
       │
       ▼
Build API request
       │
       ├─ message: user's question
       ├─ files: [{ uri, mimeType, filename }]
       └─ history: previous messages
       │
       ▼
POST /api/chat/unified
       │
       ▼
API Route receives request
       │
       ├─ Validate inputs
       ├─ Initialize Gemini model
       │  └─ model: gemini-3-flash-preview
       │
       ▼
Build contents array
       │
       ├─ Add files as fileData parts
       ├─ Add system instruction
       ├─ Add conversation history
       │  └─ Include thought signatures
       └─ Add current message
       │
       ▼
Call Gemini API
       │
       ├─ model.generateContent(contents)
       │
       ▼
Gemini processes
       │
       ├─ Load files from URIs
       ├─ Analyze content (multi-modal)
       ├─ Apply reasoning (with thinking)
       ├─ Generate thought signature
       └─ Produce response text
       │
       ▼
API extracts response
       │
       ├─ text = response.text()
       └─ thoughtSignature = extract from parts
       │
       ▼
Return JSON
       │
       └─ { success: true, response, thoughtSignature }
       │
       ▼
Frontend receives response
       │
       ├─ Create assistant message
       │  ├─ role: 'assistant'
       │  ├─ content: response text
       │  └─ thoughtSignature: for next turn
       │
       ▼
Add to messages state
       │
       ▼
Display in UI
       │
       └─ Auto-scroll to bottom
```

---

## Component Architecture

### Frontend Components

```
/app/chat/page.tsx (Main Page)
│
├─ State Management
│  ├─ messages: Message[]
│  ├─ input: string
│  ├─ isLoading: boolean
│  ├─ files: UploadedFile[]
│  ├─ selectedFiles: string[]
│  └─ showFileSelector: boolean
│
├─ Effects
│  ├─ useEffect(() => loadFiles(), [])
│  └─ useEffect(() => autoScroll(), [messages])
│
├─ Handlers
│  ├─ handleSendMessage()
│  ├─ toggleFileSelection()
│  ├─ selectAllFiles()
│  └─ deselectAllFiles()
│
└─ UI Structure
   │
   ├─ File Selector Sidebar
   │  ├─ Header (title, close button)
   │  ├─ Quick Actions (Select/Clear All)
   │  ├─ File List (checkboxes)
   │  └─ Footer (selection count)
   │
   ├─ Main Chat Area
   │  │
   │  ├─ Header
   │  │  ├─ Title & description
   │  │  └─ File count button
   │  │
   │  ├─ Info Banner
   │  │  └─ Shows selected file count
   │  │
   │  ├─ Messages Container
   │  │  ├─ Welcome screen (if empty)
   │  │  │  └─ Example prompts
   │  │  │
   │  │  └─ Message List
   │  │     ├─ User messages (right-aligned, blue)
   │  │     ├─ AI messages (left-aligned, white)
   │  │     └─ Loading indicator
   │  │
   │  └─ Input Area
   │     ├─ Warning (if no files)
   │     ├─ Textarea (multi-line)
   │     ├─ Send button
   │     └─ Footer text
   │
   └─ Auto-scroll anchor
```

### Backend Structure

```
/app/api/chat/unified/route.ts
│
├─ POST Handler
│  │
│  ├─ Request Parsing
│  │  ├─ Extract: message, files, history
│  │  └─ Validate inputs
│  │
│  ├─ Model Initialization
│  │  └─ GoogleGenerativeAI
│  │     └─ getGenerativeModel('gemini-3-flash-preview')
│  │
│  ├─ Context Building
│  │  │
│  │  ├─ File Context
│  │  │  └─ For each file:
│  │  │     ├─ Add fileData part
│  │  │     │  ├─ mimeType
│  │  │     │  └─ fileUri
│  │  │     └─ Add to fileParts[]
│  │  │
│  │  ├─ System Prompt
│  │  │  └─ Instructions for AI
│  │  │     ├─ List files
│  │  │     ├─ Explain capabilities
│  │  │     └─ Set expectations
│  │  │
│  │  ├─ Conversation History
│  │  │  └─ For each message:
│  │  │     ├─ role: 'user' | 'model'
│  │  │     ├─ parts: [{ text }]
│  │  │     └─ thoughtSignature (if model)
│  │  │
│  │  └─ Current Message
│  │     └─ role: 'user'
│  │        └─ parts: [{ text: message }]
│  │
│  ├─ API Call
│  │  └─ model.generateContent({ contents })
│  │
│  ├─ Response Processing
│  │  ├─ Extract text
│  │  └─ Extract thought signature
│  │     └─ Search parts for thoughtSignature field
│  │
│  └─ Error Handling
│     ├─ API key errors
│     ├─ Quota exceeded
│     └─ Network failures
│
└─ Response Format
   └─ JSON
      ├─ success: boolean
      ├─ response?: string
      ├─ thoughtSignature?: string
      └─ error?: string
```

---

## State Management

### Client State Flow

```
Initial State
    │
    ├─ messages = []
    ├─ files = []
    ├─ selectedFiles = []
    └─ isLoading = false
    │
    ▼
Load Files (useEffect)
    │
    ├─ Read localStorage
    │  ├─ 'uploadedFiles'
    │  └─ 'uploadedVideos'
    │
    ├─ Filter: has geminiFileUri
    │
    ├─ Set files state
    └─ Auto-select all
       └─ Set selectedFiles state
    │
    ▼
User Interaction
    │
    ├─ Select/deselect files
    │  └─ Update selectedFiles state
    │
    ├─ Type message
    │  └─ Update input state
    │
    └─ Click send
       │
       ├─ Set isLoading = true
       │
       ├─ Add user message
       │  └─ Update messages state
       │
       ├─ API call
       │
       ├─ Add AI response
       │  └─ Update messages state
       │
       └─ Set isLoading = false
```

### Conversation State

```
Message Object Structure:
{
  id: string              // Unique identifier
  role: 'user' | 'assistant'
  content: string         // Message text
  timestamp: Date         // When sent
  thoughtSignature?: string  // For continuity
}

History Circulation:
Turn 1:
  User: "Question 1"
  AI: "Answer 1" [sig: ABC]

Turn 2:
  User: "Question 2"
  + Previous: AI answer with signature ABC
  AI: "Answer 2" [sig: DEF]

Turn 3:
  User: "Question 3"
  + Previous: AI answers with signatures ABC, DEF
  AI: "Answer 3" [sig: GHI]
```

---

## API Integration

### Gemini API Request Structure

```javascript
const contents = [
  // 1. Files + System Context
  {
    role: 'user',
    parts: [
      // File 1
      {
        fileData: {
          mimeType: 'video/mp4',
          fileUri: 'gs://gemini-files/abc123'
        }
      },
      // File 2
      {
        fileData: {
          mimeType: 'application/pdf',
          fileUri: 'gs://gemini-files/def456'
        }
      },
      // System Prompt
      {
        text: 'You are a helpful AI assistant...'
      }
    ]
  },

  // 2. AI Acknowledgment
  {
    role: 'model',
    parts: [{
      text: 'I understand. I have access to...'
    }]
  },

  // 3. Previous User Message (if history)
  {
    role: 'user',
    parts: [{
      text: 'Previous question'
    }]
  },

  // 4. Previous AI Response (if history)
  {
    role: 'model',
    parts: [{
      text: 'Previous answer',
      thoughtSignature: 'ABC123' // Important!
    }]
  },

  // 5. Current User Message
  {
    role: 'user',
    parts: [{
      text: 'Current question'
    }]
  }
];

// Send to Gemini
const result = await model.generateContent({ contents });
```

### Response Structure

```javascript
// Gemini API Response
{
  candidates: [
    {
      content: {
        parts: [
          {
            text: "The AI's response text...",
            thoughtSignature: "XYZ789" // Extract this!
          }
        ],
        role: "model"
      },
      finishReason: "STOP",
      safetyRatings: [...]
    }
  ],
  usageMetadata: {
    promptTokenCount: 12345,
    candidatesTokenCount: 678,
    totalTokenCount: 13023
  }
}

// Our API Response
{
  success: true,
  response: "The AI's response text...",
  thoughtSignature: "XYZ789"
}
```

---

## Security Architecture

### API Key Protection

```
Environment Variables (.env.local)
    │
    └─ GEMINI_API_KEY=your_key_here
       │
       ▼
    Server-Side Only (API Route)
       │
       ├─ Never sent to client
       ├─ Never in browser
       └─ Only used in API route
          │
          ▼
    Used in GoogleGenerativeAI()
```

### File URI Security

```
File Upload Flow:
    │
    ├─ User uploads file
    │
    ├─ Sent to Gemini Files API
    │  └─ Returns: gs://gemini-files/[random-id]
    │
    ├─ Store URI in localStorage (client)
    │  └─ Only the URI, not content
    │
    └─ Use URI in chat requests
       │
       ├─ Server validates format
       ├─ Gemini validates access
       └─ Automatic cleanup (48h)
```

---

## Performance Considerations

### Optimization Strategies

```
Frontend Optimizations:
├─ File filtering (client-side)
├─ Message virtualization (ready)
├─ Debounced auto-scroll
├─ Lazy sidebar loading
└─ Efficient re-renders (React)

Backend Optimizations:
├─ Single API call per message
├─ Thought signature reuse
├─ Parallel file attachment
└─ Efficient history management

Network Optimizations:
├─ JSON compression
├─ Minimal payloads
├─ Error recovery
└─ Request validation
```

### Scalability

```
Current Limits:
├─ Files: Unlimited (recommend 10-20)
├─ Context: 1M tokens input
├─ Output: 64k tokens
└─ Retention: 48 hours

Performance Impact:
├─ More files → Slower responses
├─ Larger files → More tokens
├─ Longer history → Bigger payload
└─ Complex queries → More thinking
```

---

## Error Handling

### Error Flow

```
User Action
    │
    ▼
Frontend Validation
    │
    ├─ Empty message? → Show error
    ├─ No files? → Show warning
    └─ Pass → Continue
    │
    ▼
API Request
    │
    ├─ Network Error → Catch & display
    ├─ 400 Error → Show "Invalid request"
    ├─ 429 Error → Show "Rate limit"
    ├─ 500 Error → Show "Server error"
    └─ Success → Process response
    │
    ▼
Response Processing
    │
    ├─ Invalid JSON? → Handle gracefully
    ├─ Missing fields? → Use defaults
    └─ Success → Display to user
```

---

## Deployment Architecture

### Production Setup

```
Next.js Application
    │
    ├─ Static Pages
    │  ├─ Pre-rendered at build
    │  └─ Served from CDN
    │
    ├─ API Routes
    │  ├─ Serverless functions
    │  └─ Invoked on-demand
    │
    └─ Client Code
       ├─ Browser bundle
       └─ Hydrates on client

Environment:
├─ Vercel / Netlify / Railway
├─ Environment variables
├─ Automatic HTTPS
└─ Global CDN
```

---

**This architecture enables:**
✅ Real-time conversational AI  
✅ Multi-file intelligence  
✅ Scalable performance  
✅ Secure file handling  
✅ Seamless user experience  

---

*Architecture Version: 1.0*  
*Last Updated: January 31, 2026*
