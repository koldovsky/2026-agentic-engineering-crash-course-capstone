import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ETF Dashboard",
  description: "Browse and compare demo ETF data. Not investment advice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="w-full px-6 py-0 flex items-center gap-3 h-14" style={{ background: 'var(--nav-bg)', color: 'var(--nav-fg)' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2" y="12" width="3" height="6" rx="1" fill="#3b82f6"/>
            <rect x="7" y="8" width="3" height="10" rx="1" fill="#60a5fa"/>
            <rect x="12" y="4" width="3" height="14" rx="1" fill="#93c5fd"/>
            <rect x="17" y="1" width="3" height="17" rx="1" fill="#bfdbfe"/>
          </svg>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--nav-fg)' }}>ETF Dashboard</span>
        </nav>
        <div className="w-full px-6 py-1.5 text-center text-xs bg-amber-50 text-amber-700 border-b border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40">
          Demo data — not investment advice
        </div>
        {children}
      </body>
    </html>
  );
}
