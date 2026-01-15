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
- `POST /api/videos/upload` - Upload a video
- `GET /api/videos/:id` - Get video details
- `DELETE /api/videos/:id` - Delete a video

### Analysis
- `POST /api/videos/:id/analyze` - Analyze a video
- `GET /api/analysis/:id` - Get analysis results

### Search
- `POST /api/search/semantic` - Semantic search within videos

## Deployment

This platform can be deployed to any Node.js hosting service:

- **Vercel**: Deploy frontend and backend separately
- **Heroku**: Deploy backend with buildpack
- **Railway**: Deploy as monorepo
- **DigitalOcean**: Deploy with App Platform
- **Any VPS**: Deploy with PM2 or systemd

No Docker or container orchestration required!

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
- `videos` - Uploaded videos
- `video_analyses` - Video analysis results
- `video_timestamps` - Timestamped video insights

## License

MIT
