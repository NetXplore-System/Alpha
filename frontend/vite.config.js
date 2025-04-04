import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    preview: {
      port: parseInt(env.PORT) || 4173,
      host: true,
      allowedHosts: ['alpha-frontend-4rmx.onrender.com']
    }
  }
})
