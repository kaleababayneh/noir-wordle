import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: { target: 'esnext' },
    exclude: ['@noir-lang/noirc_abi', '@noir-lang/acvm_js'],
  },
  resolve: {
    alias: {
      buffer: resolve(__dirname, 'node_modules', 'buffer'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: '0.0.0.0',
    hmr: { clientPort: 443 },
    // ✅ Allow production domains (required for Host header check)
    allowedHosts: ['zkwordle.app', '.zkwordle.app', 'www.zkwordle.app'],
  },
  preview: {
    host: true,
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    strictPort: false,
    // 👇 Allow your production/preview hostnames
    allowedHosts: ['zkwordle.app', '.zkwordle.app', 'www.zkwordle.app'],
    // If you preview over HTTPS with a valid cert, host checks are skipped,
    // but keeping the allowlist is safer and explicit.
  },
})
