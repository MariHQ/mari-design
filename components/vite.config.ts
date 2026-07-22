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
  // `npm run dev` opens a browser for a human. Tooling that spawns its own
  // dev server (scripts/shot.mjs) sets MARI_NO_OPEN so QA runs never throw
  // stray Chrome windows at whoever is using the machine.
  server: { open: !process.env.MARI_NO_OPEN },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, ".preview/index.html"),
        pages: resolve(__dirname, ".preview/pages.html"),
        canvas: resolve(__dirname, ".preview/canvas.html"),
        render: resolve(__dirname, ".preview/render.html"),
        states: resolve(__dirname, ".preview/states.html"),
      },
    },
  },
});
