'use client';

import { useState, useEffect } from "react";
import { PixelIcon } from "../components/PixelIcon";
import { FeatureCard } from "../components/FeatureCard";
import { SectionHeader } from "../components/SectionHeader";

function PixelDivider() {
  return (
    <div className="flex items-center justify-center py-6 gap-0.5 select-none" aria-hidden>
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5"
          style={{
            backgroundColor:
              i % 4 === 0
                ? "#e8a525"
                : i % 4 === 2
                  ? "#3d3d5c"
                  : "transparent",
          }}
        />
      ))}
    </div>
  );
}

function PixelSprite({ className = "" }: { className?: string }) {
  return (
    <div className={`select-none ${className}`} style={{ imageRendering: "pixelated" }} aria-hidden>
      <svg width="32" height="32" viewBox="0 0 8 8">
        <rect x="3" y="0" width="2" height="1" fill="#e8a525" />
        <rect x="2" y="1" width="4" height="1" fill="#e8a525" />
        <rect x="2" y="2" width="1" height="1" fill="#fff" />
        <rect x="3" y="2" width="1" height="1" fill="#1a1a2e" />
        <rect x="4" y="2" width="1" height="1" fill="#fff" />
        <rect x="5" y="2" width="1" height="1" fill="#1a1a2e" />
        <rect x="2" y="3" width="4" height="1" fill="#e8a525" />
        <rect x="1" y="4" width="6" height="1" fill="#e8a525" />
        <rect x="3" y="4" width="2" height="1" fill="#c48a1a" />
        <rect x="2" y="5" width="4" height="1" fill="#e8a525" />
        <rect x="1" y="6" width="2" height="1" fill="#e8a525" />
        <rect x="5" y="6" width="2" height="1" fill="#e8a525" />
        <rect x="1" y="7" width="2" height="1" fill="#c48a1a" />
        <rect x="5" y="7" width="2" height="1" fill="#c48a1a" />
      </svg>
    </div>
  );
}

function ScrollIndicator() {
  return (
    <div className="flex flex-col items-center gap-2 mt-6 animate-bounce">
      <span className="font-retro text-sm text-cream/40">SCROLL DOWN</span>
      <PixelIcon type="arrow" size={16} color="#e8a525" />
    </div>
  );
}

