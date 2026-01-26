'use client';

import { useEffect, useState } from 'react';
import StreamingAnalysis from '@/components/StreamingAnalysis';
import Link from 'next/link';

// Helper function to parse timestamps like "0:05" or "1:23" to seconds
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return 0;
}

export default function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const [video, setVideo] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetch(`/api/videos/${p.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setVideo(data.data.video);
            setAnalysis(data.data.analysis);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    });
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }
  if (!video && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Video not found</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Home
        </Link>
        
        {/* Video Title */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{video.title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Uploaded: {new Date(video.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Video Preview */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {video.playbackUrl ? (
            <video 
              id="videoPlayer"
              controls
              className="w-full rounded-lg bg-black"
              preload="metadata"
            >
              <source src={video.playbackUrl} type={video.mimeType || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              <div className="text-center text-white p-8">
                <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                <p className="text-lg font-semibold mb-2">Video Preview</p>
                <p className="text-sm opacity-75">Video not available for playback</p>
              </div>
            </div>
          )}
        </div>

        {/* Analysis Section */}
        {analysis ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
              <span className="text-sm text-gray-500">
                Analyzed: {new Date(analysis.createdAt).toLocaleString()}
              </span>
            </div>
            
            <div className="prose max-w-none">
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Summary</h3>
                <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
              </div>
              
              {analysis.scenes && analysis.scenes.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">Scene Breakdown</h3>
                  <p className="text-sm text-gray-600 mb-4">Click on timestamps to jump to that moment in the video</p>
                  <div className="space-y-4">
                    {analysis.scenes.map((scene: any, i: number) => (
                      <div key={i} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r hover:bg-blue-100 transition-colors">
                        <div className="flex items-baseline gap-2 mb-1">
                          <button
                            onClick={() => {
                              const videoEl = document.getElementById('videoPlayer') as HTMLVideoElement;
                              if (videoEl) {
                                const time = parseTimeToSeconds(scene.start);
                                videoEl.currentTime = time;
                                videoEl.play();
                                videoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                            className="font-mono text-sm text-blue-600 font-semibold hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                            title="Click to jump to this timestamp"
                          >
                            [{scene.start} - {scene.end}]
                          </button>
                          <span className="font-semibold text-gray-900">{scene.label}</span>
                        </div>
                        <p className="text-sm text-gray-600">{scene.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <StreamingAnalysis videoId={id} />
        )}
      </div>
    </main>
  );
}
