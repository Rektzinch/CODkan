import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CODkan — Ketemu. Tawar. Deal.",
  description: "CODkan — marketplace lokal untuk ketemu, tawar, dan deal secara COD.",
  manifest: "/manifest.webmanifest",
  other: { "codex-preview": "development" },
};

export const viewport: Viewport = { themeColor: "#FF5A4A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={poppins.variable}>{children}</body></html>;
}
