import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAInitializer from "@/components/PWAInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gemini Files - Multi-Modal AI Analysis Platform",
  description: "Powered by Gemini 3: Analyze videos, images, audio, PDFs, and documents with AI. Access local files with AI-powered search.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gemini Files",
  },
  applicationName: "Gemini Files",
  keywords: ["AI", "Gemini", "file analysis", "video analysis", "document analysis", "PWA"],
  authors: [{ name: "Gemini Files Team" }],
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};
=======

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gemini Files" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <PWAInitializer />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:ml-72">
            {children}
          </main>
        </div>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
=======