function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { label: "FEATURES", href: "#features" },
    { label: "MY FILES", href: "/files" },
    { label: "CHAT", href: "/chat" },
    { label: "HISTORY", href: "/history" },
    { label: "SEARCH", href: "/search" },
    { label: "ANALYZE", href: "/analyze" },
    { label: "LEARNHUB", href: "/learnHub" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-none border-b-2 ${scrolled ? "bg-darker/95 border-border" : "bg-transparent border-transparent"
        }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group">
          <div className="pixel-float">
            <PixelIcon type="brain" size={20} color="#e8a525" />
          </div>
          <span className="font-pixel text-xs text-accent">Gemini Files</span>
        </a>
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="font-pixel text-[8px] text-cream/50 hover:text-accent px-3 py-2 border-2 border-transparent hover:border-border transition-none"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 dither-bg overflow-hidden">
      {/* Decorative pixel corners */}
      <div className="absolute top-16 left-4 sm:left-8 opacity-20" aria-hidden>
        <svg width="48" height="48" viewBox="0 0 8 8" style={{ imageRendering: "pixelated" }}>
          <rect x="0" y="0" width="3" height="1" fill="#e8a525" />
          <rect x="0" y="0" width="1" height="3" fill="#e8a525" />
        </svg>
      </div>
      <div className="absolute top-16 right-4 sm:right-8 opacity-20" aria-hidden>
        <svg width="48" height="48" viewBox="0 0 8 8" style={{ imageRendering: "pixelated" }}>
          <rect x="5" y="0" width="3" height="1" fill="#e8a525" />
          <rect x="7" y="0" width="1" height="3" fill="#e8a525" />
        </svg>
      </div>
      <div className="absolute bottom-8 left-4 sm:left-8 opacity-20" aria-hidden>
        <svg width="48" height="48" viewBox="0 0 8 8" style={{ imageRendering: "pixelated" }}>
          <rect x="0" y="7" width="3" height="1" fill="#e8a525" />
          <rect x="0" y="5" width="1" height="3" fill="#e8a525" />
        </svg>
      </div>
      <div className="absolute bottom-8 right-4 sm:right-8 opacity-20" aria-hidden>
        <svg width="48" height="48" viewBox="0 0 8 8" style={{ imageRendering: "pixelated" }}>
          <rect x="5" y="7" width="3" height="1" fill="#e8a525" />
          <rect x="7" y="5" width="1" height="3" fill="#e8a525" />
        </svg>
      </div>

      {/* Floating sprites */}
      <PixelSprite className="absolute top-32 left-12 pixel-float hidden lg:block opacity-60" />
      <PixelSprite className="absolute bottom-32 right-16 pixel-float-delay hidden lg:block opacity-40" />

      <div className="text-center max-w-4xl relative">
        {/* Terminal-like header */}
        <div className="inline-block mb-6 border-2 border-border bg-card px-4 py-2 pixel-border">
          <span className="font-retro text-sm text-green">system.boot()</span>
          <span className="font-retro text-sm text-cream/40"> // v1.0 loaded</span>
        </div>

        <h1 className="font-pixel text-2xl sm:text-3xl md:text-4xl text-cream leading-relaxed mb-2">
          <span className="text-accent">[</span> Gemini Files <span className="text-accent">]</span>
        </h1>

        <div className="font-pixel text-xs sm:text-sm text-accent mb-8 tracking-widest">
          YOUR INTELLIGENT FILE HUB
        </div>

        <p className="font-retro text-xl sm:text-2xl text-cream/60 max-w-2xl mx-auto mb-4 leading-relaxed">
          Search, chat, analyze, and learn from your files
          <br />
          with AI-powered tools &mdash; all in one place.
        </p>

        <div className="font-retro text-lg text-cream/30 mb-8">
          <span className="text-cream/50">&gt;</span> ready
          <span
            className="inline-block w-3 h-5 bg-accent ml-1 align-middle"
            style={{ opacity: cursorVisible ? 1 : 0 }}
          />
        </div>

        {/* Feature tags row */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
            { label: "PWA", color: "#4ade80" },
            { label: "MCP", color: "#22d3ee" },
            { label: "AI AGENT", color: "#e8a525" },
            { label: "STREAMING", color: "#f97316" },
            { label: "OCR", color: "#38bdf8" },
            { label: "VOICE CHAT", color: "#14b8a6" },
          ].map((t) => (
            <span
              key={t.label}
              className="pixel-tag border-current"
              style={{ color: t.color }}
            >
              {t.label}
            </span>
          ))}
        </div>

        <a
          href="/analyze"
          className="inline-block font-pixel text-xs bg-accent text-darker px-6 py-3 border-2 border-accent-dark pixel-border-accent hover:bg-accent-dark transition-none cursor-pointer mb-4"
        >
          GET STARTED
        </a>

        <a
          href="#features"
          className="inline-block font-pixel text-xs bg-transparent text-accent px-6 py-3 border-2 border-accent pixel-border hover:bg-accent/10 transition-none cursor-pointer"
        >
          EXPLORE FEATURES
        </a>

        <ScrollIndicator />
      </div>
    </section>
  );
}

function CoreFeaturesSection() {
  return (
    <section id="features" className="py-16 px-4 dither-cross bg-darker">
      <div className="max-w-6xl mx-auto">
        <a href="/files" className="block">
          <SectionHeader
            icon={<PixelIcon type="star" size={20} color="#e8a525" />}
            title="CORE FEATURES"
            subtitle="Everything you need to manage and interact with your files intelligently"
          />
        </a>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<PixelIcon type="pwa" size={28} color="#4ade80" />}
            title="Progressive Web App"
            description="Install on desktop and mobile. Works like a native app with offline support and fast loading."
            tags={["DESKTOP", "MOBILE"]}
            tagColors={["#4ade80", "#4ade80"]}
          />
          <FeatureCard
            icon={<PixelIcon type="demo" size={28} color="#22d3ee" />}
            title="Demo Files Available"
            description="Jump right in with pre-loaded demo files. Test every feature without uploading anything."
            tags={["QUICK START"]}
            tagColors={["#22d3ee"]}
          />
          <FeatureCard
            icon={<PixelIcon type="stream" size={28} color="#f97316" />}
            title="AI Response Streaming"
            description="Watch AI responses appear in real-time with streaming in the Analysis view. No waiting for full responses."
            tags={["REAL-TIME"]}
            tagColors={["#f97316"]}
          />
          <FeatureCard
            icon={<PixelIcon type="auto" size={28} color="#e8a525" />}
            title="Auto-Analysis on Upload"
            description="AI analysis triggers automatically when file uploading finishes. Zero extra clicks needed."
            tags={["AUTOMATIC"]}
            tagColors={["#e8a525"]}
          />
          <FeatureCard
            icon={<PixelIcon type="folder" size={28} color="#14b8a6" />}
            title="File Control AI Agent"
            description="Available in LearnHub page and Chat page. Create, read, update, delete files and folders, and move files into folders — all through natural language."
            tags={["CRUD", "MOVE", "ORGANIZE"]}
            tagColors={["#14b8a6", "#14b8a6", "#14b8a6"]}
          />
          <FeatureCard
            icon={<PixelIcon type="file" size={28} color="#38bdf8" />}
            title="All File Types Supported"
            description="Images, audio, video, spreadsheets, docs, PDFs, and every other file type you can think of."
            tags={["IMG", "AUD", "VID", "XLSX", "DOC", "PDF", "+"]}
            tagColors={["#ef4444", "#f97316", "#e8a525", "#4ade80", "#38bdf8", "#22d3ee", "#fff"]}
          />
        </div>
      </div>
    </section>
  );
}

