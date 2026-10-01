import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite 빌드/개발 서버 설정.
export default defineConfig({
  // React + Tailwind 플러그인.
  plugins: [react(), tailwindcss()],

  resolve: {
    // "@" → src 디렉터리 별칭
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // dev 서버에서도 배포(nginx)와 같은 상대경로 '/api' 를 쓰도록 프록시한다.
  // /files 는 업로드 이미지 정적 서빙 경로라 /api 하위가 아니므로 따로 넘긴다.
  server: {
    proxy: {
      '/api': { target: 'http://localhost:7081', changeOrigin: true },
      '/files': { target: 'http://localhost:7081', changeOrigin: true },
    },
  },

  // raw import를 허용할 확장자. .css/.ts/.tsx 는 절대 추가하지 말 것.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
