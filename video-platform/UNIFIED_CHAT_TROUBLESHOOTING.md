# Unified Chat Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Chat request failed" - 500 Error

**Symptom:** Error message in UI: "Sorry, I encountered an error: Chat request failed. Please try again."

**Possible Causes:**

#### 1. Missing or Invalid API Key

**Check:**
```bash
# View your .env.local file
cat video-platform/.env.local
```

**Solution:**
Ensure you have `GEMINI_API_KEY` set in `.env.local`:
```
GEMINI_API_KEY=your_actual_api_key_here
```

**Get an API Key:**
1. Go to https://aistudio.google.com/apikey
2. Create or select a project
3. Generate an API key
4. Copy to `.env.local`

#### 2. Model Not Available

**Issue:** `gemini-3-flash-preview` may not be available yet in your region or project.

**Solution:** The code has been updated to use `gemini-1.5-flash-latest` (stable model) instead.

**Verify in code:**
```typescript
// app/api/chat/unified/route.ts
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest', // Should be this
  // NOT: 'gemini-3-flash-preview' (may not be available)
});
```

#### 3. Server Not Restarted

**Issue:** Changes to `.env.local` or API routes require server restart.

**Solution:**
```bash
# Stop the dev server (Ctrl+C)
# Then restart
cd video-platform
npm run dev
```

#### 4. Network/CORS Issues

**Issue:** Request blocked by browser or network.

**Solution:**
- Check browser console for CORS errors
- Ensure you're accessing via `localhost` not `127.0.0.1`
- Try in incognito mode

---

## Debugging Steps

### Step 1: Check Server Logs

**Look for these logs in terminal:**
```
[Unified Chat] Request received: { messageLength: 10, filesCount: 2, historyCount: 0 }
[Unified Chat] Model initialized
[Unified Chat] Generating content with 4 content blocks
[Unified Chat] Response received
[Unified Chat] Response text extracted, length: 150
```

**If you see:**
```
[Unified Chat] Missing GEMINI_API_KEY
```
→ Fix: Add API key to `.env.local`

**If you see:**
```
[Unified Chat] Error: ... not found ...
```
→ Fix: Model not available, use stable model

### Step 2: Test API Directly

**Create test file:** `test-chat-api.js`
```javascript
async function testChat() {
  const response = await fetch('http://localhost:3000/api/chat/unified', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello, this is a test',
      files: [],
      history: [],
    }),
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
}

testChat();
```

**Run:**
```bash
node test-chat-api.js
```

### Step 3: Check Browser Console

**Open Developer Tools:**
- Chrome/Edge: F12 or Ctrl+Shift+I
- Firefox: F12
- Safari: Cmd+Option+I

**Look for:**
```
Chat error: Error: Chat request failed
    at ...
```

**Check Network Tab:**
1. Open Network tab
2. Filter: `unified`
3. Click the failed request
4. Check "Response" tab for error details

---

## Model Compatibility

### Gemini 3 Flash (Preview)

**Status:** 🟡 Preview (may not be available)

**Model ID:** `gemini-3-flash-preview`

**Availability:**
- Requires API access to preview models
- May not be in all regions
- Free tier may be limited

**Alternative:** Use Gemini 1.5 Flash instead

### Gemini 1.5 Flash (Stable) ✅ Recommended

**Status:** ✅ Stable

**Model ID:** `gemini-1.5-flash-latest`

**Availability:**
- Available in all regions
- Free tier: Yes (60 requests/minute)
- Production-ready

**Use This:** The code has been updated to use this model by default.

### Gemini 1.5 Pro

**Status:** ✅ Stable

**Model ID:** `gemini-1.5-pro-latest`

**Use Case:** For more complex reasoning (but slower)

---

## Error Messages Reference

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "API key not configured" | Missing `.env.local` | Add `GEMINI_API_KEY` |
| "API key configuration error" | Invalid key | Check key from AI Studio |
| "API quota exceeded" | Rate limit hit | Wait or upgrade plan |
| "Model not found" | Invalid model ID | Use `gemini-1.5-flash-latest` |
| "Chat request failed" | Generic error | Check server logs |
| "Select at least one file" | No files selected | Select files in sidebar |

---

## Configuration Checklist

### Environment Variables

```bash
# video-platform/.env.local

# Required
GEMINI_API_KEY=AIzaSy...your_key_here

# Optional (if using other features)
VERCEL_KV_REST_API_URL=...
VERCEL_KV_REST_API_TOKEN=...
```

### File Structure

