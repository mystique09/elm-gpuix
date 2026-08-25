import { defineConfig } from "vite";
import elm from "vite-plugin-elm";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => ({
  plugins: [
    elm({
      debug: false,
      optimize: mode === "production",
    }),
  ],
  resolve: {
    alias: {
      "elm-gpuix": fileURLToPath(new URL("../dist/index.js", import.meta.url)),
    },
  },
  build: {
    ssr: "src/host.ts",
    target: "esnext",
    outDir: "dist",
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: "host.js",
      },
    },
  },
  ssr: {
    target: "node",
    noExternal: ["elm-gpuix"],
  },
}));
