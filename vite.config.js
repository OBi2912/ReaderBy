import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'System Resources Monitor',
        short_name: 'SysMonitor',
        description: 'Real-time system telemetry and resource usage tracking',
        theme_color: '#030303',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Allow access from any device on any network
    port: 5173,
    strictPort: false
  },
  preview: {
    host: '0.0.0.0', // Allow access from any device in preview mode
    port: 4173,
    strictPort: false
  }
})
