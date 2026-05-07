import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--text-muted)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-glow": "var(--accent-glow)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["Geist Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
        warm: "var(--warm-shadow)",
        card: "var(--card-shadow)",
      },
      backgroundImage: {
        "radial-accent": "radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)",
      },
      animation: {
        "orb-breathe": "orb-breathe 4s ease-in-out infinite",
        "ring-1": "ring-expand-1 4s ease-in-out infinite",
        "ring-2": "ring-expand-2 4s ease-in-out infinite 0.6s",
        "ring-3": "ring-expand-3 4s ease-in-out infinite 1.2s",
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        "slide-right": "slide-in-right 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
