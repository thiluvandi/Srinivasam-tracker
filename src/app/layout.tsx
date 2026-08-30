import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#F8F7F3]">
        <div className="mx-auto w-full max-w-[1100px] flex-1">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
