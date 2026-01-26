# Video Chat Feature Documentation

## Overview

The Video Chat feature allows users to have interactive conversations with AI about their uploaded videos. The chat uses **Gemini 3 Flash** model and provides intelligent responses with **clickable timestamps** that jump to specific moments in the video.

## Key Features

### 1. **Intelligent Video Understanding**
- Uses Gemini 3 Flash model (same as analysis)
- Accesses video content via Gemini File API
- Answers questions based on visual and audio content

### 2. **Clickable Timestamps**
- Automatically detects and formats timestamps in responses
- Format: `[MM:SS]` or `[HH:MM:SS]`
- Click any timestamp to jump to that moment in the video
- Video automatically plays from the selected timestamp

### 3. **Conversation History**
- Maintains full conversation context
- Supports multi-turn conversations
- Preserves thought signatures for Gemini 3 continuity

### 4. **User-Friendly Interface**
- Clean, modern chat UI
- Real-time message updates
- Loading indicators
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

## Technical Implementation

### Architecture

```
User Interface (VideoChat.tsx)
    ↓
API Route (/api/videos/[id]/chat/route.ts)
    ↓
Gemini 3 Flash Model
    ↓
Response with Timestamps
    ↓
Clickable Timestamps in UI
```

### Components

#### 1. **VideoChat Component** (`components/VideoChat.tsx`)

**Props:**
- `videoId: string` - The ID of the video to chat about

**Features:**
- Message history management
- Real-time streaming responses
- Timestamp extraction and formatting
- Automatic scrolling
- Keyboard shortcuts

**Example Usage:**
```tsx
import VideoChat from '@/components/VideoChat';

<VideoChat videoId="your-video-id" />
```

#### 2. **Chat API Route** (`app/api/videos/[id]/chat/route.ts`)

**Endpoint:** `POST /api/videos/{videoId}/chat`

**Request Body:**
```json
{
  "message": "What happens at 1:30?",
  "history": [
    {
      "role": "user",
      "content": "What is this video about?",
      "thoughtSignature": "..."
    },
    {
      "role": "model",
      "content": "This video shows...",
      "thoughtSignature": "..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "At [1:30], you can see...",
    "timestamps": ["[1:30]", "[2:15]"],
    "thoughtSignature": "context_engineering_is_the_way_to_go"
  }
}
```

#### 3. **Gemini Integration** (`lib/gemini.ts`)

**Function:** `chatWithVideo()`

```typescript
async function chatWithVideo(
  videoFileUri: string,
  videoMimeType: string,
  message: string,
  history: Array<{
    role: string;
    content: string;
    thoughtSignature?: string;
  }> = []
)
```

**Features:**
- Integrates with Gemini File API
- Manages conversation context
- Extracts thought signatures
- Parses timestamps from responses

### Gemini 3 Flash Configuration

According to the Gemini 3 API docs, the implementation follows these best practices:

1. **Model Selection:**
   - Uses `gemini-3-flash-preview`
   - Same model as video analysis for consistency

2. **Temperature Setting:**
   - Kept at default value of `1.0`
   - As recommended in Gemini 3 docs for optimal reasoning

3. **Thought Signatures:**
   - Automatically preserved in conversation history
   - Required even at minimal thinking level for Flash
   - Ensures reasoning continuity across turns

4. **Media Resolution:**
   - Uses default settings for video
   - Optimized for action recognition and description
   - Uses `media_resolution_low` or `media_resolution_medium` (both map to 70 tokens/frame)

## How Timestamps Work

### 1. **Server-Side Processing**

The API instructs Gemini to include timestamps:

```typescript
const systemPrompt = `
When mentioning specific moments, events, or scenes, 
ALWAYS include timestamps in the format [MM:SS] or [HH:MM:SS]

Examples:
- "At [0:45], the person enters the room"
- "The main topic is at [1:20]"
`;
```

### 2. **Timestamp Extraction**

The API extracts timestamps using regex:

```typescript
const timestampRegex = /\[(\d{1,2}):(\d{2})\]|\[(\d{1,2}):(\d{2}):(\d{2})\]/g;
```

### 3. **Client-Side Rendering**

The UI converts timestamps to clickable buttons:

```tsx
function formatMessageWithTimestamps(text: string): React.ReactNode[] {
  // Split text by timestamps
  // Render timestamps as clickable buttons
  // Render regular text as spans
}
```

### 4. **Video Navigation**

Clicking a timestamp:
1. Finds the video element by ID (`videoPlayer`)
2. Converts timestamp to seconds
3. Sets `currentTime` property
4. Plays the video
5. Scrolls video into view

## Usage Examples

