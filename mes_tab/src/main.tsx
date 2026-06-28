import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ScanActionProvider } from './context/ScanActionContext'
import { ToastProvider } from './context/ToastContext'
import { UnsavedChangesProvider } from './context/UnsavedChangesContext'

type ProviderComponent = (props: { children: ReactNode }) => ReactNode

// 바깥→안 순서. reduceRight로 첫 항목이 가장 바깥 Provider가 되도록 감싼다.
// (인증 → 토스트 → 미저장변경 → 스캔액션 → App)
const PROVIDERS: ProviderComponent[] = [
  AuthProvider,
  ToastProvider,
  UnsavedChangesProvider,
  ScanActionProvider,
]

function composeProviders(leaf: ReactNode): ReactNode {
  return PROVIDERS.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, leaf)
}

const host = document.getElementById('root')
if (!host) {
  throw new Error('#root 엘리먼트가 없어 태블릿 앱을 마운트할 수 없습니다.')
}

createRoot(host).render(<StrictMode>{composeProviders(<App />)}</StrictMode>)
