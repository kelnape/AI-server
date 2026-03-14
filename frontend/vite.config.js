import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Konfigurace Vite s povolením hostitele pro Cloudflare tunel
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, 
    // OPRAVA: Povolení domény, aby Vite neblokoval požadavek z tunelu
    allowedHosts: ['ai.kelnape.eu'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
