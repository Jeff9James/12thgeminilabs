# Unified Chat - Quick Reference Card

## 🚀 Quick Access
**URL:** `/chat`  
**Location:** Sidebar → "Unified Chat" (marked "New")

---

## 📋 At a Glance

| Feature | Details |
|---------|---------|
| **Model** | Gemini 3 Flash Preview |
| **File Support** | Videos, Audio, Images, PDFs, Documents, Spreadsheets |
| **Max Files** | Unlimited (recommend 10-20 for best performance) |
| **Context Window** | 1M tokens in / 64k tokens out |
| **File Retention** | 48 hours on Gemini servers |
| **Keyboard** | Enter = Send, Shift+Enter = New line |

---

## 🎯 Common Tasks

### Upload & Chat
```
1. Analyze page → Upload files
2. Chat page → Auto-selected
3. Type question → Send
```

### Select Specific Files
```
1. Click "Database" button
2. Check/uncheck files
3. Chat with selection
```

### Ask Cross-File Questions
```
"Compare content in [file1] and [file2]"
"What common themes appear across all files?"
"Summarize all my videos"
```

---

## 💬 Example Prompts

### Videos
```
"What happens at [2:30] in meeting.mp4?"
"Summarize all my video presentations"
"Find action scenes across my videos"
```

### Documents
```
"What does report.pdf say about revenue?"
"Find all mentions of 'budget' in my PDFs"
"Compare Q1 and Q2 reports"
```

### Images
```
"Which images contain landscapes?"
"Describe the contents of photo.jpg"
"Find all images with people"
```

### Audio
```
"Transcribe meeting_audio.mp3"
"What's discussed in my podcasts?"
"Find moments where 'product' is mentioned"
```

### Multi-Type
```
"Compare what's in my videos with my documents"
"Find connections between images and PDFs"
"Analyze patterns across all file types"
```

---

## ⚡ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Escape` | Close file selector |

---

## 🎨 Visual Indicators

### File Type Badges
- 🎥 **Blue** = Video
- 🎵 **Purple** = Audio
- 🖼️ **Green** = Image
- 📄 **Red** = PDF
- 📝 **Orange** = Document
- 📊 **Pink** = Spreadsheet

### Status Indicators
- ✓ **Checkmark** = File selected
- **Number Badge** = Files selected count
- **Spinner** = AI thinking
- **Green Dot** = Message sent

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "No files available" | Upload files in Analyze page |
| "Select at least one file" | Check at least 1 file in sidebar |
| Slow responses | Deselect large files or reduce count |
| Generic answers | Be specific, reference file names |
| Missing timestamps | Ask: "At what time does X happen?" |

---

## 📊 File Type Capabilities

| Type | Can Do |
|------|--------|
| Video | Timestamps, scenes, transcription |
| Audio | Transcription, speaker ID, moments |
| Image | Object detection, descriptions, comparisons |
| PDF | Text extraction, page references, summaries |
| Document | Content reading, keyword search, analysis |
| Spreadsheet | Data analysis, pattern finding, calculations |

---

## ✨ Pro Tips

### Best Practices
- ✅ Upload quality content
- ✅ Use descriptive filenames
- ✅ Select relevant files only
- ✅ Be specific in questions
- ✅ Ask follow-up questions

### Power Moves
- 💡 Reference timestamps: `[2:30]`
- 💡 Name files: `"in report.pdf"`
- 💡 Compare: `"file1 vs file2"`
- 💡 Summarize: `"all my files"`
- 💡 Search: `"find mentions of X"`

---

## 🔧 API Details

### Endpoint
```
POST /api/chat/unified
```

### Request
```json
{
  "message": "Your question",
  "files": [{ "uri": "gs://...", "mimeType": "...", "filename": "..." }],
  "history": [{ "role": "user|assistant", "content": "...", "thoughtSignature": "..." }]
}
```

### Response
```json
{
  "success": true,
  "response": "AI answer",
  "thoughtSignature": "xyz_for_continuity"
}
```

---

## 📈 Performance Tips

| Situation | Recommendation |
|-----------|----------------|
| Many files | Select 10-20 most relevant |
| Large videos | Use shorter clips or select sections |
| Quick questions | Minimal file selection |
| Deep analysis | Include all relevant files |
| Slow responses | Reduce file count or size |

---

## 🎓 Learning Path

