function HomePage() {
  return (
    <div>
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Gemini Video Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-powered video understanding using Google's Gemini 3
        </p>

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
