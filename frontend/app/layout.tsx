import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalHeaderWrapper from "@/components/layout/GlobalHeaderWrapper";
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
        <GlobalHeaderWrapper />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
