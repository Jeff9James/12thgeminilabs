# Quick Fix: Remove 2 Orphaned Files

## The Problem Right Now

You have **5 files in Gemini** but only **3 files in your KV storage** (visible on My Files page).

This causes Search and Chat to fail because they try to access all 5 files.

## Instant Fix (Choose One Method)

### Method 1: Browser Console (Easiest)

1. **Start your dev server** (if not running):
   ```bash
   cd c:\Users\HP\Downloads\12thgeminilabs\video-platform
   npm run dev
   ```

2. **Open your browser** to `http://localhost:3000`

3. **Open Developer Tools** (Press F12)

4. **Go to Console tab**

5. **Run this command to check orphaned files:**
   ```javascript
   fetch('/api/files/cleanup')
     .then(r => r.json())
     .then(data => {
       console.log('🔍 Storage Status:');
       console.log(`  KV Files: ${data.kvFileCount}`);
       console.log(`  Gemini Files: ${data.geminiFileCount}`);
       console.log(`  Orphaned: ${data.orphanedCount}`);
       console.log('\n📋 Orphaned files:', data.orphanedFiles);
     })
   ```

6. **Run this to DELETE the orphaned files:**
   ```javascript
   fetch('/api/files/cleanup', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ action: 'delete' })
   })
     .then(r => r.json())
     .then(data => {
       console.log('✅ Cleanup Result:');
       console.log(`  ${data.message}`);
       console.log(`  Deleted: ${data.deleted}`);
       console.log(`  Failed: ${data.failed}`);
     })
   ```

7. **Verify it worked:**
   ```javascript
   fetch('/api/files/cleanup')
     .then(r => r.json())
     .then(data => console.log('✅ Status:', data.message))
   ```

   Should show: `"All files in sync!"`

8. **Refresh your Search/Chat page** - should now only see 3 files!

---

### Method 2: PowerShell (Windows)

1. **Open PowerShell**

2. **Run these commands:**

```powershell
# Check status
curl http://localhost:3000/api/files/cleanup

# Delete orphaned files
$body = @{ action = "delete" } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3000/api/files/cleanup -Method POST -Body $body -ContentType "application/json"

# Verify
curl http://localhost:3000/api/files/cleanup
```

---

### Method 3: Node.js Script

1. **Create a file** `cleanup-now.js` in your project:

```javascript
async function cleanup() {
  console.log('🔍 Checking for orphaned files...\n');
  
  // Check status
  const check = await fetch('http://localhost:3000/api/files/cleanup');
  const status = await check.json();
  
  console.log(`KV Files: ${status.kvFileCount}`);
  console.log(`Gemini Files: ${status.geminiFileCount}`);
  console.log(`Orphaned: ${status.orphanedCount}\n`);
  
  if (status.orphanedCount > 0) {
    console.log('🗑️  Deleting orphaned files...\n');
    
    const cleanup = await fetch('http://localhost:3000/api/files/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' })
    });
    
    const result = await cleanup.json();
    console.log(`✅ ${result.message}`);
    console.log(`   Deleted: ${result.deleted}`);
    console.log(`   Failed: ${result.failed}\n`);
  } else {
    console.log('✅ All files in sync!\n');
  }
}

cleanup().catch(console.error);
```

2. **Run it:**
```bash
node cleanup-now.js
```

---

## Expected Output

### Before cleanup:
```
🔍 Storage Status:
  KV Files: 3
  Gemini Files: 5
  Orphaned: 2

📋 Orphaned files: [
  { name: 'files/abc123...', displayName: 'old-video.mp4' },
  { name: 'files/def456...', displayName: 'old-doc.pdf' }
]
```

### After cleanup:
```
✅ Cleanup Result:
  Cleanup completed: 2 deleted, 0 failed
  Deleted: 2
  Failed: 0

✅ Status: All files in sync!
```

---

## Verify the Fix

1. **Go to Search page** - should see "Searching 3 files" instead of 5
2. **Try a search** - should work without errors
3. **Check browser console** - no 403/404 errors
4. **Go to Chat page** - should only reference 3 files

---

## What Changed in the Code

I fixed 3 files:

### 1. `app/api/files/[id]/route.ts`
- Now deletes from Gemini, Vercel Blob, KV analysis, and KV chat
- Adds detailed logging for each step
- Continues even if some deletions fail

### 2. `lib/kv.ts`
- `deleteFile()` now auto-cleans related data
- Removes `analysis:${fileId}` and `chat:${fileId}`

### 3. `app/api/files/cleanup/route.ts` (NEW)
- Lists files in KV vs Gemini
- Identifies orphaned files
- Can delete orphaned files with `action: 'delete'`

---

## Future File Deletions

From now on, when you delete a file:
- ✅ Completely removed from ALL storage systems
- ✅ No orphaned data left behind
- ✅ Search/Chat will immediately reflect the change

---

## Troubleshooting

### "fetch is not defined" error in Node script
**Solution:** Use Node 18+ or add `node-fetch`:
```bash
npm install node-fetch
```
Then in script:
```javascript
import fetch from 'node-fetch';
```

### Server not running
**Solution:** Start it first:
```bash
npm run dev
```

### CORS error
**Solution:** You're using the wrong URL. Make sure server is running on `localhost:3000`

### "GEMINI_API_KEY not configured"
**Solution:** Check your `.env.local` file has `GEMINI_API_KEY=...`

---

## One-Liner Fix (Copy-Paste)

If you just want the quickest fix, open browser console and paste this:

```javascript
fetch('/api/files/cleanup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete'})}).then(r=>r.json()).then(d=>console.log(`✅ ${d.message}`))
```

Then refresh your page!
