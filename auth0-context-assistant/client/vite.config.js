import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  return {
    plugins: [react()],
    root: __dirname,
    envDir: path.resolve(__dirname, ".."),
    server: {
      host: "127.0.0.1",
      port: 5174,
      proxy: {
        "/api": {
          target: env.VITE_API_BASE || "http://127.0.0.1:3001",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true,
    },
  };
});
