import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './i18n/index'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Warm-up del backend — se dispara en segundo plano al cargar la app.
// No bloquea el render, no muestra error si falla.
// Necesario porque el backend en Render (plan gratuito) se duerme tras 15 min de inactividad.
const _BASE = import.meta.env.VITE_API_URL ?? '';
fetch(`${_BASE}/api/health`, {
  method: 'GET',
  signal: AbortSignal.timeout(90000),
}).catch(() => { /* warm-up silencioso */ });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
