import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// 태블릿(스캐너) 앱 빌드 + 테스트 설정. dev 서버 포트는 다른 앱과 겹치지 않게 5175 고정.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    restoreMocks: true,
    setupFiles: './src/test/setup.ts',
  },
  server: {
    port: 5175,
  },
})
