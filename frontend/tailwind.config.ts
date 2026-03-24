import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        halo: {
          primary: "#6C63FF",
          secondary: "#FF6584",
        },
      },
      // 44px minimum touch target (per constitution)
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
