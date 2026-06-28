import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite 빌드/개발 서버 설정.
export default defineConfig({
  // React + Tailwind 플러그인은 Make 환경에서 둘 다 필수다.
  // Tailwind를 직접 쓰지 않더라도 제거하면 안 된다.
  plugins: [react(), tailwindcss()],

  resolve: {
    // "@" → src 디렉터리 별칭
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // raw import를 허용할 확장자. .css/.ts/.tsx 는 절대 추가하지 말 것.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
