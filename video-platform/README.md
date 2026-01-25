# Gemini Video Analysis Platform

A modern video analysis platform powered by Gemini 2.0 Flash with streaming responses.

## 🚀 Features

- **Real-time Streaming Analysis**: Watch AI analyze your video as it processes
- **Temporal Scene Detection**: Precise scene breakdown with timestamps
- **Persistent Storage**: Results cached using Vercel KV (48-hour retention)
- **Zero-cost Deployment**: Runs entirely on free tiers (Vercel + Gemini)
- **Modern Stack**: Next.js 15 + App Router + Edge Runtime

## 📋 Prerequisites

Before deploying, you need:

1. **Gemini API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Vercel Account** (free tier)
3. **Node.js 18+** installed locally

## 🔧 Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.local` and fill in your API keys:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Auth secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_here

# Vercel KV (auto-injected after deployment)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🌐 Deployment to Vercel

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Link Project

```bash
vercel link
```

### Step 4: Create Vercel KV Database

```bash
vercel kv create
```

When prompted:
- Enter a name (e.g., `video-platform-kv`)
- Select the same project you linked

### Step 5: Add Environment Variables

```bash
vercel env add GEMINI_API_KEY
```

Paste your Gemini API key when prompted.

Optionally add other variables:
```bash
vercel env add JWT_SECRET
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
```

### Step 6: Deploy to Production

```bash
vercel --prod
```

Your app will be live at `https://your-project.vercel.app`!

## 📁 Project Structure

```
video-platform/
├── app/
│   ├── api/
│   │   ├── upload/              # Video upload endpoint
│   │   │   └── route.ts
│   │   └── videos/[id]/
│   │       ├── route.ts         # Get video metadata
│   │       └── analyze/         # Streaming analysis endpoint
│   │           └── route.ts
│   ├── videos/[id]/
│   │   └── page.tsx             # Video detail page
│   ├── page.tsx                 # Home page
│   └── globals.css
├── components/
│   ├── VideoUpload.tsx          # Upload form component
│   └── StreamingAnalysis.tsx   # Real-time analysis display
├── lib/
│   ├── gemini.ts                # Gemini API client
│   └── kv.ts                    # Vercel KV storage wrapper
└── .env.local                   # Environment variables
```

## 🎯 How It Works

1. **Upload**: User uploads video → Saved to Gemini File API
2. **Processing**: Gemini processes video (usually 10-30 seconds)
3. **Analysis**: User clicks "Analyze" → Streaming response from Gemini 2.0
4. **Storage**: Complete analysis cached in Vercel KV for 48 hours
5. **Display**: Results shown with scene breakdowns and timestamps

## 🔑 Key Technologies

- **Next.js 15**: React framework with App Router
- **Gemini 2.0 Flash**: Latest multimodal AI model
- **Vercel KV**: Redis-compatible key-value storage
- **Edge Runtime**: Enables streaming responses
- **Tailwind CSS**: Utility-first styling

## 📊 API Endpoints

### POST `/api/upload`
Upload video to Gemini File API
- **Body**: FormData with `video` file
- **Returns**: `{ success: true, videoId: string, geminiFileUri: string }`

### POST `/api/videos/[id]/analyze`
Start streaming video analysis
- **Returns**: Server-Sent Events stream with analysis chunks

### GET `/api/videos/[id]`
Get video metadata and cached analysis
- **Returns**: `{ video: {...}, analysis: {...} }`

## 🐛 Troubleshooting

### Issue: "KV is not defined"
**Solution**: Pull KV credentials locally
```bash
vercel env pull .env.local
```

### Issue: Upload fails with timeout
**Solution**: Gemini File API needs time to process. The upload endpoint waits automatically.

### Issue: Streaming not working
**Solution**: Ensure `export const runtime = 'edge';` is in analyze route.

### Issue: Cannot find module '@/lib/gemini'
**Solution**: Check tsconfig.json has correct path mapping for `@/*`

## 🚀 Next Steps

- [ ] Add user authentication
- [ ] Implement video player with seek-to-timestamp
- [ ] Add multiple video format support
- [ ] Create shareable analysis links
- [ ] Add export to PDF/JSON

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! This is a hackathon project built for learning.

---

Built with ❤️ using Gemini 2.0 Flash
