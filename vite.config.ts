import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], runtimeCaching: [{ urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, handler: 'StaleWhileRevalidate', options: { cacheName: 'fonts' } }] },
    manifest: { name: 'Mazmorra Matemática', short_name: 'MazmorraMate', lang: 'es', description: 'Juego pixel art de combate por cartas con matemáticas', theme_color: '#14101f', background_color: '#14101f', display: 'standalone', orientation: 'any', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] }
  })]
});
