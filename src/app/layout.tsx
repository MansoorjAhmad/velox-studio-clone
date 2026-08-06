import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://veloxstudio.app";
const APP_NAME = "Velox Studio";
const APP_TITLE = "Velox Studio — Trading Journal & Risk Calculator";
const APP_DESCRIPTION =
  "The complete trader OS: precision position size calculator (Gold, Forex, NAS100), TradeZella-grade journal, Zenith AI insights, personal finance, goals, and daily routine — 100% free.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: APP_TITLE,
    template: "%s · Velox Studio",
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: "Velox Studio", url: APP_URL }],
  keywords: [
    "trading journal",
    "position size calculator",
    "risk calculator",
    "forex calculator",
    "XAUUSD lot size",
    "gold trading calculator",
    "cent account calculator",
    "trade journal",
    "trading analytics",
    "risk management",
    "velox studio",
  ],

  // ── Open Graph (Facebook, WhatsApp, LinkedIn, Discord) ──
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",   // 1200×630 — place this in /public
        width: 1200,
        height: 630,
        alt: "Velox Studio — Trading Journal & Risk Calculator",
      },
    ],
  },

  // ── Twitter / X Card ──
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@veloxstudio",
  },

  // ── Robots ──
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Canonical ──
  alternates: {
    canonical: APP_URL,
  },

  // ── Icons ──
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  // ── Manifest ──
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-flash: apply saved theme BEFORE React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('velox_theme');var r=document.documentElement;if(t==='light'){r.classList.add('light')}else{r.classList.add('dark')}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          richColors={false}
          closeButton
          toastOptions={{
            style: {
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              borderRadius: "var(--radius)",
              fontSize: "13px",
            },
            classNames: {
              success: "!border-profit/40",
              error: "!border-loss/40",
              info: "!border-brand/40",
            },
          }}
        />
      </body>
    </html>
  );
}