function SearchSection() {
  return (
    <section id="search" className="py-16 px-4 dither-light bg-dark">
      <div className="max-w-6xl mx-auto">
        <a href="/search" className="block">
          <SectionHeader
            icon={<PixelIcon type="search" size={20} color="#e8a525" />}
            title="SEARCH ENGINE"
            subtitle="Powerful search capabilities across all your uploaded files"
          />
        </a>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FeatureCard
            icon={<PixelIcon type="search" size={28} color="#e8a525" />}
            title="Cross-File Search"
            description="Search across all your uploaded files at once. Find anything, anywhere, instantly."
            tags={["ALL FILES"]}
            tagColors={["#e8a525"]}
          />
          <FeatureCard
            icon={<PixelIcon type="color" size={28} color="#ef4444" />}
            title="Color-Based Search"
            description="Search for files by color content. Find images and documents that match specific color palettes."
            tags={["VISUAL"]}
            tagColors={["#ef4444"]}
          />
          <FeatureCard
            icon={<PixelIcon type="ocr" size={28} color="#38bdf8" />}
            title="OCR-Based File Search"
            description="Extract and search text within images and scanned documents using optical character recognition."
            tags={["OCR", "TEXT EXTRACT"]}
            tagColors={["#38bdf8", "#38bdf8"]}
          />
          <FeatureCard
            icon={<PixelIcon type="modes" size={28} color="#4ade80" />}
            title="Quick & Detailed Modes"
            description="Quick Mode for fast searches. Detailed Mode to give more context to the AI search engine for richer results."
            tags={["QUICK", "DETAILED"]}
            tagColors={["#4ade80", "#22d3ee"]}
          />
          <FeatureCard
            icon={<PixelIcon type="filter" size={28} color="#f97316" />}
            title="Sort & Filter Settings"
            description="Refine results with sort and filter controls. Narrow down exactly what you're looking for."
            tags={["SORT", "FILTER"]}
            tagColors={["#f97316", "#f97316"]}
          />
        </div>
      </div>
    </section>
  );
}

function ChatSection() {
  return (
    <section id="chat" className="py-16 px-4 dither-cross bg-darker">
      <div className="max-w-6xl mx-auto">
        <a href="/chat" className="block">
          <SectionHeader
            icon={<PixelIcon type="chat" size={20} color="#e8a525" />}
            title="CHAT PAGE"
            subtitle="Unified chat experience with AI agents and multi-file support"
          />
        </a>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<PixelIcon type="chat" size={28} color="#22d3ee" />}
            title="Unified Chat Page"
            description="One unified chat interface for all your AI conversations. Clean, focused, and powerful."
            tags={["UNIFIED"]}
            tagColors={["#22d3ee"]}
          />
          <FeatureCard
            icon={<PixelIcon type="folder" size={28} color="#14b8a6" />}
            title="File Control AI Agent"
            description="CRUD files and folders, move files into folders — all through chat commands in natural language."
            tags={["CREATE", "READ", "UPDATE", "DELETE"]}
            tagColors={["#4ade80", "#38bdf8", "#e8a525", "#ef4444"]}
          />
          <FeatureCard
            icon={<PixelIcon type="modes" size={28} color="#4ade80" />}
            title="Quick & Detailed Modes"
            description="Quick Mode for fast chats. Detailed Mode for providing more context to the AI agent for deeper responses."
            tags={["QUICK", "DETAILED"]}
            tagColors={["#4ade80", "#22d3ee"]}
          />
          <FeatureCard
            icon={<PixelIcon type="file" size={28} color="#e8a525" />}
            title="Multi-File Chat"
            description="Chat with AI about multiple files simultaneously. Cross-reference and analyze across your entire library."
            tags={["MULTI-FILE"]}
            tagColors={["#e8a525"]}
          />
          <FeatureCard
            icon={<PixelIcon type="chat" size={28} color="#f97316" />}
            title="Chat With File"
            description="Upload a file and start a dedicated chat session about it. Each file gets its own conversation thread."
            tags={["FILE CHAT"]}
            tagColors={["#f97316"]}
          />
        </div>
      </div>
    </section>
  );
}

