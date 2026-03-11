import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: "./src",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: [
      "fanhub-deployment-production.up.railway.app",
      "fanhub-production.up.railway.app",
    ],
  },
  preview: {
    allowedHosts: [
      "fanhub-deployment-production.up.railway.app",
      "fanhub-production.up.railway.app",
    ],
  },
  build: {
    outDir: "../dist",
  },
  publicDir: "../public",
});

