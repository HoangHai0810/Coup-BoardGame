import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoomPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { send, subscribe, connected } = useSocket();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/rooms/${roomId}`)
      .then(res => setRoom(res.data))
      .catch(() => { toast.error('Phòng không tồn tại'); navigate('/lobby'); })
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      api.get(`/rooms/${roomId}`).then(res => {
        setRoom(res.data);
        if (res.data.status === 'IN_GAME') {
          const gamePath = res.data.gameType.toLowerCase();
          navigate(`/game/${gamePath}/${roomId}`);
        }
      }).catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [roomId, navigate]);

  const handleStart = () => {
    if (connected) {
      send(`/app/game/${roomId}/start`, {});
    }
  };

  const handleLeave = async () => {
    try {
      await api.post(`/rooms/${roomId}/leave`);
      navigate('/lobby');
    } catch (err) {}
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );

  const isHost = room?.hostId === user?.id;
  const canStart = (room?.players?.length || 0) + (room?.aiCount || 0) >= 2;
  const totalSlots = room?.maxPlayers || 4;
  const humanSlots = totalSlots - (room?.aiCount || 0);

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ padding: '40px 24px', flex: 1 }}>
        
        <div style={{ marginBottom: 32 }}>
          <div className="badge badge-gold" style={{ marginBottom: 10 }}>
            {room?.gameType === 'KITTENS' ? '🙀 Mèo nổ' : room?.gameType === 'UNO' ? '🌈 Uno' : '🃏 Coup'}
          </div>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>{room?.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 800 }}>Mã phòng: {roomId}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>
          <div className="main-content">
            <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>👥 Người chơi trong phòng</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
              {room?.players?.map((p, i) => (
                <motion.div 
                  key={p.id} 
                  className="card" 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: p.id === room.hostId ? '2px solid var(--accent-gold)' : '2px solid transparent' }}
                >
                  <img src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`} 
                    style={{ width: 50, height: 50, borderRadius: '50%' }} 
                  />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        {p.username}
                        {p.id === user?.id && <span style={{ marginLeft: 6, fontSize: '0.8rem', color: 'var(--accent-primary)' }}>(Bạn)</span>}
                    </div>
                    {p.id === room.hostId && <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>CHỦ PHÒNG</span>}
                  </div>
                </motion.div>
              ))}

              {[...Array(room?.aiCount || 0)].map((_, i) => (
                <div key={`ai-${i}`} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, opacity: 0.7 }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🤖</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>Bot {i + 1} (AI)</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              {isHost ? (
                <button 
                  onClick={handleStart} 
                  className="btn btn-primary" 
                  disabled={!canStart || !connected}
                  style={{ padding: '16px 40px', fontSize: '1.1rem' }}
                >
                  {!connected ? 'Đang kết nối...' : 'Bắt đầu ngay →'}
                </button>
              ) : (
                <div className="card" style={{ padding: '16px 24px', flex: 1, textAlign: 'center', background: 'var(--bg-glass)' }}>
                    <p style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>⌛ Đang chờ chủ phòng bắt đầu...</p>
                </div>
              )}
              <button onClick={handleLeave} className="btn btn-ghost" style={{ border: '2px solid var(--border)' }}>
                Thoát
              </button>
            </div>
          </div>

          <aside>
            <ChatBox roomId={roomId} />
          </aside>
        </div>
      </div>
    </div>
  );
}
