'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { FileCategory } from '@/lib/fileTypes';

interface ParsedAnalysis {
  summary?: string;
  // Video-specific
  scenes?: Array<{
    start: string;
    end: string;
    label: string;
    description: string;
  }>;
  transcription?: string;
  // Image-specific
  objects?: string[];
  ocrText?: string;
  setting?: string;
  style?: string;
  colors?: string[];
  // Audio-specific
  speakers?: Array<{
    name: string;
    segments: Array<{ start: string; end: string }>;
  }>;
  keyMoments?: Array<{
    timestamp: string;
    description: string;
  }>;
  topics?: string[];
  audioCharacteristics?: string;
  // PDF/Document-specific
  documentType?: string;
  sections?: Array<{
    title: string;
    content: string;
  }>;
  dataHighlights?: string[];
  conclusions?: string;
  // Spreadsheet-specific
  purpose?: string;
  structure?: string;
  keyMetrics?: Array<{ name: string; value: string }>;
  trends?: string[];
  notablePoints?: string[];
  // Text-specific
  contentType?: string;
  themes?: string[];
  writingStyle?: string;
  importantInfo?: string[];
  // Common
  keyPoints?: string[];
  description?: string;
}

interface StreamingAnalysisProps {
  fileId: string;
  category: FileCategory;
  onAnalysisComplete?: (analysis: any) => void;
}

// Helper function to update lastUsedAt in localStorage
function updateFileLastUsed(fileId: string) {
  try {
    const storedFiles = localStorage.getItem('uploadedFiles');
    if (storedFiles) {
      const files = JSON.parse(storedFiles);
      const fileIndex = files.findIndex((f: any) => f.id === fileId);
      if (fileIndex !== -1) {
        files[fileIndex].lastUsedAt = new Date().toISOString();
        localStorage.setItem('uploadedFiles', JSON.stringify(files));
      }
    }
    
    // Also check legacy uploadedVideos
    const storedVideos = localStorage.getItem('uploadedVideos');
    if (storedVideos) {
      const videos = JSON.parse(storedVideos);
      const videoIndex = videos.findIndex((v: any) => v.id === fileId);
      if (videoIndex !== -1) {
        videos[videoIndex].lastUsedAt = new Date().toISOString();
        localStorage.setItem('uploadedVideos', JSON.stringify(videos));
      }
    }
  } catch (error) {
    console.error('Error updating lastUsedAt:', error);
  }
}

export interface StreamingAnalysisHandle {
  startAnalysis: () => void;
}

