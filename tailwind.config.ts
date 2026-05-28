/* =============================================================
   AlphaResearch — Tailwind Config (Institutional Minimalist)
   File: tailwind.config.ts  (REPLACE EXISTING)
   v1.1 — Drop-in replacement. Every color key used by existing
          components is preserved so nothing breaks. Gradients
          and glows are neutralized to flat surfaces.
   ============================================================= */

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
        // ---------------------------------------------------
        // SURFACES — single near-black tone family
        // ---------------------------------------------------
        surface: {
          base:     "#0a0a0b",
          DEFAULT:  "#111113",
          elevated: "#161618",
          input:    "#0f0f11",
        },
        border: {
          subtle:  "#1f1f23",
          DEFAULT: "#27272a",
          strong:  "#3f3f46",
        },
        ink: {
          primary:   "#fafafa",
          secondary: "#a1a1aa",
          muted:     "#71717a",
          faint:     "#52525b",
        },

        // ---------------------------------------------------
        // LEGACY KEYS — preserved so existing components keep
        // compiling. All collapsed to the minimalist palette.
        // ---------------------------------------------------
        navy: {
          50:  "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#0a0a0b",
        },
        gold: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        steel: {
          50:  "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#0a0a0b",
        },

        // ---------------------------------------------------
        // STATUS — data-driven semantic colors only
        // ---------------------------------------------------
        success: "#10b981",
        danger:  "#ef4444",
        warning: "#f59e0b",
        info:    "#3b82f6",
        smart:   "#a855f7",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "monospace"],
      },

      // ---------------------------------------------------
      // GRADIENTS — neutralized to flat surface color
      // (keys preserved so any existing class still resolves)
      // ---------------------------------------------------
      backgroundImage: {
        "gradient-radial": "none",
        "gradient-navy":   "none",
        "gradient-gold":   "none",
        "gradient-card":   "none",
      },

      // ---------------------------------------------------
      // SHADOWS — flat, no glows
      // ---------------------------------------------------
      boxShadow: {
        "gold-glow":  "none",
        "navy-glow":  "none",
        "card":       "none",
        "card-hover": "none",
        "subtle":     "0 1px 2px rgba(0, 0, 0, 0.4)",
      },

      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },

      letterSpacing: {
        tightest: "-0.02em",
        tighter:  "-0.01em",
        widest:   "0.15em",
      },

      animation: {
        "pulse-gold": "pulse-soft 2s ease-in-out infinite",
        "slide-up":   "slideUp 200ms ease-out",
        "fade-in":    "fadeIn 200ms ease-out",
        "scan-line":  "none",
      },

      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        slideUp: {
          "0%":   { transform: "translateY(4px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;