import type { Metadata, Viewport } from "next";
import ClientLayout from "./ClientLayout";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClientLayout>{children}</ClientLayout>;
}
