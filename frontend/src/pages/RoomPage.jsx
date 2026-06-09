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
      .catch(err => {
        if (err.response?.status === 404) {
          toast.error(t('room.notFound', 'Không tìm thấy phòng chơi!')); 
          navigate('/lobby');
        }
      })
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      api.get(`/rooms/${roomId}`).then(res => {
        setRoom(res.data);
        if (res.data.status === 'IN_GAME') {
          const gamePath = res.data.gameType.toLowerCase();
          navigate(`/game/${gamePath}/${roomId}`);
        }
      }).catch(err => {
        if (err.response?.status === 404) {
          toast.error(t('room.dissolved', 'Phòng chơi đã bị giải tán!'));
          navigate('/lobby');
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [roomId, navigate, t]);

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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    toast.success(t('room.codeCopied', 'Đã sao chép mã phòng vào bộ nhớ tạm!'), {
      icon: '📋',
      style: {
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        border: '1px solid var(--accent-cyan)'
      }
    });
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{
          width: 60,
          height: 60,
          border: '4px solid rgba(109,40,217,0.1)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%'
        }}
      />
    </div>
  );

  const isHost = room?.hostId === user?.id;
  const canStart = (room?.players?.length || 0) + (room?.aiCount || 0) >= 2;
  const totalSlots = room?.maxPlayers || 4;
  const humanSlots = totalSlots - (room?.aiCount || 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Glow elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '30%', width: '400px', height: '400px', background: 'var(--accent-primary)', opacity: 0.1, filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '300px', height: '300px', background: 'var(--accent-cyan)', opacity: 0.08, filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }} />

      <Navbar />
      <div className="container" style={{ padding: '40px 24px', flex: 1, position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header section with room detail details */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}
        >
          <div>
            <span className="badge badge-gold floating-element" style={{ marginBottom: 12, padding: '6px 14px', fontSize: '0.85rem', fontWeight: 800 }}>
              {room?.gameType === 'KITTENS' ? `🙀 ${t('games.kittens', 'Mèo Nổ')}` : room?.gameType === 'UNO' ? `🌈 ${t('games.uno', 'Uno')}` : room?.gameType === 'MONOPOLY' ? `🎩 ${t('games.monopoly', 'Cờ Tỷ Phú')}` : `🃏 ${t('games.coup', 'Coup')}`}
            </span>
            <h1 className="display-font" style={{ fontSize: '2.8rem', color: 'var(--text-primary)', textShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: 8 }}>{room?.name}</h1>
          </div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileActive={{ scale: 0.98 }}
            onClick={handleCopyCode}
            style={{ 
              background: 'var(--bg-glass)',
              border: '1px solid var(--accent-cyan)',
              padding: '16px 24px', 
              borderRadius: 20, 
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm), inset 0 0 15px rgba(6,182,212,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--accent-cyan)', fontWeight: 800 }}>{t('room.code', 'Mã phòng')}</div>
              <div className="mono-font" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{roomId}</div>
            </div>
            <div style={{ fontSize: '1.4rem' }}>📋</div>
          </motion.div>
        </motion.div>

        <div className="room-layout" style={{ flex: 1 }}>
          <div className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <h2 className="display-font" style={{ fontSize: '1.4rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>👥</span> {t('room.players', 'Người chơi đã tham gia')}
              <span style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>({(room?.players?.length || 0) + (room?.aiCount || 0)}/{totalSlots})</span>
            </h2>
            
            {/* Grid display with framer-motion stagger animation */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20, marginBottom: 40 }}
            >
              {room?.players?.map((p, i) => {
                const isHostPlayer = p.id === room.hostId;
                const isSelf = p.id === user?.id;
                return (
                  <motion.div 
                    key={p.id} 
                    variants={itemVariants}
                    whileHover={{ scale: 1.03, y: -5, boxShadow: isHostPlayer ? '0 12px 25px rgba(245,158,11,0.2)' : '0 12px 25px rgba(109,40,217,0.2)' }}
                    className="card glass" 
                    style={{ 
                      padding: 20, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 16, 
                      borderRadius: 24,
                      position: 'relative',
                      overflow: 'hidden',
                      border: isHostPlayer ? '2px solid var(--accent-gold)' : (isSelf ? '2px solid var(--accent-primary)' : '1px solid var(--border)')
                    }}
                  >
                    {/* Glowing particle-like line on top of host card */}
                    {isHostPlayer && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)', animation: 'expand-width 1.5s infinite alternate' }} />
                    )}

                    <div style={{ position: 'relative' }}>
                      <img 
                        src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`} 
                        alt={p.username}
                        style={{ 
                          width: 56, 
                          height: 56, 
                          borderRadius: '50%', 
                          border: isHostPlayer ? '3px solid var(--accent-gold)' : (isSelf ? '3px solid var(--accent-primary)' : '2px solid var(--text-muted)'),
                          boxShadow: isHostPlayer ? '0 0 15px rgba(245,158,11,0.4)' : 'none'
                        }} 
                      />
                      {isSelf && (
                        <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'var(--accent-primary)', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', border: '2px solid var(--bg-surface)' }}>
                          ⚡
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.username}
                        {isSelf && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 800 }}>({t('room.you', 'Bạn')})</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        {isHostPlayer && (
                          <span className="badge badge-gold" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>👑 {t('room.hostBadge', 'CHỦ PHÒNG')}</span>
                        )}
                        {!isHostPlayer && (
                          <span className="badge" style={{ fontSize: '0.6rem', padding: '2px 8px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>READY</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Bot slots */}
              {[...Array(room?.aiCount || 0)].map((_, i) => (
                <motion.div 
                  key={`ai-${i}`} 
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="card glass" 
                  style={{ 
                    padding: 20, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 16, 
                    borderRadius: 24,
                    opacity: 0.8,
                    border: '1px dashed var(--accent-cyan)'
                  }}
                >
                  <div style={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: '50%', 
                    background: 'rgba(6,182,212,0.1)', 
                    border: '2px solid var(--accent-cyan)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1.8rem',
                    boxShadow: 'inset 0 0 10px rgba(6,182,212,0.2)'
                  }}>
                    🤖
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, color: 'var(--accent-cyan)' }}>Bot {i + 1}</div>
                    <span className="badge" style={{ fontSize: '0.6rem', padding: '2px 8px', background: 'var(--accent-cyan)', color: '#000', fontWeight: 800 }}>AI AGENT</span>
                  </div>
                </motion.div>
              ))}

              {/* Empty slots indicator */}
              {[...Array(Math.max(0, totalSlots - (room?.players?.length || 0) - (room?.aiCount || 0)))].map((_, i) => (
                <motion.div 
                  key={`empty-${i}`}
                  variants={itemVariants}
                  className="card"
                  style={{ 
                    padding: 20, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    borderRadius: 24,
                    border: '2px dashed rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.01)',
                    minHeight: 98
                  }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--border)', animation: 'neon-blink 2s infinite' }} />
                    {t('room.waitingSlot', 'Đang đợi người chơi...')}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Bottom Actions Row */}
            <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
              {isHost ? (
                <motion.button 
                  whileHover={canStart && connected ? { scale: 1.05, boxShadow: 'var(--shadow-glow)' } : {}}
                  whileActive={canStart && connected ? { scale: 0.98 } : {}}
                  onClick={handleStart} 
                  className="btn btn-primary" 
                  disabled={!canStart || !connected}
                  style={{ 
                    padding: '18px 48px', 
                    fontSize: '1.15rem', 
                    borderRadius: 20,
                    fontWeight: 900,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    background: canStart ? 'linear-gradient(135deg, var(--accent-primary-light), var(--accent-primary))' : 'var(--border)'
                  }}
                >
                  {!connected ? (
                    <>
                      <div className="spinner" style={{ width: 20, height: 20, border: '3px solid transparent', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      {t('room.connecting', 'Đang kết nối...')}
                    </>
                  ) : (
                    <>
                      🚀 {t('room.start', 'BẮT ĐẦU TRÒ CHƠI')}
                    </>
                  )}
                </motion.button>
              ) : (
                <div className="card glass" style={{ padding: '16px 24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,182,212,0.03)', border: '1px dashed var(--accent-cyan)', borderRadius: 20 }}>
                  <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent-cyan)', animation: 'pulse-radar 1.5s infinite' }} />
                    ⌛ {t('room.waiting', 'Đợi chủ phòng bắt đầu trận đấu...')}
                  </div>
                </div>
              )}
              
              <motion.button 
                whileHover={{ scale: 1.03, background: 'rgba(239,68,68,0.1)', borderColor: 'var(--accent-red)' }}
                whileActive={{ scale: 0.98 }}
                onClick={handleLeave} 
                className="btn btn-ghost" 
                style={{ 
                  border: '2px solid var(--border)', 
                  padding: '18px 36px', 
                  borderRadius: 20,
                  fontWeight: 800,
                  color: 'var(--text-secondary)'
                }}
              >
                🚪 {t('room.leave', 'Rời phòng')}
              </motion.button>
            </div>
          </div>

          <aside style={{ height: '100%', minHeight: 450, display: 'flex', flexDirection: 'column' }}>
            <ChatBox roomId={roomId} />
          </aside>
        </div>
      </div>
    </div>
  );
}
