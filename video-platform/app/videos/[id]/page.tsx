import StreamingAnalysis from '@/components/StreamingAnalysis';
import { getVideo, getAnalysis } from '@/lib/kv';
import Link from 'next/link';

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideo(id) as any;
  const analysis = await getAnalysis(id);

  if (!video) {
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
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold mb-4 text-gray-900">{video.title}</h1>
          
          <div className="mb-6 text-gray-600">
            <p><strong>Uploaded:</strong> {new Date(video.createdAt).toLocaleString()}</p>
            <p><strong>Status:</strong> <span className="text-green-600">{video.status}</span></p>
            <p className="text-sm text-gray-500 mt-2">Video ID: {video.id}</p>
          </div>
        </div>

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
                  <div className="space-y-4">
                    {analysis.scenes.map((scene, i) => (
                      <div key={i} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r">
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
            </div>
          </div>
        ) : (
          <StreamingAnalysis videoId={id} />
        )}
      </div>
    </main>
  );
}
