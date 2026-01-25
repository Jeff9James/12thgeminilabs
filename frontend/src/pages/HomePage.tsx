import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Gemini Video Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-powered video understanding using Google's Gemini
        </p>

        {/* SIMPLIFIED: Added prominent CTA button */}
        <button
          onClick={() => navigate('/videos')}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 mb-12"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload Your First Video
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Semantic Search</h3>
            <p className="text-gray-600">
              Search within videos using natural language queries
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Video Analysis</h3>
            <p className="text-gray-600">
              Automatic summaries, transcripts, and temporal understanding
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Frame Understanding</h3>
            <p className="text-gray-600">
              Real-time frame-level analysis and insights
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
