function SearchPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Semantic Search
      </h1>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search within videos..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium">
          Search
        </button>

        <div className="mt-8">
          <p className="text-gray-600 text-center py-8">
            Search results will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SearchPage;
