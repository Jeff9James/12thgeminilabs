# PHASE 1: Project Foundation & Architecture Design

## TASK TITLE: Build Gemini-Powered Video Understanding Web App - Phase 1: Architecture & Project Setup

**PRIORITY: CRITICAL** - This is the foundation for all subsequent phases. No implementation errors permitted.

---

## FULL PROMPT FOR AI CODING AGENT:

You are building a production-grade web application that replicates twelvelabs.io functionality but uses Google Gemini 3 API instead of TwelveLabs API. This is CRITICAL infrastructure work.

### ARCHITECTURE REQUIREMENTS:

**Frontend Stack:**
- React 18+ with TypeScript (strict mode enabled)
- Vite bundler (NO Next.js backend—pure client-side SPA)
- State Management: Zustand (lightweight, avoid Redux complexity)
- Routing: React Router v6
- Styling: TailwindCSS + shadcn/ui components for professional UI
- Video Processing: Native WebCodecs API for frame extraction & temporal analysis
- Storage: IndexedDB via Dexie.js ORM for local caching
- Google Drive Integration: Direct OAuth 2.0 flow (client-side only, matching amurex pattern)

**Core Constraints:**
- NO Docker, NO Fly.io, NO Supabase/Firebase backend
- NO server-side code - everything runs in browser
- Deploy to static hosting: Vercel, GitHub Pages, or Netlify
- All API keys stored in .env.local, NEVER committed
- TypeScript strict mode with zero tolerance for 'any' types

### PROJECT STRUCTURE:

```
video-understanding-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── GoogleOAuthButton.tsx
│   │   │   └── AuthContext.tsx
│   │   ├── VideoUpload/
│   │   │   ├── UploadZone.tsx (drag & drop + file input)
│   │   │   └── GoogleDriveSelector.tsx (Drive file picker)
│   │   ├── VideoAnalysis/
│   │   │   ├── VideoPlayer.tsx (custom player with frame extraction)
│   │   │   ├── AnalysisPanel.tsx (results display)
│   │   │   └── SearchInterface.tsx (semantic search)
│   │   └── Dashboard/
│   │       └── RecentAnalyses.tsx (IndexedDB history)
│   ├── services/
│   │   ├── googleAuth.ts (OAuth 2.0 implementation)
│   │   ├── googleDriveApi.ts (Drive API integration)
│   │   ├── geminiApi.ts (Gemini 3 video analysis endpoints)
│   │   ├── videoProcessing.ts (WebCodecs frame extraction)
│   │   └── indexedDb.ts (Dexie.js database schema)
│   ├── hooks/
│   │   ├── useGoogleAuth.ts (auth state management)
│   │   ├── useVideoAnalysis.ts (analysis workflow)
│   │   └── useIndexedDB.ts (database operations)
│   ├── store/
│   │   └── appStore.ts (Zustand global state)
│   ├── types/
│   │   └── index.ts (all TypeScript interfaces)
│   ├── utils/
│   │   ├── constants.ts (API endpoints, mime types)
│   │   └── helpers.ts (formatting, validation)
│   ├── App.tsx (main router)
│   ├── main.tsx (entry point)
│   └── index.css (Tailwind directives)
├── .env.local (Google OAuth Client ID, Gemini API Key)
├── vite.config.ts
├── tsconfig.json (strict mode)
├── tailwind.config.js
└── package.json
```

**KEY DEPENDENCIES** (use pnpm for installation):

```json
{
  "dependencies": {
    "@google-cloud/local-auth": "^3.0.0",
    "@google/generative-ai": "^0.2.1",
    "zustand": "^4.5.2",
    "dexie": "^3.2.4",
    "idb": "^8.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3"
  },
  "devDependencies": {
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@typescript-eslint/eslint-plugin": "^7.1.1",
    "@typescript-eslint/parser": "^7.1.1",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.2.2",
    "vite": "^5.1.6",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35"
  }
}
```

### TYPESCRIPT INTERFACES (types/index.ts):

```typescript
export interface VideoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  duration: number;
  thumbnailUrl?: string;
  file?: File;
  driveFileId?: string;
  uploadDate: Date;
}

export interface AnalysisResult {
  id: string;
  videoId: string;
  videoName: string;
  status: 'processing' | 'completed' | 'failed';
  summary?: {
    title: string;
    description: string;
    keyTopics: string[];
  };
  temporalSegments?: Array<{
    startTime: number;
    endTime: number;
    description: string;
    keyFrames: string[]; // base64 encoded thumbnails
  }>;
  spatialAnalysis?: {
    objectsDetected: Array<{
      label: string;
      confidence: number;
      timestamp: number;
      boundingBox?: { x: number; y: number; width: number; height: number };
    }>;
    sceneChanges: Array<{
      timestamp: number;
      description: string;
    }>;
  };
  createdAt: Date;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    safetyRatings: any[];
  }>;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: {
    email: string;
    name: string;
    picture: string;
  } | null;
}

export interface SearchResult {
  videoId: string;
  timestamp: number;
  relevance: number;
  context: string;
  thumbnail?: string;
}
```

### DELIVERABLES FOR PHASE 1:

1. Complete folder structure with all directories created
2. package.json with exact dependencies (use pnpm install)
3. .env.local template with required API keys:
   ```
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```
4. vite.config.ts configured for React + TypeScript
5. tsconfig.json with strict mode enabled (noImplicitAny: true, strictNullChecks: true, etc.)
6. tailwind.config.js with proper content paths
7. TypeScript interfaces in types/index.ts (complete set above)
8. Basic App.tsx scaffold with React Router
9. README.md with setup instructions & architecture diagram
10. .gitignore with .env.local, node_modules, dist
11. GitHub Actions workflow for static build (if using GitHub Pages)
12. index.html with proper meta tags and CSP headers

**NO CODE IMPLEMENTATION YET—JUST SCAFFOLDING & STRUCTURE.**

### ACCEPTANCE CRITERIA:

```bash
pnpm install # succeeds without warnings
pnpm run dev # starts Vite dev server on http://localhost:5173
pnpm run typecheck # zero TypeScript errors in strict mode
pnpm run lint # zero ESLint warnings
pnpm run build # production build succeeds
```

- Folder structure matches specification exactly
- .env.local template includes all required keys with placeholder values
- All imports resolve correctly
- TypeScript strict mode passes with zero 'any' types
- Project uses only client-side technologies (no Node.js server code)
- GitHub Actions workflow configured for CI/CD if using GitHub Pages
- README includes clear setup instructions and architecture overview