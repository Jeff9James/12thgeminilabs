# 🎬 Gemini 3 Video Understanding - Complete Development Roadmap

## **Executive Summary**
This is a **9-Phase production-ready development plan** to build a web application that clones twelvelabs.io functionality using Google Gemini 3's temporal and spatial reasoning capabilities instead of TwelveLabs API. The app enables users to analyze videos directly from their Google Drive or local uploads with comprehensive AI insights.

### **Core Features**
- ✅ **No Backend Server**: Pure client-side React + TypeScript (no Supabase, Docker, Fly.io)
- ✅ **Google Drive Integration**: Direct OAuth 2.0 following amurex pattern
- ✅ **Gemini 3 Multimodal AI**: Video analysis with temporal & spatial reasoning
- ✅ **Client-Side Video Processing**: WebCodecs API for frame extraction
- ✅ **Local Data Persistence**: IndexedDB with Dexie.js ORM
- ✅ **Professional UI**: shadcn/ui components with TailwindCSS
- ✅ **Production Ready**: Complete testing, deployment, monitoring

---

## **Quick Start for AI Coding Agent**

### **1. Read Phase 1 First (Architecture)**
- Sets up complete folder structure
- Configures TypeScript strict mode
- Installs all dependencies with pnpm
- Creates project scaffolding
- **Do NOT proceed until Phase 1 passes all acceptance criteria**

### **2. Follow Phases Sequentially**
Each phase depends on the previous one. Follow the order strictly to avoid breaking dependencies:
1. Setup → 2. Auth → 3. Drive → 4. Processing → 5. Gemini → 6. Reasoning → 7. Storage → 8. UI → 9. Production

### **3. Acceptance Criteria Are MANDATORY**
Each phase has strict requirements marked with ✅. All must pass before starting the next phase. These are not suggestions—they are requirements for production-grade code.

### **4. Use pnpm, Not npm or yarn**
```bash
pnpm install            # Installs all dependencies
pnpm run dev            # Starts dev server
pnpm run build          # Production build
pnpm run typecheck      # TypeScript validation
pnpm run lint           # ESLint validation
```

### **5. Environment Variables Required**
Create `.env.local` file:
```
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Do NOT commit `.env.local` to git. Add to `.gitignore`.**

---

## **Phase Dependencies & Flow**

```
Phase 1 → Phase 2 → Phase 3
   ↓        ↓         ↓
Phase 8 ← Phase 7 ← Phase 4
   ↑        ↑         ↓