```
video-platform/
├── .env.local              # ← Must exist
├── app/
│   └── api/
│       └── chat/
│           └── unified/
│               └── route.ts  # ← API endpoint
└── app/
    └── chat/
        └── page.tsx          # ← UI
```

### Dependencies

**Check installed:**
```bash
cd video-platform
npm list @google/generative-ai
```

**Should show:**
```
@google/generative-ai@0.x.x
```

**If missing:**
```bash
npm install @google/generative-ai
```

---

## Testing Locally

### Minimal Test (No Files)

1. Go to `http://localhost:3000/chat`
2. Type: "Hello, can you hear me?"
3. Click Send
4. Should get response (even without files selected)

### With Files Test

1. Upload files at `/analyze`
2. Go to `/chat`
3. Files should auto-appear in sidebar
4. Select at least one file
5. Ask: "What files do you have access to?"
6. AI should list the files

---

## Production Deployment

### Vercel

**Environment Variables:**
1. Go to Vercel Dashboard
2. Select project
3. Settings → Environment Variables
4. Add: `GEMINI_API_KEY`
5. Redeploy

**Common Issues:**
- API key not synced → Redeploy
- Function timeout → Use streaming (future feature)
- Cold start slow → Normal for serverless

### Railway

**Environment Variables:**
```bash
railway variables set GEMINI_API_KEY=your_key
railway up
```

### Netlify

**netlify.toml:**
```toml
[build.environment]
  GEMINI_API_KEY = "your_key_here"
```

---

## Advanced Debugging

### Enable Verbose Logging

**Edit `route.ts`:**
```typescript
// At the top
const DEBUG = true;

// In the POST function
if (DEBUG) {
  console.log('[DEBUG] Full request:', { message, files, history });
  console.log('[DEBUG] Contents array:', JSON.stringify(contents, null, 2));
}
```

### Test with cURL

```bash
curl -X POST http://localhost:3000/api/chat/unified \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "files": [],
    "history": []
  }'
```

**Expected:**
```json
{
  "success": true,
  "response": "Hello! How can I help you today?",
  "thoughtSignature": null
}
```

### Check Gemini API Directly

```bash
# Test your API key
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent" \
  -H "x-goog-api-key: YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello"}]
    }]
  }'
```

---

## Still Having Issues?

### Gather Information

1. **Server Logs:**
   ```
   [Copy all logs from terminal]
   ```

2. **Browser Console:**
   ```
   [Copy error messages]
   ```

3. **Environment:**
   ```bash
   node --version
   npm --version
   cat .env.local | grep GEMINI_API_KEY | cut -c1-30
   ```

4. **Request Details:**
   - How many files selected?
   - What's the message?
   - Any history?

### Quick Fixes

**Try These First:**
```bash
# 1. Restart dev server
Ctrl+C
npm run dev

# 2. Clear Next.js cache
rm -rf .next
npm run dev

# 3. Reinstall dependencies
rm -rf node_modules
npm install
npm run dev

# 4. Check API key validity
# Go to: https://aistudio.google.com/apikey
# Regenerate if needed
```

---

## Common Scenarios

### Scenario 1: Works Locally, Fails in Production

**Likely Cause:** Environment variables not synced

**Fix:**
1. Check deployment platform dashboard
2. Verify `GEMINI_API_KEY` is set
3. Redeploy application

### Scenario 2: Works Without Files, Fails With Files

**Likely Cause:** Invalid file URIs or file not uploaded to Gemini

**Fix:**
1. Check files have `geminiFileUri` property
2. Re-upload files via Analyze page
3. Ensure files uploaded successfully

### Scenario 3: First Message Works, Second Fails

**Likely Cause:** Thought signature handling issue

**Fix:**
1. Check history is being passed correctly
2. Verify thought signature extraction
3. May need to clear chat and restart

---

## Performance Tips

1. **Reduce File Count:** Select only relevant files (5-10 max)
2. **Use Smaller Files:** Large videos may timeout
3. **Keep History Short:** Clear chat periodically
4. **Use Latest Stable Model:** Not preview models

---

## Contact & Support

**Check Documentation:**
- `UNIFIED_CHAT_README.md` - Overview
- `UNIFIED_CHAT_QUICKSTART.md` - User guide
- `UNIFIED_CHAT_FEATURE.md` - Technical docs

**Check Gemini API Status:**
- https://status.cloud.google.com/

**Community:**
- Stack Overflow: [google-gemini] tag
- GitHub Issues

---

*Last Updated: January 31, 2026*  
*Version: 1.0*
