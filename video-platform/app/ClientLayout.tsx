'use client';

import { usePathname } from 'next/navigation';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import PWAInitializer from '@/components/PWAInitializer';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLandingPage = pathname === '/';

    return (
        <html lang="en">
            <head>
                {/* Google Fonts for pixel art theme */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen:wght@400;700&family=VT323&display=swap"
                    rel="stylesheet"
                />
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
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <PWAInitializer />
                {isLandingPage ? (
                    <div className="min-h-screen">
                        {children}
                    </div>
                ) : (
                    <div className="flex min-h-screen">
                        <Sidebar />
                        <main className="flex-1 lg:ml-72">
                            {children}
                        </main>
                    </div>
                )}
                {!isLandingPage && <PWAInstallPrompt />}
            </body>
        </html>
    );
}
