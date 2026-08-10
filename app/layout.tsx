import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spec Build",
  description: "CODkan — marketplace lokal untuk ketemu, tawar, dan deal secara COD.",
  manifest: "/manifest.webmanifest",
  other: { "codex-preview": "development" },
};

export const viewport: Viewport = { themeColor: "#176B45", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={geist.variable}>{children}</body></html>;
}
