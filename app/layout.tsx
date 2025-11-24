import type { Metadata } from "next";
import { Geist, Geist_Mono, Parkinsans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PWARegister } from "@/components/pwa-register";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const parkinsans = Parkinsans({
  variable: "--font-parkinsans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vibe Check - Crypto Sentiment Tracker",
  description: "Track your daily crypto sentiment and see what your network thinks about the market",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vibe Check",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Vibe Check",
    title: "Vibe Check - Crypto Sentiment Tracker",
    description: "Track your daily crypto sentiment and see what your network thinks about the market",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibe Check - Crypto Sentiment Tracker",
    description: "Track your daily crypto sentiment and see what your network thinks about the market",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#0052FF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Vibe Check" />
        <meta name="application-name" content="Vibe Check" />
        <meta name="msapplication-TileColor" content="#0052FF" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${parkinsans.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <PWARegister />
          <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
              <div className="mr-4 flex">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                  <span className="font-bold">Vibe Check</span>
                </Link>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                  <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground">
                    Home
                  </Link>
                  <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
                    Dashboard
                  </Link>
                </nav>
              </div>
            </div>
          </nav>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
