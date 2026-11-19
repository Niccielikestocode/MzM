import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'fonts', expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 } }
        }
      ]
    },
    manifest: {
      name: 'Mazmorra Matemática · Tierras de Aritmia',
      short_name: 'MazmorraMate',
      lang: 'es-CO',
      description: 'RPG pixel art de combate y matemáticas inspirado en el folclor y regiones de Colombia.',
      theme_color: '#0f0c18',
      background_color: '#0f0c18',
      display: 'standalone',
      orientation: 'any',
      categories: ['education', 'games'],
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
      ]
    }
  })]
});
