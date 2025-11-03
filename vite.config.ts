import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';
  return {
    base: '/',
    // Evitar exponer claves sensibles en el bundle del cliente.
    // El frontend debe acceder a variables con import.meta.env.
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@google/genai': path.resolve(__dirname, './node_modules/@google/genai'),
      },
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifestFilename: 'manifest.json', // Forzar el nombre del archivo
        manifest: {
          name: 'Laboratorio Clínico VidaMed',
          short_name: 'VidaMed',
          description: 'Accede a tus resultados, agenda citas y más.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '.',
          start_url: '.',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        },
      }),
    ],
    server: {
      host: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: true,
      port: 4173, // Puedes especificar un puerto si quieres
      historyApiFallback: true,
    },
  };
});