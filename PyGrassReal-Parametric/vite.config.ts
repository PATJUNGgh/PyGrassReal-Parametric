import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false // ปิด error overlay เพื่อไม่ให้แสดง error บนหน้าจอ
    }
  }
})
