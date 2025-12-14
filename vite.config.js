import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: '/gift-planner/',
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