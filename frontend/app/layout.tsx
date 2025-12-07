import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ShortcutHelp, ShortcutToast, ShortcutConfirmation, ShortcutOverlay } from "@/components/shortcuts";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "AI Trading v2 - Scalping Dashboard",
  description: "Real-time cryptocurrency trading dashboard optimized for scalping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <ShortcutHelp />
        <ShortcutToast />
        <ShortcutConfirmation />
        <ShortcutOverlay />
      </body>
    </html>
  );
}