### Example 1: General Question
**User:** "What is this video about?"

**AI Response:** "This video is a tutorial about [0:15] introduction to React hooks, covering [1:30] useState and [2:45] useEffect."

**Result:** Three clickable timestamps that jump to different sections.

### Example 2: Specific Timestamp Query
**User:** "What happens at 2:30?"

**AI Response:** "At [2:30], the instructor demonstrates how to use the useEffect hook with a practical example."

**Result:** One clickable timestamp.

### Example 3: Scene Description
**User:** "List all the main topics covered"

**AI Response:** 
```
The video covers these topics:
1. [0:30] - Introduction and overview
2. [1:15] - First concept explanation
3. [2:00] - Practical demonstration
4. [3:30] - Common mistakes
5. [4:45] - Best practices
```

**Result:** Five clickable timestamps organized in a list.

## Integration with Video Page

The chat feature is integrated into the video detail page (`app/videos/[id]/page.tsx`):

```tsx
{/* Chat Section */}
<div className="mb-6">
  <VideoChat videoId={id} />
</div>

{/* Analysis Section - appears below */}
<div className="bg-white rounded-lg shadow-lg p-8">
  {/* AI Analysis results */}
</div>
```

**Layout:**
1. Video Player (top)
2. Chat Interface (below video)
3. AI Analysis (below chat)

## Error Handling

The chat feature includes comprehensive error handling:

1. **Missing Video:**
   - Returns 404 if video not found
   - Shows user-friendly error message

2. **API Errors:**
   - Catches and displays Gemini API errors
   - Provides retry option

3. **Invalid Input:**
   - Validates message before sending
   - Disables send button when loading

4. **Network Issues:**
   - Shows loading indicator
   - Timeout handling

## Performance Considerations

### 1. **Conversation History**
- History is stored in component state
- Can be persisted to KV store if needed
- Thought signatures maintained for continuity

### 2. **Token Management**
- Gemini 3 Flash: 1M input / 64k output
- Average chat turn: ~500-1000 tokens
- Video reference adds minimal tokens

### 3. **Response Time**
- Typical response: 2-5 seconds
- Depends on video complexity
- Thinking level set to default (high)

## Future Enhancements

### Planned Features:
1. **Chat History Persistence**
   - Save conversations to KV store
   - Resume conversations later

2. **Suggested Questions**
   - Auto-generate relevant questions
   - Based on video analysis

3. **Multi-Video Chat**
   - Compare content across videos
   - Reference multiple videos in one chat

4. **Export Conversations**
   - Download chat history
   - Share interesting insights

5. **Voice Input**
   - Speak questions instead of typing
   - Better accessibility

## Troubleshooting

### Issue: Timestamps not clickable
**Solution:** Ensure video element has ID `videoPlayer`

### Issue: Video doesn't jump to timestamp
**Solution:** Check that video is fully loaded (preload="metadata")

### Issue: AI doesn't include timestamps
**Solution:** Rephrase question to be more specific about timing

### Issue: Chat not responding
**Solution:** 
- Check API key in environment variables
- Verify video has valid fileUri
- Check network console for errors

## API Compliance

This implementation is fully compliant with:
- ✅ Gemini 3 API Documentation
- ✅ Gemini File API Documentation
- ✅ Best practices for temperature (1.0)
- ✅ Thought signature handling
- ✅ Media resolution defaults
- ✅ Proper error handling

## Environment Variables

Required environment variables:

```env
GEMINI_API_KEY=your_api_key_here
```

## Testing

### Manual Testing Checklist:
- [ ] Upload a video
- [ ] Navigate to video detail page
- [ ] Send a chat message
- [ ] Verify response includes timestamps
- [ ] Click timestamp and verify video jumps
- [ ] Send follow-up question
- [ ] Verify conversation context is maintained
- [ ] Test error scenarios (invalid video ID, etc.)

### Example Test Cases:

1. **Basic Question:**
   - Input: "What is this video about?"
   - Expected: Summary with timestamps

2. **Specific Timestamp:**
   - Input: "What happens at 1:30?"
   - Expected: Description of that moment

3. **Multiple References:**
   - Input: "List the key moments"
   - Expected: List with multiple timestamps

4. **Follow-up:**
   - Input: "Tell me more about that"
   - Expected: Context-aware response referencing previous answer

## Conclusion

The Video Chat feature provides an intuitive way for users to interact with their video content using advanced AI. By leveraging Gemini 3 Flash and the File API, users can ask questions and receive detailed answers with clickable timestamps that enhance the video viewing experience.

The implementation follows all official Gemini 3 guidelines and provides a solid foundation for future enhancements.
