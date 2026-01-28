'use client';

import { motion } from 'framer-motion';
import { PlayCircle, Sparkles, Clock, Eye } from 'lucide-react';

interface ExampleVideo {
  id: string;
  title: string;
  description: string;
  duration: string;
  queries: string[];
  thumbnail: string;
}

export default function ExamplesPage() {
  const examples: ExampleVideo[] = [
    {
      id: '1',
      title: 'Holiday Special: Rudolph',
      description: 'Classic holiday story with temporal scene detection and character tracking',
      duration: '5:30',
      queries: [
        'Find moments where a red-nosed reindeer appears',
        'Show me scenes with Santa',
        'When does the snowstorm happen?',
      ],
      thumbnail: 'gradient-red',
    },
    {
      id: '2',
      title: 'Action Movie Trailer',
      description: 'High-intensity action sequences with scene classification and object detection',
      duration: '2:15',
      queries: [
        'Find all explosion scenes',
        'Show me chase sequences',
        'When do characters fight?',
      ],
      thumbnail: 'gradient-orange',
    },
    {
      id: '3',
      title: 'Nature Documentary',
      description: 'Wildlife footage with animal tracking and environment detection',
      duration: '8:45',
      queries: [
        'Show me scenes with lions',
        'Find moments in the savanna',
        'When does the migration happen?',
      ],
      thumbnail: 'gradient-green',
    },
    {
      id: '4',
      title: 'Cooking Tutorial',
      description: 'Step-by-step recipe with ingredient detection and action recognition',
      duration: '12:20',
      queries: [
        'Show me when ingredients are added',
        'Find the mixing steps',
        'When is the dish plated?',
      ],
      thumbnail: 'gradient-yellow',
    },
  ];

  const gradients = {
    'gradient-red': 'from-red-500 to-pink-600',
    'gradient-orange': 'from-orange-500 to-red-600',
    'gradient-green': 'from-green-500 to-emerald-600',
    'gradient-yellow': 'from-yellow-500 to-orange-600',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-16">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Demo Videos</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              See Gemini 3 in Action
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Explore example videos analyzed with advanced temporal and spatial reasoning
            </p>
          </motion.div>
        </div>
      </div>

      {/* Examples Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {examples.map((example, index) => (
            <motion.div
              key={example.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all group"
            >
              {/* Thumbnail */}
              <div className={`relative aspect-video bg-gradient-to-br ${gradients[example.thumbnail as keyof typeof gradients]} flex items-center justify-center`}>
                <PlayCircle className="w-24 h-24 text-white/80 group-hover:scale-110 transition-transform" />
                
                {/* Duration Badge */}
                <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/80 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {example.duration}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {example.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {example.description}
                </p>

                {/* Example Queries */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Try these queries:
                  </h4>
                  <div className="space-y-2">
                    {example.queries.map((query, qIndex) => (
                      <div
                        key={qIndex}
                        className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-mono"
                      >
                        "{query}"
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  View Analysis
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 lg:p-12 text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to analyze your own videos?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Upload your videos and experience the power of Gemini 3's advanced video understanding
          </p>
          <a
            href="/analyze"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            Start Analyzing
          </a>
        </motion.div>
      </div>
    </div>
  );
}
