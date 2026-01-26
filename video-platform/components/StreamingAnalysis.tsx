'use client';

import { useState } from 'react';

interface ParsedAnalysis {
  summary?: string;
  scenes?: Array<{
    start: string;
    end: string;
    label: string;
    description: string;
  }>;
}

export default function StreamingAnalysis({ videoId }: { videoId: string }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [rawAnalysis, setRawAnalysis] = useState('');
  const [parsedAnalysis, setParsedAnalysis] = useState<ParsedAnalysis | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function startAnalysis() {
    setAnalyzing(true);
    setRawAnalysis('');
    setParsedAnalysis(null);
    setError('');
    setStatus('Initializing...');

    try {
      const res = await fetch(`/api/videos/${videoId}/analyze`, {
        method: 'POST'
      });

      if (!res.ok && !res.body) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                setError(data.error);
                setStatus('');
              } else if (data.done) {
                setAnalyzing(false);
                setStatus('Complete!');
                
                // Try to parse the accumulated JSON
                try {
                  // Remove markdown code blocks if present
                  let cleanText = accumulatedText.trim();
                  
                  // Remove ```json and ``` markers
                  if (cleanText.startsWith('```json')) {
                    cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
                  } else if (cleanText.startsWith('```')) {
                    cleanText = cleanText.replace(/^```\s*/, '').replace(/```\s*$/, '');
                  }
                  
                  cleanText = cleanText.trim();
                  
                  const parsed = JSON.parse(cleanText);
                  setParsedAnalysis(parsed);
                  setRawAnalysis(''); // Clear raw text once parsed
                } catch (parseError) {
                  console.error('Failed to parse final JSON:', parseError);
                  console.log('Raw text:', accumulatedText);
                  // Keep raw text if parsing fails
                }
              } else if (data.status) {
                setStatus(data.status === 'starting' ? 'Starting analysis...' : 
                         data.status === 'processing' ? 'Analyzing video with Gemini...' : 
                         data.status);
              } else if (data.text) {
                accumulatedText += data.text;
                setRawAnalysis(accumulatedText);
                setStatus('Receiving results...');
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      setStatus('');
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

      {status && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">{status}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Show raw streaming text while analyzing */}
      {analyzing && rawAnalysis && !parsedAnalysis && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-bold text-lg mb-2 text-yellow-800">
            Streaming Response...
          </h3>
          <div className="text-sm text-gray-700 max-h-60 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{rawAnalysis}</pre>
          </div>
        </div>
      )}

      {/* Show parsed analysis when complete */}
      {parsedAnalysis && (
        <div className="mt-4">
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-green-800">Summary</h3>
            <p className="text-gray-700 leading-relaxed">{parsedAnalysis.summary}</p>
          </div>
          
          {parsedAnalysis.scenes && parsedAnalysis.scenes.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-blue-800">Scene Breakdown</h3>
              <div className="space-y-3">
                {parsedAnalysis.scenes.map((scene, i) => (
                  <div key={i} className="bg-white border-l-4 border-blue-500 pl-4 py-3 rounded-r shadow-sm">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-mono text-sm text-blue-600 font-semibold">
                        [{scene.start} - {scene.end}]
                      </span>
                      <span className="font-semibold text-gray-900">{scene.label}</span>
                    </div>
                    <p className="text-sm text-gray-600">{scene.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Refresh to see cached results
          </button>
        </div>
      )}
    </div>
  );
}
