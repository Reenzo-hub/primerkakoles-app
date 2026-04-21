import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import TryPage from './pages/TryPage.jsx'
import GalleryPage from './pages/GalleryPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AuthCallbackPage from './pages/AuthCallbackPage.jsx'
import CabinetPage from './pages/CabinetPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/try" element={<TryPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/cabinet" element={<CabinetPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
