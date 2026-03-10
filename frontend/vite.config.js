import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8888,
    strictPort: true,  // 端口被占用时报错退出，触发 systemd 重启
    host: '0.0.0.0',
    allowedHosts: ['www.kalin.asia', '.kalin.asia'],
    proxy: {
      '/api': {
        target: 'http://localhost:8282',
        changeOrigin: true
      }
    }
  }
})