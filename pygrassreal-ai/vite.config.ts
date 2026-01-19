import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Increase the warning limit to 2000kB (2MB) to prevent "Adjust chunk size limit" warnings
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large 3D libraries into their own chunk
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          // Split core React dependencies
          vendor: ['react', 'react-dom'],
          // Split UI icons and utilities
          ui: ['lucide-react', '@supabase/supabase-js']
        }
      }
    }
  }
});