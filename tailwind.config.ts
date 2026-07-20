import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f3ea",
        surface: "#fffdf8",
        line: "#e6dfd1",
        charcoal: "#1f2522",
        muted: "#66706a",
        brand: {
          50: "#edf8f1",
          100: "#d7f0df",
          500: "#157347",
          600: "#0f5f3a",
          700: "#0a4a2d",
          900: "#062b1c",
        },
        amber: {
          50: "#fff8e8",
          100: "#ffefc2",
          500: "#b7791f",
          700: "#7c4c0d",
        },
        red: {
          50: "#fff1ef",
          100: "#ffd8d3",
          500: "#c84635",
          700: "#8f2d22",
        },
      },
      boxShadow: {
        soft: "0 14px 40px rgba(31,37,34,.08)",
        lift: "0 18px 46px rgba(31,37,34,.12)",
      },
      borderRadius: {
        lg: "0.75rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
