import VideoUpload from '@/components/VideoUpload';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4 text-gray-900">
          Gemini Video Analysis Platform
        </h1>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Upload your videos and get AI-powered analysis with streaming results
        </p>
        <VideoUpload />
        
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Features</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Real-time Analysis:</strong> Watch AI analyze your video with streaming responses</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Temporal Breakdown:</strong> Get precise scene detection with timestamps</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Persistent Results:</strong> Analysis cached for 48 hours</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Powered by Gemini 2.0:</strong> Latest AI model for video understanding</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
