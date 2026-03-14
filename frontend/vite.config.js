import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8888,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ['www.kalin.asia', '.kalin.asia'],
    proxy: {
      '/api': {
        target: 'http://localhost:8282',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React 生态系统
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react';
          }
          // Markdown 相关
          if (id.includes('node_modules/react-markdown/') || 
              id.includes('node_modules/remark-') || 
              id.includes('node_modules/rehype-')) {
            return 'vendor-markdown';
          }
          // 图标库
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
          // 工具库
          if (id.includes('node_modules/axios/')) {
            return 'vendor-utils';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})