function MCPSection() {
  return (
    <section className="py-16 px-4 dither-light bg-dark">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          icon={<PixelIcon type="mcp" size={20} color="#e8a525" />}
          title="MCP SERVER"
          subtitle="Full Model Context Protocol support for extensible AI tooling"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <FeatureCard
            icon={<PixelIcon type="mcp" size={28} color="#22d3ee" />}
            title="Full MCP Server Support"
            description="Connect external tools, APIs, and services through the Model Context Protocol. Extend capabilities endlessly."
            tags={["MCP", "PROTOCOL"]}
            tagColors={["#22d3ee", "#22d3ee"]}
          />
          <FeatureCard
            icon={<PixelIcon type="auto" size={28} color="#4ade80" />}
            title="Auto Tool Discovery & Calling"
            description="MCP tools are automatically discovered and called by the AI. No manual configuration of tool invocations needed."
            tags={["AUTO-DISCOVER", "AUTO-CALL"]}
            tagColors={["#4ade80", "#4ade80"]}
          />
        </div>
      </div>
    </section>
  );
}

function LearnHubSection() {
  return (
    <section id="learnhub" className="py-16 px-4 dither-cross bg-darker">
      <div className="max-w-6xl mx-auto">
        <a href="/learnHub" className="block">
          <SectionHeader
            icon={<PixelIcon type="brain" size={20} color="#e8a525" />}
            title="LEARNHUB"
            subtitle="Your AI Teacher — learn from your files with voice and intelligence"
          />
        </a>

        {/* LearnHub description box */}
        <div className="border-2 border-accent bg-card dither-accent p-6 mb-6 max-w-3xl mx-auto pixel-border">
          <div className="flex items-center gap-2 mb-3">
            <PixelIcon type="brain" size={20} color="#e8a525" />
            <span className="font-pixel text-[10px] text-accent">AI TEACHER PAGE</span>
          </div>
          <p className="font-retro text-lg text-cream/70 leading-relaxed">
            LearnHub is your personal AI teacher. Ask questions, explore concepts,
            and get explanations powered by your own files. It comes with full MCP server
            support, voice chat, and file control AI agent capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<PixelIcon type="voice" size={28} color="#14b8a6" />}
            title="Voice Chat"
            description="Talk to your AI teacher using voice. Ask questions naturally and get spoken responses back."
            tags={["VOICE", "SPEAK"]}
            tagColors={["#14b8a6", "#14b8a6"]}
          />
          <FeatureCard
            icon={<PixelIcon type="mcp" size={28} color="#22d3ee" />}
            title="MCP Server Support"
            description="Full MCP server integration in LearnHub. Connect external tools and extend your AI teacher's abilities."
            tags={["MCP", "EXTENSIBLE"]}
            tagColors={["#22d3ee", "#22d3ee"]}
          />
          <FeatureCard
            icon={<PixelIcon type="file" size={28} color="#e8a525" />}
            title="Include / Exclude Files"
            description="Control which files are part of your learning context. Include relevant files or exclude ones you don't need."
            tags={["INCLUDE", "EXCLUDE"]}
            tagColors={["#4ade80", "#ef4444"]}
          />
          <FeatureCard
            icon={<PixelIcon type="folder" size={28} color="#f97316" />}
            title="File Control AI Agent"
            description="Create, read, update, delete files and folders, and move files into folders — all from within LearnHub."
            tags={["CRUD", "ORGANIZE"]}
            tagColors={["#f97316", "#f97316"]}
          />
        </div>
      </div>
    </section>
  );
}

