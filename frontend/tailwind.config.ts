import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#075C67",
        secondary: "#148A91",
        background: "#F6F8F8",
        surface: "#FFFFFF",
        heading: "#172B35",
        body: "#52636B",
        border: "#E4EAEC",
        success: "#15803D",
        warning: "#B45309",
        error: "#DC2626",
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
