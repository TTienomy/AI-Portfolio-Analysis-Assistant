import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PortfolioProvider } from "../context/PortfolioContext";
import Sidebar from "../components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Financial Analysis Hub",
  description: "AI-Powered Financial Analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <PortfolioProvider>
          <div className="flex">
            <div className="flex-1 min-h-screen">
              {children}
            </div>
            <Sidebar />
          </div>
        </PortfolioProvider>
      </body>
    </html>
  );
}
