import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          // Required for SharedArrayBuffer which is needed for OPFS support
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          next();
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ["use-squeel", "@sqlite.org/sqlite-wasm"],
  },
  worker: {
    rollupOptions: {
      output: {
        // Worker-specific asset naming
        assetFileNames: `assets/[name].[ext]`, // Removes hash from worker assets (the wasm)
      }
    }
  }
})
