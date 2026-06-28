import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

const container = document.getElementById('root')
if (!container) {
  throw new Error('루트 컨테이너(#root)를 찾지 못해 대시보드를 마운트할 수 없습니다.')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
