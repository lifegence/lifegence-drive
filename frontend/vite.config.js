import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import path from "path"
import frappeui from "frappe-ui/vite"

export default defineConfig({
  plugins: [
    frappeui({
      frappeProxy: true,
      lucideIcons: true,
      jinjaBootData: true,
      buildConfig: {
        indexHtmlPath: "../lifegence_drive/www/drive_app.html",
      },
    }),
    vue(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "../lifegence_drive/public/frontend",
    emptyOutDir: true,
    target: "esnext",
    sourcemap: true,
  },
  server: {
    port: 8080,
    allowedHosts: ["dev.localhost", "localhost"],
    proxy: {
      "/api": "http://dev.localhost:8000",
      "/assets": "http://dev.localhost:8000",
      "/files": "http://dev.localhost:8000",
      "/private/files": "http://dev.localhost:8000",
      "/socket.io": {
        target: "http://dev.localhost:8000",
        ws: true,
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: { target: "esnext" },
  },
})
