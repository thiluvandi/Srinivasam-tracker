import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

// Only Geist Sans is used anywhere in the app — Geist Mono was being
// downloaded and preloaded on every page for nothing.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Srinivasam",
  description: "Rent and water bill tracker for Srinivasam",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#F8F7F3",
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#F8F7F3]">
        <div className="mx-auto w-full max-w-[1100px] flex-1">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
