import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['recharts']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'vendor-react'
          }

          if (
            id.includes('three')
            || id.includes('@react-three')
            || id.includes('three-stdlib')
          ) {
            return 'vendor-three'
          }

          if (id.includes('@supabase')) {
            return 'vendor-supabase'
          }

          if (id.includes('lucide-react')) {
            return 'vendor-ui'
          }

          return 'vendor'
        },
      },
    },
  },
  server: {
    headers: {
      'Cache-Control': 'no-store',
    },
    hmr: {
      overlay: false // ปิด error overlay เพื่อไม่ให้แสดง error บนหน้าจอ
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
