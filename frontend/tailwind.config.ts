import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#9500cb",
        "primary-container": "#b914f9",
        "on-primary": "#ffffff",
        "on-primary-container": "#fffbff",
        secondary: "#883ba9",
        "secondary-container": "#dc8bfd",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#651487",
        tertiary: "#676000",
        "tertiary-container": "#bbae00",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#464100",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        surface: "#fff7fb",
        "surface-bright": "#fff7fb",
        "surface-dim": "#e5d5e6",
        "surface-container": "#f9e9fa",
        "surface-container-low": "#ffefff",
        "surface-container-high": "#f4e3f4",
        "surface-container-highest": "#eedeee",
        "surface-container-lowest": "#ffffff",
        "surface-variant": "#eedeee",
        "surface-tint": "#9800d0",
        background: "#fff7fb",
        "on-background": "#211824",
        "on-surface": "#211824",
        "on-surface-variant": "#504254",
        outline: "#827286",
        "outline-variant": "#d4c0d7",
        "inverse-surface": "#372d39",
        "inverse-on-surface": "#fcecfc",
        "inverse-primary": "#ebb2ff",
        "primary-fixed": "#f8d8ff",
        "primary-fixed-dim": "#ebb2ff",
        "secondary-fixed": "#f8d8ff",
        "secondary-fixed-dim": "#ebb2ff",
        "tertiary-fixed": "#f6e62b",
        "tertiary-fixed-dim": "#d8ca00",
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      minWidth: {
        touch: "44px",
      },
      minHeight: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
