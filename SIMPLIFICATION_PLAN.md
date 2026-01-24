# Simplified Video Analysis Platform - Implementation Plan

## Goal
Create a working demo video analysis platform using Gemini AI for the hackathon.
Remove complexity, focus on core features that actually work.

## Simplifications

### What We're REMOVING:
- ❌ User authentication (no login/signup)
- ❌ Google Drive import
- ❌ User accounts and personal libraries
- ❌ Complex processing queue
- ❌ Bookmarks and chat history
- ❌ Rate limiting
- ❌ Refresh tokens

### What We're KEEPING:
- ✅ Video upload (chunked, up to 2GB)
- ✅ Gemini video analysis
- ✅ Video playback
- ✅ Search functionality
- ✅ Scene detection
- ✅ Video summary
- ✅ Simple chat with video

## Implementation Phases

### Phase 1: Remove Authentication ✅ (Current)
**Backend:**
- Remove `authenticate` middleware from routes
- Create single "demo" user in database
- All videos belong to demo user
- Remove auth routes

**Frontend:**
- Remove login page
- Remove auth context
- Remove token management
- Direct to video page on load

**Files to Modify:**
- `backend/src/middleware/auth.ts` - disable auth check
- `backend/src/routes/*.ts` - remove authenticate middleware
- `frontend/src/hooks/useAuth.tsx` - simplify
- `frontend/src/App.tsx` - remove login routing
- `frontend/src/pages/LoginPage.tsx` - delete

### Phase 2: Simplify Video Upload
**Backend:**
- Fix stream endpoint CORS (already done)
- Ensure chunks work properly
- Add simple processing trigger

**Frontend:**
- Hide Google Drive import
- Keep upload button
- Show upload progress
- Redirect to video after upload

### Phase 3: Add Basic Gemini Analysis
**Backend:**
- Create simple analysis endpoint
- Direct Gemini API call (no queue)
- Generate summary on upload
- Basic scene detection

**Frontend:**
- Show analysis results
- Simple search interface
- Display scenes

### Phase 4: Clean UI
- Remove unused components
- Simplify navigation
- Clean, modern design
- Focus on demo quality

---

## Phase 1 Implementation - START HERE

### Step 1.1: Create Demo User
Create a single user in database that all videos belong to.

### Step 1.2: Disable Auth Middleware
Make authenticate middleware a no-op that just sets demo user.

### Step 1.3: Remove Frontend Auth
Remove login page and auth context, direct to videos page.

### Step 1.4: Test
Upload a video and verify it works without login.

---

## Success Criteria

After all phases:
- ✅ Anyone can visit site and upload video
- ✅ Video uploads and plays back
- ✅ Gemini analyzes the video
- ✅ Can search video content
- ✅ Clean, simple UI
- ✅ No errors or broken features visible
- ✅ Demo-ready for hackathon

## Timeline
- Phase 1: 15-20 minutes
- Phase 2: 10 minutes
- Phase 3: 30 minutes
- Phase 4: 20 minutes
**Total: ~1.5 hours**

Much faster than debugging the complex auth system!
