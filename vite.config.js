import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// GitHub Actions 构建时自动取仓库名作为子路径，本地开发保持根路径
const repo = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : ''

export default defineConfig({
  base: repo ? `/${repo}/` : '/',
  root: 'client',
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
