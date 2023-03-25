import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      formats: ["es", "cjs"],
      entry: "./lib/index.ts",
      name: "Pym",
      fileName: "pym",
    },
  },
});
