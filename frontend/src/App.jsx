import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import Leaderboard from './pages/Leaderboard';
import RoomPage from './pages/RoomPage';
import CoupGamePage from './pages/CoupGamePage';
import ExplodingKittensPage from './pages/ExplodingKittensPage';
import UnoPage from './pages/UnoPage';
import MonopolyPage from './pages/MonopolyPage';
import './index.css';
import SoundToggle from './components/SoundToggle';
import GameSoundscape from './components/GameSoundscape';

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
      <Route path="/leaderboard" element={
        <ProtectedRoute><Leaderboard /></ProtectedRoute>
      } />
      <Route path="/room/:roomId" element={
        <ProtectedRoute><RoomPage /></ProtectedRoute>
      } />
      <Route path="/game/coup/:roomId" element={
        <ProtectedRoute><CoupGamePage /></ProtectedRoute>
      } />
      <Route path="/game/kittens/:roomId" element={
        <ProtectedRoute><ExplodingKittensPage /></ProtectedRoute>
      } />
      {import.meta.env.DEV && <Route path="/preview/kittens" element={<ExplodingKittensPage preview />} />}
      <Route path="/game/uno/:roomId" element={
        <ProtectedRoute><UnoPage /></ProtectedRoute>
      } />
      <Route path="/game/monopoly/:roomId" element={
        <ProtectedRoute><MonopolyPage /></ProtectedRoute>
      } />
      {import.meta.env.DEV && <Route path="/preview/monopoly" element={<MonopolyPage preview />} />}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: 'var(--bg-card-solid)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '0.9rem'
                },
                duration: 3000
              }}
            />
            <SoundToggle />
            <GameSoundscape />
            <AppRoutes />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
