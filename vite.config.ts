/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ripple',
        short_name: 'Ripple',
        description: 'See a problem. Snap it. We\'ll fix it.',
        start_url: '/',
        display: 'standalone',
        background_color: '#050505',
        theme_color: '#050505',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // The LiteRT WASM runtime is ~37MB across four variants and the model
        // is several MB more. Precaching them would make the first visit
        // enormous for a user who may never open the camera. They are cached on
        // demand instead (see runtimeCaching below), so exactly one WASM
        // variant — the one this browser actually picks — is ever downloaded.
        globIgnores: ['**/litert-wasm/**', '**/models/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB — Mapbox GL JS is ~2.2MB
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // The classifier. CacheFirst because the filename is versioned
            // (ripple-classifier-v1.tflite), so a new model is a new URL and
            // cache invalidation costs nothing. This is what makes offline
            // classification work — PRD §10.5.
            urlPattern: /\/models\/.*\.tflite$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ripple-ai-model',
              expiration: { maxEntries: 2 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // LiteRT WASM runtime, pinned to the installed package version by
            // scripts/sync-litert-wasm.mjs.
            urlPattern: /\/litert-wasm\/.*\.(wasm|js)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ripple-litert-runtime',
              expiration: { maxEntries: 12 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-tiles',
              expiration: { maxAgeSeconds: 604800 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 31536000 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { '@': '/src' }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // The PWA plugin injects a virtual module that has no meaning under test.
    exclude: ['node_modules', 'dist', 'supabase'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/types/**']
    }
  }
})
