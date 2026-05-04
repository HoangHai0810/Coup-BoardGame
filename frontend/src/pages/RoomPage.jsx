import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function RoomPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { send, subscribe, connected } = useSocket();
  const navigate = useNavigate();
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
          navigate(`/game/coup/${roomId}`);
        }
      }).catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [roomId]);

  const handleStart = () => {
    if (connected) {
      send(`/app/game/${roomId}/start`, {});
    }
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
          <div>
            <div className="badge badge-gold" style={{ marginBottom: 10 }}>🃏 Coup</div>
            <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>{room?.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Phòng chờ — chờ người chơi tham gia
            </p>
          </div>

          {/* Room code */}
          <div className="glass" style={{ padding: '16px 24px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>MÃ PHÒNG</p>
            <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.2em', color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
              {roomId}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={copyCode} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                📋 Copy mã
              </button>
              <button onClick={shareLink} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                🔗 Share link
              </button>
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20 }}>
            Người chơi
            <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8, fontSize: '0.9rem' }}>
              {room?.players?.length}/{humanSlots} người (+ {room?.aiCount} AI)
            </span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Human players */}
            {room?.players?.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-card)',
                border: p.id === room.hostId ? '1px solid rgba(245,200,66,0.3)' : '1px solid var(--border)'
              }}>
                <img src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`}
                     alt={p.username}
                     style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--border)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {p.username}
                    {p.id === user?.id && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8, fontSize: '0.85rem' }}>(Bạn)</span>}
                  </div>
                  {p.id === room.hostId && (
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>👑 Host</span>
                  )}
                </div>
                <div className="online-dot" />
              </div>
            ))}

            {/* AI slots */}
            {Array.from({ length: room?.aiCount || 0 }).map((_, i) => (
              <div key={`ai-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(155,93,229,0.05)',
                border: '1px dashed rgba(155,93,229,0.3)'
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(155,93,229,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>🤖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>AI Bot {i + 1}</div>
                  <span className="badge badge-blue" style={{ fontSize: '0.7rem', marginTop: 4, display: 'inline-flex' }}>Strategic AI</span>
                </div>
              </div>
            ))}

            {/* Empty human slots */}
            {Array.from({ length: Math.max(0, humanSlots - (room?.players?.length || 0)) }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border)',
                opacity: 0.5
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: '2px dashed var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', color: 'var(--text-muted)'
                }}>?</div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Đang chờ...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: isHost ? 'space-between' : 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/lobby')} className="btn btn-ghost">
            ← Rời phòng
          </button>

          {isHost && (
            <button
              className="btn btn-primary"
              style={{ padding: '13px 32px', fontSize: '1rem' }}
              onClick={handleStart}
              disabled={!canStart || !connected}
            >
              {!connected ? '⏳ Đang kết nối...' :
               !canStart ? `Cần ít nhất 2 người chơi` : '🚀 Bắt đầu game!'}
            </button>
          )}
        </div>

        {!isHost && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 20, fontSize: '0.9rem' }}>
            ⏳ Đang chờ host bắt đầu game...
          </p>
        )}
      </div>
    </div>
  );
}
