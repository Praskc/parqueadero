import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { backendPlugin } from "./viteBackendPlugin";

export default defineConfig({
  plugins: [vue(), tailwindcss(), backendPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
