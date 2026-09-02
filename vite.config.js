import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:5000";
  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT || 5173),
      strictPort: true,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
      },
    },
    preview: { port: Number(env.VITE_PREVIEW_PORT || 4173), strictPort: true },
  };
});