### Beginner (Day 1)
```
1. Upload 1-2 files
2. "What's in this file?"
3. Try follow-ups
```

### Intermediate (Week 1)
```
1. Upload 5-10 files
2. "Compare A and B"
3. Cross-file queries
```

### Advanced (Month 1)
```
1. Upload 20+ files
2. Complex analysis
3. Multi-type queries
```

---

## 🔗 Related Features

| Feature | Purpose |
|---------|---------|
| **My Files** | View all uploads |
| **Search** | Find specific moments |
| **Analyze** | Upload & analyze individual files |

---

## 📞 Help Resources

1. **User Guide:** `UNIFIED_CHAT_QUICKSTART.md`
2. **Technical Docs:** `UNIFIED_CHAT_FEATURE.md`
3. **Implementation:** `UNIFIED_CHAT_IMPLEMENTATION_SUMMARY.md`
4. **Gemini Docs:** Gemini 3 API documentation

---

## 🎯 Common Workflows

### Research Assistant
```
1. Upload research papers
2. "Summarize main findings"
3. "Find contradictions"
4. "Suggest connections"
```

### Content Creator
```
1. Upload draft videos
2. "Review content quality"
3. "Compare to style guide"
4. "Suggest improvements"
```

### Data Analyst
```
1. Upload CSV files
2. "Analyze trends"
3. "Compare datasets"
4. "Find anomalies"
```

### Student
```
1. Upload lecture videos + notes
2. "Explain key concepts"
3. "Create study guide"
4. "Find examples"
```

---

## ✅ Checklist

### Before First Use
- [ ] Files uploaded
- [ ] API key configured
- [ ] Files have Gemini URIs
- [ ] Browser cache cleared (if issues)

### For Each Chat Session
- [ ] Select relevant files
- [ ] Clear previous context (if needed)
- [ ] Start with clear question
- [ ] Use follow-ups for depth

---

## 🚨 Error Messages

| Message | Meaning | Fix |
|---------|---------|-----|
| "No files available" | No files uploaded | Upload files first |
| "Select at least one file" | All deselected | Check files in sidebar |
| "API key error" | Invalid key | Check .env.local |
| "Quota exceeded" | Rate limit hit | Wait and retry |
| "Request failed" | Network issue | Check connection |

---

## 💾 Data Management

### Where Files Stored
- **Client:** `localStorage` (metadata)
- **Gemini:** Cloud storage (48 hours)
- **IndexedDB:** File blobs (optional)

### What Gets Saved
- ✅ File metadata
- ✅ Gemini URIs
- ✅ Upload timestamps
- ❌ Chat history (not persistent yet)
- ❌ File content (on server)

---

## 🔒 Privacy & Security

### What's Safe
- ✅ API key hidden from client
- ✅ Files encrypted in transit
- ✅ Auto-deletion after 48 hours
- ✅ No server storage

### What to Avoid
- ❌ Sensitive personal data
- ❌ Confidential documents
- ❌ Password-protected files
- ❌ Copyrighted content

---

## 📱 Device Support

| Device | Support | Notes |
|--------|---------|-------|
| Desktop | ✅ Full | Best experience |
| Laptop | ✅ Full | Recommended |
| Tablet | ✅ Good | Sidebar overlays |
| Mobile | ✅ Basic | Works but cramped |

---

## 🎨 Customization

### File Selection Strategies

**All Files** (Default)
- Pros: Maximum context
- Cons: Slower responses
- Use: Broad questions

**Specific Files**
- Pros: Faster, focused
- Cons: Limited context
- Use: Targeted questions

**By Type**
- Pros: Category-focused
- Cons: May miss connections
- Use: Type-specific queries

---

## 🌟 Best Results

### Do's ✅
- Be specific with questions
- Reference file names
- Use follow-up questions
- Select relevant files
- Ask one thing at a time

### Don'ts ❌
- Don't be too vague
- Don't select all 50+ files
- Don't expect instant responses
- Don't upload huge files
- Don't share sensitive data

---

## 🔄 Workflow Tips

### Morning Routine
```
1. Check new files
2. Review yesterday's uploads
3. Start targeted chat sessions
```

### Project Work
```
1. Upload project files
2. Select project subset
3. Deep analysis session
```

### Learning
```
1. Upload course materials
2. Ask concept questions
3. Request summaries
```

---

**Print this page for quick reference! 📄**

---

*Version 1.0 | Updated: Jan 31, 2026*
