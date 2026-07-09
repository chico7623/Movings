import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const phpTarget = process.env.VITE_PHP_API_URL || 'http://localhost/movings-api';
  const nodeTarget = process.env.VITE_NODE_API_URL || 'http://localhost:3001';

  return {
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        '/api/php': {
          target: phpTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/php/, ''),
        },
        '/api': {
          target: nodeTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            query: ["@tanstack/react-query"],
            charts: ["recharts"],
            ui: [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-toast",
            ],
          },
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
