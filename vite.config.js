import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: './', // Относительные пути для локального Android APK
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})