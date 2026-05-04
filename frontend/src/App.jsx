import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import RoomPage from './pages/RoomPage';
import CoupGamePage from './pages/CoupGamePage';
import './index.css';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/lobby" element={
        <ProtectedRoute><Lobby /></ProtectedRoute>
      } />
      <Route path="/room/:roomId" element={
        <ProtectedRoute><RoomPage /></ProtectedRoute>
      } />
      <Route path="/game/coup/:roomId" element={
        <ProtectedRoute><CoupGamePage /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1a1b2e',
                color: '#f0f0f8',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '0.9rem'
              },
              duration: 3000
            }}
          />
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
