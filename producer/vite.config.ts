import { fileURLToPath, URL } from "node:url"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 6661,
    allowedHosts: ["alhamdulillahs-macbook-pro.local"]
  },
  optimizeDeps: {
    exclude: ['maplibre-gl']
  },
  plugins: [basicSsl(), react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