function HistorySection() {
  return (
    <section id="history" className="py-16 px-4 dither-light bg-dark">
      <div className="max-w-6xl mx-auto">
        <a href="/history" className="block">
          <SectionHeader
            icon={<PixelIcon type="history" size={20} color="#e8a525" />}
            title="HISTORY"
            subtitle="Complete session history across all pages in one place"
          />
        </a>

        <div className="border-2 border-border bg-card dither-accent p-6 max-w-4xl mx-auto pixel-border">
          <div className="flex items-center gap-2 mb-4">
            <PixelIcon type="history" size={20} color="#e8a525" />
            <span className="font-pixel text-[10px] text-accent">SESSION HISTORY</span>
          </div>
          <p className="font-retro text-lg text-cream/70 leading-relaxed mb-4">
            The History page consolidates all your sessions from every part of the app
            into a single, browsable view.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: "Search Sessions",
                desc: "All past searches from the Search page",
                color: "#e8a525",
              },
              {
                label: "Multi-File Chat",
                desc: "Chat page sessions with multiple files",
                color: "#22d3ee",
              },
              {
                label: "File Chats",
                desc: "Chat With File sessions from uploaded file conversations",
                color: "#4ade80",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="border-2 p-3 bg-darker dither-dense"
                style={{ borderColor: item.color }}
              >
                <span
                  className="font-pixel text-[8px] block mb-1"
                  style={{ color: item.color }}
                >
                  {item.label}
                </span>
                <span className="font-retro text-sm text-cream/50">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FileTypesSection() {
  const fileTypes = [
    { ext: "PNG", color: "#ef4444" },
    { ext: "JPG", color: "#ef4444" },
    { ext: "GIF", color: "#ef4444" },
    { ext: "SVG", color: "#ef4444" },
    { ext: "MP3", color: "#f97316" },
    { ext: "WAV", color: "#f97316" },
    { ext: "OGG", color: "#f97316" },
    { ext: "MP4", color: "#e8a525" },
    { ext: "AVI", color: "#e8a525" },
    { ext: "MOV", color: "#e8a525" },
    { ext: "XLS", color: "#4ade80" },
    { ext: "CSV", color: "#4ade80" },
    { ext: "DOC", color: "#38bdf8" },
    { ext: "TXT", color: "#38bdf8" },
    { ext: "PDF", color: "#22d3ee" },
    { ext: "MD", color: "#22d3ee" },
    { ext: "*.*", color: "#fff" },
  ];

  return (
    <section className="py-16 px-4 dither-cross bg-darker">
      <div className="max-w-6xl mx-auto text-center">
        <SectionHeader
          icon={<PixelIcon type="file" size={20} color="#e8a525" />}
          title="FILE TYPES"
          subtitle="Support for every file type you work with"
        />

        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
          {fileTypes.map((ft) => (
            <span
              key={ft.ext}
              className="font-pixel text-[9px] border-2 px-3 py-2 bg-card dither-dense hover:bg-card-hover transition-none cursor-default"
              style={{ color: ft.color, borderColor: ft.color }}
            >
              .{ft.ext}
            </span>
          ))}
        </div>

        <p className="font-retro text-base text-cream/40 mt-4">
          ...and every other file type you can think of
        </p>
      </div>
    </section>
  );
}

export function Footer() {
  const footerLinks = [
    { label: "MY FILES", href: "/files" },
    { label: "CHAT", href: "/chat" },
    { label: "HISTORY", href: "/history" },
    { label: "SEARCH", href: "/search" },
    { label: "ANALYZE", href: "/analyze" },
    { label: "LEARNHUB", href: "/learnHub" },
  ];

  return (
    <footer className="py-10 px-4 bg-darker border-t-2 border-border dither-bg">
      <div className="max-w-6xl mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <PixelIcon type="brain" size={16} color="#e8a525" />
          <span className="font-pixel text-[10px] text-accent">Gemini Files</span>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-4">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-retro text-sm text-cream/50 hover:text-accent transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Pixel art divider */}
        <div className="flex justify-center gap-0.5 mb-4" aria-hidden>
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="inline-block w-1 h-1"
              style={{
                backgroundColor: i % 3 === 0 ? "#3d3d5c" : "transparent",
              }}
            />
          ))}
        </div>

        <p className="font-retro text-xs text-cream/20">
          BUILT WITH AND PIXELS
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-darker text-cream">
      <NavBar />
      <HeroSection />
      <PixelDivider />
      <CoreFeaturesSection />
      <PixelDivider />
      <SearchSection />
      <PixelDivider />
      <ChatSection />
      <PixelDivider />
      <MCPSection />
      <PixelDivider />
      <LearnHubSection />
      <PixelDivider />
      <HistorySection />
      <PixelDivider />
      <FileTypesSection />
      <Footer />
    </div>
  );
}
