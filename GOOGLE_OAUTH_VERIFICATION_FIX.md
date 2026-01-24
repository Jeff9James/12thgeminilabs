# Google OAuth "Access Blocked" Error - Fix Guide

## Error Message

```
Access blocked: web-production-cc201.up.railway.app has not completed the Google verification process

The app is currently being tested, and can only be accessed by developer-approved testers. 
If you think you should have access, contact the developer.

Error 403: access_denied
```

## Root Cause

Your Google OAuth app is in **"Testing" mode** in Google Cloud Console. In testing mode:
- ❌ Only approved test users (up to 100) can use the app
- ❌ Your email needs to be added as a test user
- ❌ Random users cannot log in

## Solution (Choose One)

You have **TWO options** to fix this:

### Option 1: Add Your Email as Test User (Quick - 2 minutes)

**Best for:** Development, testing, private use

**Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)

2. Select your project (the one with your OAuth credentials)

3. Go to **APIs & Services** → **OAuth consent screen**

4. You'll see: 
   ```
   Publishing status: Testing
   ```

5. Scroll down to **"Test users"** section

6. Click **"+ ADD USERS"**

7. Add your email(s):
   ```
   drtajamesgmail.com  (your Gmail address)
   ```
   
   You can add up to 100 test users

8. Click **"SAVE"**

9. **Try logging in again** - Should work now!

### Option 2: Publish the App (Takes 1-5 days)

**Best for:** Production, public use

**Important:** Google will review your app before publishing.

**Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)

2. Select your project

3. Go to **APIs & Services** → **OAuth consent screen**

4. Review your app information:
   - App name
   - User support email
   - Developer contact information
   - App logo (optional but recommended)
   - Privacy policy URL (optional but recommended)
   - Terms of service URL (optional but recommended)

5. Scroll to **"Scopes"** section
   - Make sure only necessary scopes are requested
   - For Google Drive: `https://www.googleapis.com/auth/drive.readonly`

6. Click **"PUBLISH APP"** button

7. Click **"CONFIRM"** in the dialog

8. **Wait for Google review** (typically 1-5 business days)
   - Google will review your app
   - You'll receive an email when approved
   - Status will change from "Testing" to "Published"

9. Once published, anyone can use your app!

## Recommended Approach

**For now (immediate fix):**
- ✅ Use **Option 1** - Add yourself as a test user
- This allows you to continue development and testing

**For production (later):**
- ✅ Use **Option 2** - Publish the app
- Do this when ready to launch to real users
- Ensure you have privacy policy and terms of service

## Step-by-Step: Adding Test User (Detailed)

### 1. Open Google Cloud Console

Visit: https://console.cloud.google.com

### 2. Select Your Project

In the top bar, click the project dropdown and select your OAuth project.

### 3. Navigate to OAuth Consent Screen

- Left sidebar: Click **"APIs & Services"**
- Click **"OAuth consent screen"**

### 4. Check Current Status

You should see:
```
Publishing status: Testing
User type: External
```

### 5. Add Test Users

Scroll down to find:
```
Test users
Add up to 100 test users who can access your app while it's in testing mode.

[+ ADD USERS]
```

Click the **"+ ADD USERS"** button.

### 6. Enter Email Address

A dialog will appear. Enter your email:
```
drtajamesgmail.com
```

Click **"SAVE"**.

### 7. Verify Test User Added

You should now see your email in the test users list:
```
Test users
drtajamesgmail.com     [Remove]
```

### 8. Test Again

1. Go back to your app: `https://12thgeminilabs-frontend.vercel.app`
2. Click "Import from Google Drive"
3. Click "Connect Google Drive"
4. Select your Google account: `drtajamesgmail.com`
5. **Should now show the consent screen instead of "Access blocked"**

## What You'll See After Fix

### Before Fix (Error)
```
Access blocked: web-production-cc201.up.railway.app has not completed 
the Google verification process

Error 403: access_denied
```

