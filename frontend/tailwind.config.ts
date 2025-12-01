import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Trading Colors
        bull: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dark: "#059669",
        },
        bear: {
          DEFAULT: "#ef4444",
          light: "#f87171",
          dark: "#dc2626",
        },
        buy: {
          DEFAULT: "#3b82f6",
          light: "#60a5fa",
          dark: "#2563eb",
        },
        sell: {
          DEFAULT: "#ec4899",
          light: "#f472b6",
          dark: "#db2777",
        },
        chart: {
          bg: "#1a1a1a",
          grid: "#2b2b2b",
          border: "#374151",
        },
      },
      fontFamily: {
        mono: ["GeistMono", "Consolas", "Monaco", "monospace"],
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
