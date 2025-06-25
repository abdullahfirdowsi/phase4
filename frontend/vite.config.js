import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Suppress deprecation warnings from Bootstrap and other dependencies
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'mixed-decls']
      }
    }
  },
  build: {
    // Increase chunk size warning limit to 1000kb (from default 500kb)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          
          // Routing
          'router': ['react-router-dom'],
          
          // State management
          'redux': ['@reduxjs/toolkit', 'react-redux'],
          
          // UI libraries
          'ui-vendor': ['bootstrap', 'react-bootstrap', 'react-bootstrap-icons', 'react-icons'],
          
          // Charts and visualization
          'charts': ['recharts'],
          
          // Markdown and text processing
          'markdown': ['react-markdown', 'remark-gfm'],
          
          // Authentication
          'auth': ['@react-oauth/google', 'jwt-decode'],
          
          // Utilities
          'utils': ['date-fns', 'react-resizable']
        }
      }
    }
  }
})
 