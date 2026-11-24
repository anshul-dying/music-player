import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { ThemeProviderClient } from "../components/ThemeProviderClient";
import { PersistentAppShell } from "../components/layout/PersistentAppShell";
import { PwaRegister } from "../components/PwaRegister";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: {
    default: "GaneGan — Ad-Free Music Streaming",
    template: "%s · GaneGan",
  },
  description: "Ad-free music streaming with Apple Music aesthetics and your personal library.",
  referrer: 'no-referrer',
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GaneGan",
  },
};

export const viewport: Viewport = {
  themeColor: "#141416",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-dvh bg-canvas text-text-primary antialiased">
        <ThemeProviderClient>
          <PwaRegister />
          <Suspense fallback={null}>
            <PersistentAppShell>
              {children}
            </PersistentAppShell>
          </Suspense>
        </ThemeProviderClient>
      </body>
    </html>
  );
}
