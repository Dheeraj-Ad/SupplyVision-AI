import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030712", // obsidian deep black
        card: "#0f172a", // slate 900
        border: "#1e293b", // slate 800
        muted: "#64748b", // slate 500
        accent: "#3b82f6", // electric blue
        success: "#10b981", // emerald green
        warning: "#f59e0b", // amber warning
        danger: "#ef4444", // crimson red
        terminal: {
          bg: "#090d16",
          text: "#10b981",
          border: "#131a26"
        }
      },
      fontFamily: {
        mono: ["Consolas", "Monaco", "monospace"],
      }
    },
  },
  plugins: [],
};
export default config;