Phase 9 ← Phase 6 ← Phase 5
```

### **Data Flow:**
1. **User authenticates** (Phase 2)
2. **Selects video** from Drive or uploads (Phase 3 & 4)
3. **Video processed** with WebCodecs, frames extracted (Phase 4)
4. **Gemini 3 analyzes** frames and metadata (Phase 5)
5. **Reasoning engine enhances** outputs (Phase 6)
6. **Results saved** to IndexedDB (Phase 7)
7. **Dashboard displays** comprehensive analysis (Phase 8)
8. **App deployed** to production (Phase 9)

---

## **Critical Technical Requirements**

### **Constraints (Non-Negotiable)**
- ❌ NO Docker, NO Fly.io, NO Supabase backend
- ❌ NO server-side code - pure client-side SPA
- ❌ NO API keys exposed in client code (use .env.local)
- ❌ Tokens stored in memory, NEVER localStorage
- ❌ Maximum video size: 500MB enforced
- ❌ TypeScript strict mode: zero 'any' types allowed
- ❌ All TypeScript errors must be resolved before commit

### **Performance Targets**
- First load: < 2 seconds on 3G
- Video upload: Progress updates every 100ms
- Gemini analysis: < 30 seconds per batch
- UI renders: < 16ms (60fps)
- Memory stable: < 200MB total usage
- Lighthouse score: > 90 (all categories)

### **Testing Requirements**
- Unit test coverage: > 80%
- Component test coverage: > 75%
- E2E tests for all critical flows
- CI/CD pipeline: All tests must pass before merge
- Bundle size: < 500KB (gzipped)

---

## **Common Setup Commands**

### **Initialize Project (Phase 1)**
```bash
git clone <repository-url>
cd video-understanding-app
pnpm install
pnpm run dev                  # Verify dev server starts
cp .env.local.template .env.local  # Add your API keys
pnpm run typecheck          # Zero TypeScript errors expected
pnpm run lint               # Zero lint warnings expected
```

### **Development Workflow**
```bash
pnpm run dev                # Start development server
pnpm run test               # Run all tests locally
pnpm run test:watch         # Run tests in watch mode
pnpm run test:ci            # Run tests in CI mode
pnpm run build              # Create production build
pnpm run preview            # Preview production build locally
```

### **Production Deployment**
```bash
pnpm run build              # Create production build
pnpm run deploy:vercel       # Deploy to Vercel (recommended)
# OR
pnpm run deploy:netlify      # Deploy to Netlify
# OR
pnpm run deploy:gh-pages     # Deploy to GitHub Pages
```

---

## **Phase-Specific Notes**

### **Phase 1: Foundation**
- **CRITICAL**: Must be completed first. Do not skip.
- Creates complete folder structure
- Configures all tooling and dependencies
- Sets up TypeScript strict mode
- **Acceptance criteria**: `pnpm run dev` works, TypeScript 0 errors

### **Phase 2: Google OAuth**
- Follows amurex pattern (client-side only)
- Implements PKCE for security
- Tokens stored in memory (NOT localStorage)
- Session expires after 1 hour (Google default)
- **Test**: Sign in → verify token → sign out → verify revoked

### **Phase 3: Google Drive**
- Uses Drive API v3
- Lists video files only (filters by MIME type)
- Handles pagination for >100 files
- Downloads in chunks for large files (>50MB)
- **Test**: Connect Drive → List videos → Download → Analyze

### **Phase 4: Video Processing**
- Uses WebCodecs API (Chrome 94+, Edge 94+)
- Extracts 30 keyframes per video
- Generates thumbnail from first frame
- Web Worker for heavy processing (non-blocking UI)
- **Test**: Process MP4 → Verify 30 frames → Check thumbnails

### **Phase 5: Gemini 3**
- Uses gemini-1.5-pro model
- Batching: 10 frames per API call
- Rate limiting: 1 second between requests
- 5 analysis types: summary, temporal, spatial, search, Q&A
- **Test**: Full analysis → Verify all 5 types → Check JSON parsing

### **Phase 6: Reasoning Engine**
- Enhances raw Gemini outputs
- Temporal continuity scoring (0-1)
- Object tracking across frames
- Narrative arc detection
- **Test**: Enhanced results have reasoning layer → Confidence scores present

### **Phase 7: IndexedDB**
- Uses Dexie.js for TypeScript ORM
- Stores videos, analyses, frames, preferences
- Automatic cleanup of old data (>30 days)
- Storage quota monitoring (>80% triggers cleanup)
- **Test**: Save video → Save analysis → Reload data → Verify persistence

### **Phase 8: UI Dashboard**
- Custom video player with controls
- Keyboard shortcuts (space, arrows, f, m)
- Analysis panel with 4 tabs
- Export options (JSON, PDF, share)
- **Test**: All controls work → Tabs switch → Export buttons functional

### **Phase 9: Production**
- 80%+ test coverage required
- Bundle size < 500KB enforced
- Lighthouse score > 90
- CI/CD pipeline with GitHub Actions
- **Test**: Build passes → Tests pass → Deploy succeeds → Smoke tests pass

---

## **Troubleshooting Guide**

### **"TypeScript errors"**
- Ensure all types in types/index.ts are correct
- Check imports match Phase 1 folder structure
- Run `pnpm run typecheck` to see specific errors

### **"Google OAuth fails"**
- Verify VITE_GOOGLE_CLIENT_ID is correct
- Check Google Cloud Console OAuth settings
- Ensure redirect URI matches `window.location.origin + '/auth/callback'`
- Make sure no backend server is involved (pure client-side)

### **"Gemini API errors"**
- Verify VITE_GEMINI_API_KEY is correct
- Check rate limiting (1s between requests)
- Ensure frames are properly formatted for Gemini
- Try simpler prompt if complex JSON parsing fails

### **"IndexedDB quota exceeded"**
- Delete old videos from history
- Cleanup runs automatically every hour
- Use `db.delete()` to manually clear data
- Check `indexedDb.ts` cleanup configuration

### **"WebCodecs not supported"**
- Browser must be Chrome 94+ or Edge 94+
- Feature detection: `videoProcessor.isSupported()`
- Fallback to HTML5 video element method
- Show user warning about reduced functionality

### **"Build fails"**
- Check bundle size (< 500KB limit)
- Verify environment variables configured
- Ensure no console.log statements left (use console.warn/error)
- Check `vite.config.ts` production settings

---

## **Performance Optimization Tips**

**During Development:**
- Use React.memo for expensive components
- Implement virtual scrolling for long lists
- Debounce user input (search, seek)
- Lazy load non-critical components
- Optimize images and thumbnails

**During Video Processing:**
- Use Web Worker for frame extraction
- Batch Gemini API calls (10 frames per call)
- Stream responses when possible
- Progressive loading for long videos
- Cancel processing if user navigates away

**In Production:**
- Enable Brotli compression
- Serve from CDN
- Set proper Cache-Control headers
- Implement Service Worker
- Monitor bundle size on each PR

---

## **Security Checklist**

- ✅ API keys in .env.local (not committed)
- ✅ OAuth tokens stored in memory only
- ✅ HTTPS enforced in production
- ✅ Content Security Policy headers
- ✅ CORS configured properly
- ✅ Input validation on file uploads
- ✅ XSS prevention (React escaping)
- ✅ Dependency security audits
- ✅ No sensitive data in URLs
- ✅ Error messages don't leak tokens

---

## **Scaling Considerations**

**User Growth:**
- Each user's data stored in their own IndexedDB (no shared state)
- No backend means no server scaling issues
- CDN handles traffic spikes
- Gemini API quota is per-project (easy to upgrade)

**Data Volume:**
- Automatic cleanup after 30 days
- Storage quota at browser level (~60% of available disk)
- Export/import as backup strategy
- Encourage users to delete old videos

**Performance:**
- IndexedDB queries are O(log n)
- Gemini API rate limiting prevents overload
- Client-side processing = infinite horizontal scaling
- Web Workers prevent UI blocking

---

## **AI Agent Implementation Notes**

When giving these phases to an AI coding agent:

1. **Give one phase at a time** - Don't overwhelm with all 9 phases
2. **Wait for phase completion** - Ensure all acceptance criteria pass
3. **Review code** - Check for TypeScript errors, test coverage
4. **Proceed sequentially** - Don't skip phases
5. **Test manually** - Verify with real videos, not just unit tests
6. **Check performance** - Measure bundle size, load times
7. **Validate UX** - Ensure intuitive user interface
8. **Security audit** - Verify no API keys exposed
9. **Production ready** - Run full E2E test suite
10. **Document** - Update README with setup instructions

---

## **Success Metrics**

The project is successful when:

- ✅ Upload video from Google Drive and see file list
- ✅ Upload local video via drag-and-drop
- ✅ Extract 30 frames in < 10 seconds
- ✅ Gemini analysis completes in < 30 seconds
- ✅ Results show reasonable continuity scores
- ✅ Timeline displays colored segments
- ✅ Objects detected with confidence scores
- ✅ Search returns relevant timestamp results
- ✅ Q&A answers specific questions
- ✅ Exports JSON/PDF of analysis
- ✅ All data persists across browser restarts
- ✅ Lighthouse score > 90
- ✅ No console errors in production

---

## **Next Steps for AI Coding Agent**

1. **Start with Phase 1** - Build project foundation
2. **Follow sequentially** - Don't skip phases
3. **Verify each phase** - All acceptance criteria must pass
4. **Test with real videos** - Not just mocks
5. **Measure performance** - Track metrics throughout
6. **Document everything** - Clear commit messages
7. **Review security** - No credentials exposed
8. **Production deployment** - After Phase 9 passes

**Good luck! This is a complex but achievable project when following these phases methodically.**

---

**Created for the Gemini 3 Video Understanding Application**
**9 Phases | 20+ Services | 40+ Components | 100% Client-Side | Production-Ready**
