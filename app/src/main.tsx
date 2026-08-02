import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/i18n'
import App from './App.tsx'
import { InAppBrowserBlocker } from './components/InAppBrowserBlocker.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InAppBrowserBlocker>
      <App />
    </InAppBrowserBlocker>
  </StrictMode>,
)
