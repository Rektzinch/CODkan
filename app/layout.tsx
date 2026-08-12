import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import "../tokens.css";
import "./globals.css";
import "./ui-system.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CODkan — Ketemu. Tawar. Deal.",
  description: "CODkan — marketplace lokal untuk ketemu, tawar, dan deal secara COD.",
  manifest: "/manifest.webmanifest",
  other: { "codex-preview": "development" },
};

export const viewport: Viewport = { themeColor: "#FF5A4A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" className={`${bricolage.variable} ${geist.variable}`}><body>{children}</body></html>;
}
