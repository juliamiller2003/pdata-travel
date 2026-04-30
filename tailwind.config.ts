import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f5f5",
          100: "#ddeaea",
          500: "#b8cccc",
          600: "#9fb8b8",
          700: "#7a9d9d",
          900: "#3a5e5e",
        },
        sky: {
          50:  "#f0f5f5",
          100: "#ddeaea",
          300: "#c5d9d9",
          400: "#b8cccc",
          500: "#9fb8b8",
          600: "#9fb8b8",
          700: "#7a9d9d",
          900: "#3a5e5e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