### After Fix (Consent Screen)
```
web-production-cc201.up.railway.app wants to access your Google Account

This will allow web-production-cc201.up.railway.app to:
□ See, edit, create, and delete all of your Google Drive files

[Cancel]  [Continue]
```

Click **"Continue"** and you'll be redirected back to your app!

## Understanding OAuth Consent Modes

### Testing Mode (Current)
- ✅ Fast setup
- ✅ No Google review needed
- ❌ Limited to 100 test users
- ❌ Must manually add each user
- ⚠️ Shows "This app isn't verified" warning

### Published Mode (After Publishing)
- ✅ Anyone can use the app
- ✅ No user limit
- ✅ Professional appearance
- ❌ Requires Google review (1-5 days)
- ❌ Need privacy policy & terms (for certain scopes)
- ℹ️ May still show "This app isn't verified" until domain verification

### Verified Mode (Enterprise)
- ✅ No warnings shown
- ✅ Full trust indicators
- ❌ Requires domain ownership verification
- ❌ More complex setup
- 💰 May require payment for certain APIs

## Scopes You're Using

Your app requests these Google Drive permissions:

```javascript
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];
```

**What this allows:**
- ✅ Read your Google Drive files (list, download)
- ✅ Read file metadata (name, size, type)
- ❌ Cannot edit or delete files
- ❌ Cannot create new files

These are **read-only** scopes, which are safer and easier to get approved.

## Common Issues

### Issue 1: "Test user already exists"
**Solution:** The email is already added. Just try logging in again.

### Issue 2: Still getting "Access blocked" after adding test user
**Solutions:**
1. Wait 1-2 minutes for changes to propagate
2. Clear browser cache and cookies
3. Try in incognito/private mode
4. Verify the correct email was added (check for typos)

### Issue 3: "Invalid OAuth client"
**Solution:** Check that:
1. `GOOGLE_CLIENT_ID` in backend matches console
2. `GOOGLE_CLIENT_SECRET` in backend is correct
3. Authorized redirect URIs include your Railway backend URL

### Issue 4: Wrong redirect URI after consent
**Solution:** Update authorized redirect URIs in Google Console:
```
https://web-production-cc201.up.railway.app/api/google-drive/auth/callback
```

## Verification Checklist

After adding yourself as a test user:

- [ ] Email added to test users list in Google Console
- [ ] Visit: `https://12thgeminilabs-frontend.vercel.app`
- [ ] Login to your app
- [ ] Click "Import from Google Drive"
- [ ] Click "Connect Google Drive"
- [ ] Select your Google account
- [ ] **Should see consent screen (NOT "Access blocked")**
- [ ] Click "Continue"
- [ ] Should redirect back to app
- [ ] Drive files should appear in modal

## Next Steps After This Fix

Once you've added yourself as a test user and verified it works:

1. ✅ **Test the full flow:**
   - List Drive files
   - Import a video
   - Verify it appears in your videos list

2. ✅ **Add other test users (if needed):**
   - Team members
   - Beta testers
   - Up to 100 total users

3. ✅ **Consider publishing later:**
   - When ready for production
   - When you have privacy policy/terms
   - When you want public access

## Security Notes

### Testing Mode is Secure
- ✅ Only approved test users can access
- ✅ OAuth tokens are still secure
- ✅ Google validates all requests
- ✅ HTTPS enforced

### When to Publish
Publish your app when:
- You're ready for public use
- You have a privacy policy
- You have terms of service
- You've thoroughly tested the integration
- You're prepared for Google's review process

## Quick Reference

**Problem:** "Access blocked" error on Google OAuth  
**Cause:** App in "Testing" mode, user not approved  
**Solution:** Add email to test users in Google Cloud Console  
**Time:** 2 minutes  
**Location:** Console → APIs & Services → OAuth consent screen → Test users  

## Status

⚠️ **ACTION REQUIRED** - You need to add your email as a test user in Google Cloud Console

📝 Follow the steps above to fix the error

✅ After adding test user, the Google Drive import will work!

---

**Need help?** Share a screenshot of your OAuth consent screen, and I can guide you through the exact steps!
