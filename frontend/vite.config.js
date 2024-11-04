import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      '@uniswap/permit2-sdk': require.resolve('@uniswap/permit2-sdk'),
    },
  },
  build: {
    rollupOptions: {
      external: ['@uniswap/permit2-sdk'],
    },
  },
});
