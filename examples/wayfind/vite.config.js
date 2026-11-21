import { defineConfig } from "vite";
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "public/compiled",
    emptyOutDir: true,
    lib: {
      entry: "src/presenter.tsx",
      formats: ["es"],
      fileName: () => "presenter.js",
    },
    minify: true,
  },
  define: { "process.env.NODE_ENV": '"production"' },
});
