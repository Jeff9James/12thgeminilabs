'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Search, Sparkles, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  {
    name: 'My Files',
    href: '/files',
    icon: FileText,
  },
  {
    name: 'Search',
    href: '/search',
    icon: Search,
  },
  {
    name: 'Analyze',
    href: '/analyze',
    icon: Sparkles,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Gemini Files
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-blue-600')} />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Powered by Gemini 3
          </h3>
          <p className="text-xs text-gray-600">
            Multi-modal AI analysis for videos, images, audio, PDFs & documents
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 20 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-200 flex flex-col z-40"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-200 flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
