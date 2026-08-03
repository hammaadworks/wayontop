import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './lib/i18n'
import App from './App.tsx'
import { InAppBrowserBlocker } from './components/InAppBrowserBlocker.tsx'

const LandingPage = lazy(() => import('./pages/LandingPage.tsx'))
const SponsorsPortal = lazy(() => import('./pages/SponsorsPortal.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InAppBrowserBlocker>
      <BrowserRouter>
        <Suspense fallback={
          <div className="flex h-screen w-full flex-col items-center justify-center bg-black">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
            <p className="mt-4 text-emerald-500 font-medium animate-pulse">Loading experience...</p>
          </div>
        }>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/about" element={<LandingPage />} />
            <Route path="/sponsors" element={<SponsorsPortal />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </InAppBrowserBlocker>
  </StrictMode>,
)
