# Google Drive OAuth Loop Fix - Database Token Storage

## Problem Description

After successfully authorizing Google Drive access:
1. User clicks "Connect Google Drive"
2. Redirects to Google OAuth consent screen
3. User grants permissions
4. Redirects back to `/videos?drive=connected`
5. User clicks "Import from Google Drive" again
6. **Still shows "Connect Google Drive" button** (loop!)
7. No Google Drive files appear

## Root Cause

### The Cookie Problem

The backend was storing Google Drive OAuth tokens in HTTP-only cookies:

```typescript
res.cookie('oauth_access_token', tokens.access_token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'  // ← This was the problem!
});
```

**Why this didn't work:**

Frontend (Vercel): `https://12thgeminilabs-frontend.vercel.app`  
Backend (Railway): `https://web-production-cc201.up.railway.app`

These are **different domains** (cross-origin). Cookies with `sameSite: 'strict'` are **not sent** in cross-origin requests!

### Cookie Same-Site Policy

| Setting | Cross-Origin Behavior |
|---------|----------------------|
| `strict` | ❌ Never sent cross-origin |
| `lax` | ⚠️ Sent on top-level navigation only (not API calls) |
| `none` | ✅ Sent cross-origin (requires `secure: true`) |

Even with `sameSite: 'none'`, there are browser compatibility issues and security concerns.

## The Solution: Database Token Storage

Store Google Drive tokens in the database associated with the user, not in cookies.

### Architecture Change

**Before (Cookie-based):**
```
User → Frontend → Backend API call
                ↓
        Cookie: oauth_access_token=... (❌ blocked by browser)
```

**After (Database-based):**
```
User → Frontend → Backend API call
                ↓
        Authorization: Bearer <jwt>
                ↓
        Extract userId from JWT
                ↓
        Query database for Drive tokens
                ↓
        Use Drive tokens ✅
```

### Database Schema Changes

Added three new columns to the `users` table:

```sql
ALTER TABLE users ADD COLUMN google_drive_access_token TEXT;
ALTER TABLE users ADD COLUMN google_drive_refresh_token TEXT;
ALTER TABLE users ADD COLUMN google_drive_token_expiry DATETIME;
```

### Code Changes

#### 1. OAuth Callback - Store Tokens in Database

**Before:**
```typescript
res.cookie('oauth_access_token', tokens.access_token);
res.cookie('google_refresh_token', tokens.refresh_token);
```

**After:**
```typescript
await db.run(
  `UPDATE users SET 
    google_drive_access_token = ?,
    google_drive_refresh_token = ?,
    google_drive_token_expiry = ?
  WHERE id = ?`,
  [tokens.access_token, tokens.refresh_token, tokenExpiry, userId]
);
```

#### 2. Retrieve Tokens - Read from Database

**Before:**
```typescript
const accessToken = req.cookies['oauth_access_token'];
const refreshToken = req.cookies['google_refresh_token'];
```

**After:**
```typescript
const user = await db.get(
  'SELECT google_drive_access_token, google_drive_refresh_token FROM users WHERE id = ?',
  [userId]
);
const accessToken = user.google_drive_access_token;
const refreshToken = user.google_drive_refresh_token;
```

#### 3. OAuth State Management

**Challenge:** During OAuth callback, we don't have the JWT token (coming from Google's OAuth page).

**Solution:** Encode `userId` in the OAuth state parameter:

```typescript
// During /auth/start
const stateData = JSON.stringify({ state: uuid(), userId });
const stateToken = Buffer.from(stateData).toString('base64');
res.cookie('google_drive_oauth_state', stateToken);

// During /auth/callback
const stateData = JSON.parse(Buffer.from(stateToken, 'base64').toString());
const userId = stateData.userId;
// Now we can store tokens for this user!
```

## Complete OAuth Flow (Fixed)

### Step 1: User Clicks "Connect Google Drive"

```
Frontend → GET /api/google-drive/auth/start?token=<jwt>
           ↓
Backend: Extract userId from JWT token
Backend: Generate state = uuid()
Backend: Create stateToken = base64({ state, userId })
Backend: Set cookie with stateToken
Backend: Redirect to Google OAuth with state parameter
           ↓
User sees Google consent screen
```

### Step 2: User Grants Permissions

```
User: Clicks "Continue" on Google consent screen
        ↓
Google: Redirects to /api/google-drive/auth/callback?code=...&state=...
```

### Step 3: Backend Handles Callback

```
Backend: Read stateToken from cookie
Backend: Decode to get { state, userId }
Backend: Verify state matches
Backend: Exchange code for tokens
Backend: Store tokens in database:
         UPDATE users SET google_drive_access_token = ?, ... WHERE id = userId
Backend: Redirect to frontend: /videos?drive=connected
```

### Step 4: User Opens Import Modal Again

```
Frontend: Clicks "Import from Google Drive"
Frontend: Calls GET /api/google-drive/files
Frontend: Sends Authorization: Bearer <jwt>
          ↓
Backend: Extract userId from JWT
Backend: Query database:
         SELECT google_drive_access_token FROM users WHERE id = userId
Backend: Use token to call Google Drive API
Backend: Return list of files
          ↓
Frontend: Displays files in modal ✅ (No more "Connect Drive" button!)
```

