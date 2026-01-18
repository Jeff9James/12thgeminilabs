# Gemini Video Platform

An AI-powered video understanding platform using Google's Gemini 3 API, inspired by TwelveLabs.io.

## Features

- Deep semantic search within videos using natural language
- Dynamic video-to-text generation (summaries, reports)
- Video embeddings and temporal/spatial reasoning
- Real-time frame understanding
- Google OAuth authentication
- Local file storage or Firebase Storage support

## Technology Stack

- **Frontend**: React 18+ with TypeScript (Vite)
- **Backend**: Express.js (Node.js) with TypeScript
- **Database**: SQLite (single file, zero deployment complexity)
- **Authentication**: Google OAuth with JWT tokens
- **Video Storage**: Local filesystem or Firebase Storage
- **AI**: Google Generative AI SDK (Gemini 3)

## Project Structure

```
gemini-video-platform/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
├── backend/           # Express backend application
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── models/
│   │   ├── types/
│   │   ├── db/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── shared/            # Shared types and constants
│   ├── types.ts
│   └── constants.ts
└── .env.example
```

### Monorepo / npm workspaces

This repo uses npm workspaces. Running `npm install` from the repository root installs all packages and (via the root `postinstall` hook) builds the `shared` package into `shared/dist`.

If the build ever fails, you can get full TypeScript diagnostics by running:

```bash
cd shared && npm run build
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Project with:
  - Generative Language API enabled
  - OAuth 2.0 credentials

### Environment Configuration

1. Copy `.env.example` to `.env` in the backend directory:

```bash
cp .env.example backend/.env
```

2. Fill in the required environment variables:

```env
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Database Configuration
DATABASE_PATH=./database.db

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Video Storage Configuration
VIDEO_STORAGE_TYPE=local
VIDEO_STORAGE_PATH=./videos

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
```

### Installation

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Install frontend dependencies:

```bash
cd ../frontend
npm install
```

### Running the Application

1. Start the backend server (port 3001):

```bash
cd backend
npm run dev
```

2. In a new terminal, start the frontend (port 3000):

```bash
cd frontend
npm run dev
```

3. Access the application at `http://localhost:3000`

4. Verify the backend health check:

```bash
curl http://localhost:3001/api/health
```

### Building for Production

**Backend:**

```bash
cd backend
npm run build
npm start
```

**Frontend:**

```bash
cd frontend
npm run build
npm run preview
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Authentication
- `POST /api/auth/google` - Authenticate with Google OAuth
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Videos
- `GET /api/videos` - List user's videos
- `POST /api/videos/upload` - Upload video chunk
- `POST /api/videos/finalize` - Finalize chunked upload
- `GET /api/videos/:id` - Get video details
- `GET /api/videos/:id/stream` - Stream video with range support
- `DELETE /api/videos/:id` - Delete a video

### Video Analysis (Gemini 3)
- `POST /api/videos/:id/analyze` - Generic analysis endpoint (returns job ID for async processing)
- `GET /api/videos/:id/analysis/:jobId` - Get analysis status and results
- `POST /api/videos/:id/summarize` - Generate video summary with key points
- `POST /api/videos/:id/scenes` - Detect scenes/chapters with timestamps
- `POST /api/videos/:id/search` - Search for specific moments (body: `{query: "text"}`)
- `POST /api/videos/:id/chat` - Chat about video content (body: `{message: "question", conversationId?: "id"}`)

## Deployment

### 🚀 Quick Start

Deploy in 10 minutes with our [Quick Start Deployment Guide](QUICK_START_DEPLOYMENT.md).

**Railway users:** If you are using Railway "Shared Variables", read [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) to ensure your backend service explicitly inherits them (missing Shared Variable references are a common cause of `npm error code 1` startup crashes).

### Supported Platforms

This platform can be deployed to any Node.js hosting service:

- **Railway** (Recommended ⭐) - Free tier, simple setup, no Docker required
- **Render** - Free tier with preview deployments
- **VPS** (DigitalOcean, Linode, Vultr) - Full control, most cost-effective at scale
- **Vercel** - Frontend hosting (always free, best performance)

No Docker or container orchestration required!

### Documentation

- [Quick Start Deployment Guide](QUICK_START_DEPLOYMENT.md) - Get deployed in 10 minutes
- [Railway Setup Guide](RAILWAY_SETUP.md) - Fix Railway Shared Variables configuration issues
- [Full Deployment Guide](DEPLOYMENT.md) - Comprehensive deployment documentation
- [Monitoring Guide](MONITORING.md) - Performance optimization and monitoring

### Key Features

- ✅ Built-in health checks and metrics
- ✅ Automatic SSL/HTTPS
- ✅ Persistent data storage
- ✅ Rate limiting and security
- ✅ Comprehensive logging
- ✅ Easy rollback and backups
- ✅ Zero-downtime deployments (on supported platforms)

### Production Ready Features

- **Security**: Helmet middleware, rate limiting, input validation
- **Performance**: Gzip compression, response caching, code splitting
- **Monitoring**: Health endpoints, metrics collection, error tracking
- **Logging**: Structured logging with request IDs
- **Persistence**: Automatic database migrations, video storage management

## Development

### TypeScript Compilation

Both frontend and backend compile TypeScript without errors:

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Database Schema

The SQLite database is automatically initialized with the following tables:

- `users` - User accounts
- `videos` - Uploaded videos with metadata
- `video_analyses` - Legacy video analysis results
- `video_timestamps` - Legacy timestamped video insights
- `analyses` - Gemini analysis jobs and cached results
- `conversations` - Multi-turn video chat conversations

### Gemini 3 Video Understanding

The platform uses Google's Gemini 1.5 Pro model for advanced video understanding:

**Features:**
- **Summarization**: Generates comprehensive summaries with key points and themes
- **Scene Detection**: Automatically breaks videos into timestamped chapters
- **Semantic Search**: Finds specific moments matching natural language queries
- **Video Chat**: Multi-turn conversations about video content with context awareness

**Processing Strategy:**
- Videos < 50MB: Processed synchronously, immediate results
- Videos > 50MB: Queued for async processing, poll for results via job ID
- Results cached for 24 hours to avoid duplicate API calls
- Automatic retry (up to 3 times) on transient failures
- 10-minute timeout for processing jobs

**Example Usage:**

```bash
# Summarize a video
curl -X POST http://localhost:3001/api/videos/:videoId/summarize \
  -H "Authorization: Bearer YOUR_TOKEN"

# Detect scenes
curl -X POST http://localhost:3001/api/videos/:videoId/scenes \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search for specific moments
curl -X POST http://localhost:3001/api/videos/:videoId/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "person wearing red shirt"}'

# Chat about video
curl -X POST http://localhost:3001/api/videos/:videoId/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What happens at the beginning?"}'
```

## License

MIT
