# Fix: Google Drive API Not Enabled

## Error Message

```
Method doesn't allow unregistered callers (callers without established identity). 
Please use API Key or other form of API consumer identity to call this API.
```

## Root Cause

The **Google Drive API is not enabled** in your Google Cloud Console project. Even though OAuth is working, the actual Drive API needs to be explicitly enabled.

## Solution: Enable Google Drive API

### Step 1: Go to Google Cloud Console

Visit: https://console.cloud.google.com

### Step 2: Select Your Project

- Click the project dropdown at the top
- Select the project that has your OAuth credentials

### Step 3: Navigate to APIs & Services

- Click on the hamburger menu (☰) in the top left
- Go to: **APIs & Services** → **Library**

### Step 4: Search for Google Drive API

- In the search box, type: `Google Drive API`
- Click on **Google Drive API** in the results

### Step 5: Enable the API

- Click the **"ENABLE"** button
- Wait for it to process (usually takes a few seconds)
- You should see: "API enabled"

### Step 6: Test Again

1. Go back to your app: `https://12thgeminilabs-frontend.vercel.app`
2. Login
3. Click "Import from Google Drive"
4. You should now see your Google Drive files! ✅

## Alternative: Use API Key (Not Recommended)

If for some reason enabling the API doesn't work, you could use an API key:

1. Go to: **APIs & Services** → **Credentials**
2. Click: **Create Credentials** → **API Key**
3. Copy the API key
4. Add to Railway environment variables:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

However, **OAuth should work without an API key** once the Drive API is enabled.

## Verification

After enabling the API, check:

1. **Google Cloud Console:**
   - Go to: **APIs & Services** → **Dashboard**
   - **Google Drive API** should be listed with a green checkmark
   - Should show "Enabled"

2. **Test the flow:**
   ```
   1. Go to app
   2. Click "Import from Google Drive"
   3. See list of files (no error!)
   4. Select files
   5. Click "Import Selected"
   6. Files should import successfully
   ```

## Common Issues

### Issue 1: Still getting the error after enabling

**Solution:**
- Wait 1-2 minutes for changes to propagate
- Clear browser cache
- Try in incognito mode
- Check Railway logs to confirm no other errors

### Issue 2: "API not found" when searching

**Solution:**
- Make sure you're in the correct project
- Try this direct link: https://console.cloud.google.com/apis/library/drive.googleapis.com

### Issue 3: Can't find the Enable button

**Solution:**
- The API might already be enabled!
- Check: **APIs & Services** → **Dashboard**
- Look for **Google Drive API** in the list

## What This API Does

The Google Drive API allows your app to:
- ✅ List files in user's Google Drive
- ✅ Download files from Google Drive
- ✅ Get file metadata (name, size, type, etc.)
- ❌ Does NOT allow: Creating, editing, or deleting files (read-only scope)

## Required Scopes

Your app uses these scopes (already configured):
```javascript
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];
```

These are **read-only** scopes, which are safer and easier to get approved.

## Summary

**Problem:** Google Drive API not enabled  
**Solution:** Enable it in Google Cloud Console  
**Time:** 2 minutes  
**Location:** Console → APIs & Services → Library → Search "Google Drive API" → Enable  

After enabling, everything should work! 🚀
