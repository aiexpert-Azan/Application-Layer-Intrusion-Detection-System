import { Navigate, Route, Routes } from 'react-router-dom'

import ClientDetail from './pages/ClientDetail'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import ShopTalkPortal from './pages/ShopTalkPortal'

function isAuthenticated() {
  return localStorage.getItem('authenticated') === 'true'
}

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

function LoginRoute() {
  return isAuthenticated() ? <Navigate to="/client/1" replace /> : <Login />
}

function HomeRoute() {
  return isAuthenticated() ? <Navigate to="/client/1" replace /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/:id"
        element={
          <ProtectedRoute>
            <ClientDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/shoptalk"
        element={
          <ProtectedRoute>
            <ShopTalkPortal />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
