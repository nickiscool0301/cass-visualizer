import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    setupFiles: ["tests/setup.ts"],
    passWithNoTests: true,
  },
});