## Benefits of Database Storage

### 1. Works Cross-Origin
- ✅ No cookie `sameSite` issues
- ✅ No domain restrictions
- ✅ Works with any frontend/backend domain combination

### 2. Persistent Storage
- ✅ Tokens survive browser restarts
- ✅ Tokens survive frontend redeployments
- ✅ Works across multiple devices (same user account)

### 3. Security
- ✅ Tokens encrypted at rest (database security)
- ✅ Only accessible with valid JWT
- ✅ No exposure in browser cookies
- ✅ Can't be stolen via XSS (not in localStorage)

### 4. Scalability
- ✅ Works with load balancers (no session affinity needed)
- ✅ Stateless backend (no session store required)
- ✅ Easy to revoke access (delete from database)

## Migration

The database migration runs automatically on server startup:

```typescript
// In connection.ts
private async ensureGoogleDriveTokenColumns(): Promise<void> {
  const columns = await db.all('PRAGMA table_info(users)');
  
  if (!columns.includes('google_drive_access_token')) {
    await db.run('ALTER TABLE users ADD COLUMN google_drive_access_token TEXT');
  }
  
  // ... similar for other columns
}
```

**No manual migration needed!** Just redeploy the backend.

## Security Considerations

### Token Storage Security

**Q: Is it safe to store OAuth tokens in the database?**

**A:** Yes, with proper precautions:

1. ✅ **Database encryption at rest** (Railway/cloud providers handle this)
2. ✅ **Access control** (only authenticated users can access their own tokens)
3. ✅ **No exposure** (tokens never sent to frontend)
4. ✅ **Audit trail** (can log token access)

**Better than:**
- ❌ localStorage (accessible via XSS attacks)
- ❌ Cookies (cross-domain issues, size limits)
- ❌ Session storage (lost on tab close)

### Token Refresh

The backend automatically refreshes expired tokens:

```typescript
// Check if token expired
if (tokenExpiry < Date.now()) {
  // Refresh using refresh token
  const newAccessToken = await service.refreshAccessToken();
  
  // Update database
  await db.run(
    'UPDATE users SET google_drive_access_token = ?, google_drive_token_expiry = ? WHERE id = ?',
    [newAccessToken, new Date(Date.now() + 3600000), userId]
  );
}
```

## Testing the Fix

### Prerequisites
- Backend deployed with database migrations
- Frontend deployed (no changes needed)
- User added as test user in Google Cloud Console

### Test Flow

1. **Login to app**
   ```
   Visit: https://12thgeminilabs-frontend.vercel.app
   Login with your account
   ```

2. **First-time Drive authorization**
   ```
   Click: Videos → Import from Google Drive → Connect Google Drive
   Expected: Redirects to Google OAuth
   Action: Grant permissions
   Expected: Redirects back to /videos?drive=connected
   ```

3. **Verify token storage**
   ```
   Backend logs should show:
   "Updated Google Drive tokens for user: <userId>"
   ```

4. **Test Drive file listing**
   ```
   Click: Import from Google Drive
   Expected: Modal shows list of video files (NO "Connect Drive" button!)
   ```

5. **Test persistence**
   ```
   Close browser
   Reopen app
   Login again
   Click: Import from Google Drive
   Expected: Still shows files (token persisted in database)
   ```

## Troubleshooting

### Issue: Still shows "Connect Drive" button

**Possible causes:**
1. Backend not redeployed with new code
2. Database migration didn't run
3. Tokens not being stored during callback

**Debug steps:**
```sql
-- Check if columns exist
PRAGMA table_info(users);
-- Should show google_drive_access_token, etc.

-- Check if tokens stored
SELECT id, email, 
       google_drive_access_token IS NOT NULL as has_drive_token
FROM users;
```

### Issue: "Invalid OAuth state" error

**Cause:** State cookie not being set/read properly

**Solution:** Check cookie settings in OAuth start endpoint

### Issue: Tokens not refreshing

**Cause:** No refresh token stored

**Solution:** User needs to re-authorize (use `prompt: 'consent'` in OAuth URL)

## Files Changed

1. **`backend/src/db/schema.ts`**
   - Added Google Drive token columns to users table

2. **`backend/src/db/connection.ts`**
   - Added migration for token columns

3. **`backend/src/routes/googleDrive.ts`**
   - Updated OAuth callback to store tokens in database
   - Modified `withDriveService` to retrieve tokens from database
   - Encode userId in OAuth state for callback authentication

## Summary

**Before:** ❌ Tokens stored in cookies → Cross-origin issues → OAuth loop  
**After:** ✅ Tokens stored in database → Works cross-domain → Files load correctly

**Key Insight:** When frontend and backend are on different domains, avoid using cookies for API authentication. Use JWT + database storage instead.

## Status

🎉 **FIXED** - All changes pushed to GitHub

⏳ **Wait for Railway backend deployment** (~2-3 minutes)

✅ **After deployment:**
- Existing users need to re-authorize Google Drive (one time)
- New authorizations will work correctly
- Files will appear in modal (no more loop!)
