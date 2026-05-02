import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0f",
          panel: "#12121a",
          raised: "#1a1a24",
          deep: "#06060a",
        },
        line: "#23232f",
        accent: {
          DEFAULT: "#a855f7",
          cyan: "#22d3ee",
          pink: "#ec4899",
          amber: "#f59e0b",
          green: "#10b981",
        },
        text: {
          DEFAULT: "#e5e7eb",
          dim: "#9ca3af",
          mute: "#6b7280",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 30px -10px rgba(168, 85, 247, 0.5)",
        "glow-cyan": "0 0 30px -10px rgba(34, 211, 238, 0.5)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
