import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

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

    // Poll room state
    const interval = setInterval(() => {
      api.get(`/rooms/${roomId}`).then(res => {
        setRoom(res.data);
        // If game started, redirect
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
    } catch (err) {}
    navigate('/lobby');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    toast.success('Đã copy mã phòng!');
  };

  const shareLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link phòng đã được copy!');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );

  const isHost = room?.hostId === user?.id;
  const canStart = room?.players?.length >= 2 || (room?.players?.length + room?.aiCount) >= 2;
  const totalSlots = room?.maxPlayers || 4;
  const humanSlots = totalSlots - (room?.aiCount || 0);

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ padding: '40px 24px', flex: 1, maxWidth: 720 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <div className="badge badge-gold" style={{ marginBottom: 10 }}>
              {room?.gameType === 'KITTENS' ? '🙀 Mèo nổ' : room?.gameType === 'UNO' ? '🌈 Uno' : '🃏 Coup'}
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: 6, color: 'var(--text-primary)' }}>{room?.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 700 }}>
              {t('room.title', { code: roomId })}
            </p>
          </motion.div>

          {/* Room code */}
          <motion.div 
            className="card" 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring' }}
            style={{ padding: '16px 24px', textAlign: 'center', borderStyle: 'dashed', borderColor: 'var(--accent-gold)' }}
          >
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 800 }}>MÃ PHÒNG</p>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '0.1em', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
              {roomId}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={copyCode} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                📋 Copy
              </button>
              <button onClick={shareLink} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                🔗 Share
              </button>
            </div>
          </motion.div>
        </div>

        {/* Players */}
        <motion.div 
          className="card" 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ padding: 28, marginBottom: 24 }}
        >
          <h2 style={{ fontSize: '1.3rem', marginBottom: 20, display: 'flex', alignItems: 'center' }}>
            {t('room.players')}
            <span className="badge badge-blue" style={{ marginLeft: 12 }}>
              {room?.players?.length}/{humanSlots} (+ {room?.aiCount} AI)
            </span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Human players */}
            {room?.players?.map((p, i) => (
              <motion.div 
                key={p.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '12px 20px', borderRadius: 'var(--radius-sm)',
                  background: 'white',
                  border: p.id === room.hostId ? '3px solid #ffe082' : '3px solid #e0e6ed',
                  boxShadow: p.id === room.hostId ? '0 4px 0 #ffe082' : 'none'
                }}
              >
                <img src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`}
                     alt={p.username}
                     style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #e0e6ed', background: '#f4f6f8' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, marginBottom: 2, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    {p.username}
                    {p.id === user?.id && <span style={{ color: 'var(--accent-primary)', fontWeight: 800, marginLeft: 8, fontSize: '0.9rem' }}>(Bạn)</span>}
                  </div>
                  {p.id === room.hostId && (
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>👑 Host</span>
                  )}
                </div>
                <div className="online-dot" />
              </motion.div>
            ))}

            {/* AI slots */}
            {Array.from({ length: room?.aiCount || 0 }).map((_, i) => (
              <motion.div 
                key={`ai-${i}`} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '12px 20px', borderRadius: 'var(--radius-sm)',
                  background: '#f3e5f5',
                  border: '3px dashed #ce93d8'
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'white', border: '3px solid #ce93d8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>🤖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: '#7b1fa2', fontSize: '1.1rem' }}>AI Bot {i + 1}</div>
                  <span className="badge" style={{ background: 'white', color: '#7b1fa2', fontSize: '0.75rem', marginTop: 4, display: 'inline-flex' }}>Strategic AI</span>
                </div>
              </motion.div>
            ))}

            {/* Empty human slots */}
            {Array.from({ length: Math.max(0, humanSlots - (room?.players?.length || 0)) }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '12px 20px', borderRadius: 'var(--radius-sm)',
                border: '3px dashed #e0e6ed',
                background: '#f8fafc',
                opacity: 0.7
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  border: '3px dashed #b0bec5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', color: '#b0bec5'
                }}>?</div>
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 700 }}>Đang chờ...</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 16, justifyContent: isHost ? 'space-between' : 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={handleLeave} className="btn btn-ghost">
            ← {t('room.leave')}
          </button>

          {isHost && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary"
              style={{ padding: '16px 36px', fontSize: '1.1rem' }}
              onClick={handleStart}
              disabled={!canStart || !connected}
            >
              {!connected ? '⏳ Đang kết nối...' :
               !canStart ? `Cần ít nhất 2 người` : `🚀 ${t('room.start')}`}
            </motion.button>
          )}
        </div>

        {!isHost && (
          <p style={{ textAlign: 'center', color: 'var(--accent-primary)', marginTop: 24, fontSize: '1.1rem', fontWeight: 800 }}>
            {t('room.waiting')}
          </p>
        )}
      </div>
    </div>
  );
}
