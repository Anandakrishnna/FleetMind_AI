import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#07111f", panel: "#101d31", electric: "#58a6ff" }, boxShadow: { glow: "0 0 40px rgba(88,166,255,.12)" } } }, plugins: [] };
export default config;
