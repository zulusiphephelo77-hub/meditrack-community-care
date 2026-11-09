// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: { plugins: [VitePWA({ strategies: 'generateSW', filename: 'sw.js', registerType: 'autoUpdate', injectRegister: null, devOptions: { enabled: false }, manifest: { name: 'MediCare Sync', short_name: 'MediCare', display: 'standalone', start_url: '/facility/offline', theme_color: '#16866c', background_color: '#f4faf8', icons: [{ src: '/medicare-icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/medicare-icon-512.png', sizes: '512x512', type: 'image/png' }] }, workbox: { cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true, globPatterns: ['**/*.{js,css,ico,png,jpg,webp,svg}'], navigateFallback: null, runtimeCaching: [{ urlPattern: ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/~oauth') && !url.pathname.startsWith('/api'), handler: 'NetworkFirst', options: { cacheName: 'medicare-navigations', networkTimeoutSeconds: 4 } }, { urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/.*-[a-zA-Z0-9_-]+\.(js|css|png|jpg)$/.test(url.pathname), handler: 'CacheFirst', options: { cacheName: 'medicare-hashed-assets' } }] } })] },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
