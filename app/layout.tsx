import type { Metadata, Viewport } from "next";

import { PwaRegister } from "@/components/pwa-register";

import "./globals.css";

export const metadata: Metadata = {
  title: "modo — твои инструменты",
  description:
    "modo — личные модули для любых коллекций, расходов и списков дел.",
  applicationName: "modo",
  appleWebApp: {
    capable: true,
    title: "modo",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Ставит класс `dark` до первой отрисовки — иначе при тёмной теме
 * страница успевает мигнуть белым.
 */
const themeScript = `(function(){try{var s=localStorage.getItem("modo-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-white font-sans text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
