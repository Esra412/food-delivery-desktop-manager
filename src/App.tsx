import { useEffect, useMemo, useRef, useState } from 'react'
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import DeliveryPage from './pages/DeliveryPage'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import ProductAdminPage from './pages/ProductAdminPage'
import SettingsPage from './pages/SettingsPage'
import WholesalePage from './pages/WholesalePage'
import { applyAppTheme, loadAppSettings } from './settings/appSettings'

function AppRoutes() {
  const [settings, setSettings] = useState(loadAppSettings)
  const hasAppliedDefaultPage = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    applyAppTheme(settings)
  }, [settings])

  useEffect(() => {
    const handleSettingsUpdate = () => setSettings(loadAppSettings())
    window.addEventListener('app-settings-updated', handleSettingsUpdate)
    return () => window.removeEventListener('app-settings-updated', handleSettingsUpdate)
  }, [])

  useEffect(() => {
    if (hasAppliedDefaultPage.current) {
      return
    }

    hasAppliedDefaultPage.current = true

    if (location.pathname === '/' && settings.defaultPage !== 'home') {
      navigate(`/${settings.defaultPage}`, { replace: true })
    }
  }, [location.pathname, navigate, settings.defaultPage])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductAdminPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/delivery" element={<DeliveryPage />} />
      <Route path="/wholesale" element={<WholesalePage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route
        path="*"
        element={
          <Navigate
            to={settings.defaultPage === 'home' ? '/' : `/${settings.defaultPage}`}
            replace
          />
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
