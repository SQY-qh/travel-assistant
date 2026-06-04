import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import DeviceStage from '@/components/layout/DeviceStage'
import Home from '@/pages/Home'
import Plan from '@/pages/Plan'
import Prepare from '@/pages/Prepare'

function RoutedApp() {
  const location = useLocation()

  return (
    <DeviceStage currentPath={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/prepare" element={<Prepare />} />
      </Routes>
    </DeviceStage>
  )
}

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

  return (
    <BrowserRouter basename={basename || undefined}>
      <RoutedApp />
    </BrowserRouter>
  )
}
