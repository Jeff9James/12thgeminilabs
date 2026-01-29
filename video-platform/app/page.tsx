'use client';

import { motion } from 'framer-motion';
import { Sparkles, Upload, Search, Zap, Clock, Brain } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-medium text-white">Powered by Gemini 3</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Multi-Modal AI Analysis
              <br />
              <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                with Gemini 3
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Videos, Images, Audio, PDFs & Documents – All analyzed by state-of-the-art AI
            </p>

            <p className="text-lg text-blue-200 mb-12 max-w-2xl mx-auto">
              Upload any file type and get AI-powered analysis, chat with your content, and extract insights
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/analyze"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <Upload className="w-5 h-5" />
                Upload & Analyze
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all border border-white/20"
              >
                <Search className="w-5 h-5" />
                Try Search
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Why Choose Gemini Files?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional-grade multi-modal analysis powered by state-of-the-art AI
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Brain,
              title: 'Multi-Modal Understanding',
              description: 'Analyze videos, images, audio, PDFs, and documents with the same powerful AI',
              color: 'from-blue-500 to-cyan-500',
            },
            {
              icon: Search,
              title: 'Natural Language Search',
              description: 'Find moments in videos or content in documents with simple queries',
              color: 'from-purple-500 to-pink-500',
            },
            {
              icon: Zap,
              title: 'Real-time Analysis',
              description: 'Watch AI analyze your files with streaming responses and instant feedback',
              color: 'from-orange-500 to-red-500',
            },
            {
              icon: Clock,
              title: 'Timeline & OCR',
              description: 'Video timestamps, image text extraction, and document parsing',
              color: 'from-green-500 to-emerald-500',
            },
            {
              icon: Sparkles,
              title: 'Intelligent Chat',
              description: 'Chat with your files - ask questions about any content type',
              color: 'from-indigo-500 to-purple-500',
            },
            {
              icon: Upload,
              title: 'Universal Upload',
              description: 'Support for 20+ file formats including video, audio, images, and documents',
              color: 'from-pink-500 to-rose-500',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="h-full bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 hover:border-gray-200">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to analyze your files with AI?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Experience the power of Gemini 3's multi-modal understanding
            </p>
            <Link
              href="/analyze"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
            >
              <Upload className="w-5 h-5" />
              Get Started Free
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
