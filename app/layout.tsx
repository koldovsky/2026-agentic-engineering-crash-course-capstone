import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LANGUAGE_KEY, THEME_KEY } from "@/lib/game/preferences";
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
  title: "Dopamine Clicker",
  description: "Клікер з магазином скінів і прикрас",
};

// Runs synchronously during HTML parsing, before the first paint: applies the saved theme,
// language and the motion preference so there is no flash (design D8). It duplicates the tiny
// parse rules of lib/game/preferences.ts on purpose — importing would not be blocking. The
// storage keys are interpolated from the same constants lib/game/preferences.ts exports, so the
// two copies cannot drift apart.
const PRE_PAINT_SCRIPT = `(function(){try{var d=document.documentElement;
var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});
if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
d.setAttribute("data-theme",t);
var l=localStorage.getItem(${JSON.stringify(LANGUAGE_KEY)});
d.setAttribute("lang",l==="uk"||l==="en"?l:"uk");
d.setAttribute("data-motion",matchMedia("(prefers-reduced-motion: reduce)").matches?"reduced":"full");
}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      data-theme="light"
      data-motion="full"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
