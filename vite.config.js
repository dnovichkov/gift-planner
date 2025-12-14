import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0' // Слушаем на всех интерфейсах (IPv4 и IPv6)
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})