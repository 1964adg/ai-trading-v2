import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata:  Metadata = {
  title: "AI Trading v2",
  description: "Professional AI-Powered Trading Platform",
};

export default function RootLayout({
  children,
}:  Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
