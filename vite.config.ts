/// <reference types="vite-plugin-pwa/client" />

import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          tone: ['tone']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}']
      },
      manifest: {
        name: 'Daisy — Interactive Experience',
        short_name: 'Daisy',
        description: 'An immersive interactive daisy flower experience with generative music and cinematic animations.',
        theme_color: '#f5f0e6',
        background_color: '#f5f0e6',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['entertainment', 'lifestyle'],
        shortcuts: [
          {
            name: 'Start Experience',
            short_name: 'Start',
            description: 'Jump straight into the interactive flower',
            url: '/'
          }
        ]
      }
    })
  ]
});
