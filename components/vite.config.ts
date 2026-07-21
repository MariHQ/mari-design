import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Serves and builds the component-library preview (.preview). `npm run dev`
// runs the hot-reload server; `npm run build` emits a static site to
// components/dist, which the deploy workflow publishes to design.mari.guru.
export default defineConfig({
  root: ".preview",
  base: "/",
  plugins: [react()],
  server: { open: true },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
