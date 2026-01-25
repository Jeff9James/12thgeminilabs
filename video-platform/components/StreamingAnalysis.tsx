'use client';

import { useState } from 'react';

export default function StreamingAnalysis({ videoId }: { videoId: string }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');

  async function startAnalysis() {
    setAnalyzing(true);
    setAnalysis('');
    setError('');

    try {
      const res = await fetch(`/api/videos/${videoId}/analyze`, {
        method: 'POST'
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              setError(data.error);
            } else if (data.done) {
              setAnalyzing(false);
            } else if (data.text) {
              setAnalysis(prev => prev + data.text);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <button 
        onClick={startAnalysis}
        disabled={analyzing}
        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {analyzing ? 'Analyzing...' : 'Analyze Video'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {analysis && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-bold text-lg mb-2">
            {analyzing ? 'Analysis (Streaming...)' : 'Analysis Complete'}
          </h3>
          <pre className="whitespace-pre-wrap text-sm">{analysis}</pre>
        </div>
      )}
    </div>
  );
}
