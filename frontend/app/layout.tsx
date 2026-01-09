import type { Metadata } from "next";
// Note: Google Fonts temporarily disabled due to network restrictions in build environment
// To enable, uncomment the following lines:
// import { Inter } from "next/font/google";
// const inter = Inter({ subsets: ["latin"] });
// And replace className="font-sans" with className={inter.className}
import "./globals.css";
import GlobalHeaderWrapper from "@/components/layout/GlobalHeaderWrapper";
import { Toaster } from "sonner";

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
      <body className="font-sans">
        <GlobalHeaderWrapper />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
