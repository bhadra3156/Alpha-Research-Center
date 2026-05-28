import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // AlphaResearch Navy/Gold/Steel Palette
        navy: {
          50:  "#eef2ff",
          100: "#dde6ff",
          200: "#c3d0ff",
          300: "#a0b3ff",
          400: "#7a8eff",
          500: "#5566ff",
          600: "#3d44f5",
          700: "#3132e0",
          800: "#1a1f6e",
          900: "#0d1145",
          950: "#060820",
        },
        gold: {
          50:  "#fffbeb",
          100: "#fff3c4",
          200: "#ffe685",
          300: "#ffd246",
          400: "#ffbb1a",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        steel: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        success: "#10b981",
        danger:  "#ef4444",
        warning: "#f59e0b",
        info:    "#3b82f6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-radial":   "radial-gradient(var(--tw-gradient-stops))",
        "gradient-navy":     "linear-gradient(135deg, #060820 0%, #0d1145 50%, #1a1f6e 100%)",
        "gradient-gold":     "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        "gradient-card":     "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
      },
      boxShadow: {
        "gold-glow":  "0 0 20px rgba(245, 158, 11, 0.3)",
        "navy-glow":  "0 0 20px rgba(26, 31, 110, 0.5)",
        "card":       "0 4px 24px rgba(0, 0, 0, 0.4)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.6)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "pulse-gold":   "pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up":     "slideUp 0.3s ease-out",
        "fade-in":      "fadeIn 0.4s ease-out",
        "scan-line":    "scanLine 2s linear infinite",
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.6" },
        },
        slideUp: {
          "0%":   { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scanLine: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
