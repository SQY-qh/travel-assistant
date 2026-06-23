import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import DeviceStage from '@/components/layout/DeviceStage'
import Call from '@/pages/Call'
import Home from '@/pages/Home'
import OutfitTryOn from '@/pages/OutfitTryOn'
import Plan from '@/pages/Plan'
import Prepare from '@/pages/Prepare'

function RoutedApp() {
  const location = useLocation()

  return (
    <DeviceStage currentPath={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/call" element={<Call />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/prepare" element={<Prepare />} />
        <Route path="/outfit-try-on/:index" element={<OutfitTryOn />} />
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
