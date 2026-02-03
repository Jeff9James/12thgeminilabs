# Testing Automatic Analysis After Upload

## Quick Test Guide

### Test the New Auto-Analyze Feature

1. **Start the development server:**
   ```bash
   cd video-platform
   npm run dev
   ```

2. **Navigate to Upload Page:**
   - Go to `/analyze` or click "Upload & Analyze" from the home page

3. **Upload a File:**
   - Select any file (video, audio, image, PDF, document, spreadsheet)
   - Click "Upload & Analyze" button
   - Wait for upload to complete

4. **Expected Behavior:**
   ✅ File uploads successfully  
   ✅ You are redirected to `/files/{fileId}?autoAnalyze=true`  
   ✅ The "Analysis" tab is automatically selected  
   ✅ Analysis starts automatically (you'll see "Analyzing..." status)  
   ✅ Streaming analysis results appear in real-time  
   ✅ After analysis completes, button changes to "See Analysis"

5. **Test Existing Files:**
   - Go to "My Files" page
   - Click on a file that already has analysis
   - Expected: Button shows "See Analysis" (not "Analyze File")
   - Click on a file without analysis
   - Expected: Button shows "Analyze [FileType]"

## What Changed

### Before
```
User clicks "Upload & Analyze" 
→ File uploads 
→ Redirect to file page 
→ User must click "Analyze File" button
→ Analysis starts
```

### After
```
User clicks "Upload & Analyze" 
→ File uploads 
→ Redirect to file page 
→ Analysis starts automatically! ✨
→ Real-time streaming results
```

## Button Text Changes

| Scenario | Old Text | New Text |
|----------|----------|----------|
| File without analysis | "Analyze File" | "Analyze [FileType]" |
| File with analysis | "Analyze File" | "See Analysis" |
| During analysis | "Analyzing..." | "Analyzing..." |

## Edge Cases to Test

1. **Network Error During Upload:**
   - Upload should fail gracefully
   - No redirect if upload fails

2. **Analysis Fails:**
   - User can manually retry from file page
   - Button remains "Analyze [FileType]"

3. **Navigate Away During Analysis:**
   - Analysis continues in background
   - Can return to see progress

4. **Multiple Files:**
   - Each file gets its own analysis
   - Auto-analyze only happens for newly uploaded files

## Verify Implementation

Check these files were modified:
- ✅ `app/analyze/page.tsx` - Added autoAnalyze redirect
- ✅ `app/files/[id]/page.tsx` - Auto-trigger analysis on load
- ✅ `components/StreamingAnalysis.tsx` - Exposed startAnalysis via ref

## Success Criteria

✅ Upload button says "Upload & Analyze [FileType]..."  
✅ After upload, automatically redirects to analysis page  
✅ Analysis starts without additional click  
✅ Streaming results appear in real-time  
✅ Button text changes to "See Analysis" after completion  
✅ Existing files still work correctly  
✅ Manual analysis button still works  

## Troubleshooting

### Analysis doesn't start automatically
- Check browser console for errors
- Verify URL has `?autoAnalyze=true` parameter
- Check network tab for API calls

### Button still says "Analyze File"
- Refresh the page after analysis completes
- Check if analysis was saved to backend/localStorage

### Upload fails
- Check API key is configured
- Verify file size limits
- Check network connectivity

---

**Status**: Ready for testing  
**Environment**: Development (npm run dev)  
**Expected Time**: ~30 seconds for full upload + analysis cycle