const StreamingAnalysis = forwardRef<StreamingAnalysisHandle, StreamingAnalysisProps>(
  ({ fileId, category, onAnalysisComplete }, ref) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [rawAnalysis, setRawAnalysis] = useState('');
  const [parsedAnalysis, setParsedAnalysis] = useState<ParsedAnalysis | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // Expose startAnalysis function to parent via ref
  useImperativeHandle(ref, () => ({
    startAnalysis
  }));

  const getAnalyzeButtonText = () => {
    if (analyzing) return 'Analyzing...';
    switch (category) {
      case 'video': return 'Analyze Video';
      case 'image': return 'Analyze Image';
      case 'audio': return 'Analyze Audio';
      case 'pdf': return 'Analyze PDF';
      case 'document': return 'Analyze Document';
      case 'spreadsheet': return 'Analyze Spreadsheet';
      case 'text': return 'Analyze Text';
      default: return 'Analyze File';
    }
  };

  const getProcessingText = () => {
    switch (category) {
      case 'video': return 'Analyzing video with Gemini...';
      case 'image': return 'Analyzing image with Gemini...';
      case 'audio': return 'Transcribing and analyzing audio...';
      case 'pdf': return 'Analyzing PDF document...';
      case 'document': return 'Analyzing document...';
      case 'spreadsheet': return 'Analyzing spreadsheet data...';
      case 'text': return 'Analyzing text content...';
      default: return 'Analyzing file...';
    }
  };

  async function startAnalysis() {
    setAnalyzing(true);
    setRawAnalysis('');
    setParsedAnalysis(null);
    setError('');
    setStatus('Initializing...');

    try {
      const res = await fetch(`/api/files/${fileId}/analyze`, {
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

                  // Update lastUsedAt timestamp in localStorage
                  updateFileLastUsed(fileId);

                  // Call the callback with the completed analysis
                  if (onAnalysisComplete) {
                    onAnalysisComplete({
                      ...parsed,
                      createdAt: new Date().toISOString()
                    });
                  }
                } catch (parseError) {
                  console.error('Failed to parse final JSON:', parseError);
                  console.log('Raw text:', accumulatedText);
                  // Keep raw text if parsing fails
                }
              } else if (data.status) {
                setStatus(data.status === 'starting' ? 'Starting analysis...' :
                  data.status === 'processing' ? getProcessingText() :
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

  // Render category-specific analysis results
  const renderAnalysisResults = () => {
    if (!parsedAnalysis) return null;

    return (
      <div className="mt-4 space-y-6">
        {/* Summary - Common to all */}
        {parsedAnalysis.summary && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-green-800">Summary</h3>
            <p className="text-gray-700 leading-relaxed">{parsedAnalysis.summary}</p>
          </div>
        )}

        {/* Video-specific: Scenes */}
        {category === 'video' && parsedAnalysis.scenes && parsedAnalysis.scenes.length > 0 && (
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

        {/* Video/Audio-specific: Transcription */}
        {(category === 'video' || category === 'audio') && parsedAnalysis.transcription && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-purple-800">Transcription</h3>
            <div className="bg-white p-4 rounded-lg max-h-60 overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-wrap">{parsedAnalysis.transcription}</p>
            </div>
          </div>
        )}

        {/* Audio-specific: Speakers & Key Moments */}
        {category === 'audio' && parsedAnalysis.speakers && parsedAnalysis.speakers.length > 0 && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-indigo-800">Speakers</h3>
            <div className="space-y-2">
              {parsedAnalysis.speakers.map((speaker, i) => (
                <div key={i} className="bg-white p-3 rounded-lg">
                  <span className="font-semibold text-indigo-700">{speaker.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    ({speaker.segments.length} segments)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {category === 'audio' && parsedAnalysis.keyMoments && parsedAnalysis.keyMoments.length > 0 && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-orange-800">Key Moments</h3>
            <div className="space-y-2">
              {parsedAnalysis.keyMoments.map((moment, i) => (
                <div key={i} className="bg-white p-3 rounded-lg flex gap-3">
                  <span className="font-mono text-sm text-orange-600 font-semibold">[{moment.timestamp}]</span>
                  <span className="text-gray-700">{moment.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image-specific: Objects & OCR */}
        {category === 'image' && parsedAnalysis.objects && parsedAnalysis.objects.length > 0 && (
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-teal-800">Objects Detected</h3>
            <div className="flex flex-wrap gap-2">
              {parsedAnalysis.objects.map((obj, i) => (
                <span key={i} className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">
                  {obj}
                </span>
              ))}
            </div>
          </div>
        )}

        {category === 'image' && parsedAnalysis.ocrText && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">Text in Image (OCR)</h3>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{parsedAnalysis.ocrText}</p>
            </div>
          </div>
        )}

        {category === 'image' && parsedAnalysis.colors && parsedAnalysis.colors.length > 0 && (
          <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-pink-800">Colors</h3>
            <div className="flex flex-wrap gap-2">
              {parsedAnalysis.colors.map((color, i) => (
                <span key={i} className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm">
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PDF/Document-specific: Sections */}
        {(category === 'pdf' || category === 'document') && parsedAnalysis.sections && parsedAnalysis.sections.length > 0 && (
          <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-cyan-800">Sections</h3>
            <div className="space-y-3">
              {parsedAnalysis.sections.map((section, i) => (
                <div key={i} className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-cyan-700 mb-2">{section.title}</h4>
                  <p className="text-gray-600 text-sm">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spreadsheet-specific: Key Metrics */}
        {category === 'spreadsheet' && parsedAnalysis.keyMetrics && parsedAnalysis.keyMetrics.length > 0 && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-emerald-800">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              {parsedAnalysis.keyMetrics.map((metric, i) => (
                <div key={i} className="bg-white p-3 rounded-lg">
                  <span className="text-sm text-gray-500">{metric.name}</span>
                  <p className="text-lg font-semibold text-emerald-700">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {category === 'spreadsheet' && parsedAnalysis.trends && parsedAnalysis.trends.length > 0 && (
          <div className="p-4 bg-lime-50 border border-lime-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-lime-800">Trends</h3>
            <ul className="list-disc list-inside space-y-1">
              {parsedAnalysis.trends.map((trend, i) => (
                <li key={i} className="text-gray-700">{trend}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Common: Key Points */}
        {parsedAnalysis.keyPoints && parsedAnalysis.keyPoints.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-amber-800">Key Points</h3>
            <ul className="list-disc list-inside space-y-2">
              {parsedAnalysis.keyPoints.map((point, i) => (
                <li key={i} className="text-gray-700">{point}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="text-blue-600 hover:text-blue-800 text-sm underline"
        >
          Refresh to see cached results
        </button>
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <button
        onClick={startAnalysis}
        disabled={analyzing}
        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {getAnalyzeButtonText()}
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
      {renderAnalysisResults()}
    </div>
  );
});

StreamingAnalysis.displayName = 'StreamingAnalysis';

export default StreamingAnalysis;
