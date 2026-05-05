import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Lobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', maxPlayers: 4, aiCount: 0, gameType: 'COUP' });
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch { toast.error('Không thể tải danh sách phòng'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/rooms', {
        name: createForm.name || `${user.username}'s Room`,
        maxPlayers: parseInt(createForm.maxPlayers),
        aiCount: parseInt(createForm.aiCount),
        gameType: createForm.gameType
      });
      toast.success(t('lobby.roomCreated') || 'Phòng đã được tạo!');
      navigate(`/room/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Tạo phòng thất bại');
    } finally { setCreating(false); }
  };

  const handleJoin = async (roomId) => {
    try {
      await api.post(`/rooms/${roomId}/join`);
      navigate(`/room/${roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Không thể vào phòng');
    }
  };

  const handleJoinByCode = async e => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try {
      await api.post(`/rooms/${code}/join`);
      navigate(`/room/${code}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Mã phòng không hợp lệ');
    }
  };

  // Quick play vs AI
  const handleQuickPlay = async () => {
    setCreating(true);
    try {
      const res = await api.post('/rooms', {
        name: `${user.username} vs AI`,
        maxPlayers: 4,
        aiCount: 3,
        gameType: createForm.gameType
      });
      navigate(`/room/${res.data.id}`);
    } catch { toast.error('Lỗi tạo game'); }
    finally { setCreating(false); }
  };

  return (
    <div className="page">
      <Navbar />

      <div className="container" style={{ padding: '40px 24px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <h1 style={{ fontSize: '2rem', marginBottom: 4, color: 'var(--text-primary)' }}>🎮 {t('lobby.title')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{t('lobby.welcome', { name: user?.username })}</p>
          </motion.div>
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={handleQuickPlay} className="btn btn-green" disabled={creating}>
              {t('lobby.quickPlay')}
            </button>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              ＋ {t('lobby.createRoom')}
            </button>
          </motion.div>
        </div>

        {/* Join by code */}
        <motion.div 
          className="card" 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ padding: 20, marginBottom: 32, background: 'var(--bg-glass)' }}
        >
          <form onSubmit={handleJoinByCode} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 800 }}>
              🔑 {t('lobby.joinRoom')}:
            </span>
            <input className="input"
              placeholder={t('lobby.joinCode')}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ width: 220, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}
            />
            <button type="submit" className="btn btn-blue" disabled={joinCode.length !== 6}>
              {t('lobby.joinBtn')} →
            </button>
          </form>
        </motion.div>

        {/* Room list */}
        <h2 style={{ fontSize: '1.4rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          {t('lobby.publicRooms')}
          <span className="badge badge-green">
            {rooms.length}
          </span>
        </h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : rooms.length === 0 ? (
          <motion.div 
            className="card" 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            style={{ padding: 48, textAlign: 'center', borderStyle: 'dashed' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎭</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontWeight: 700 }}>
              Không có phòng nào đang mở — hãy tạo phòng đầu tiên!
            </p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              {t('lobby.createRoom')}
            </button>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {rooms.map((room, i) => (
              <motion.div 
                key={room.id} 
                className="card" 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ padding: 24 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: 6, color: 'var(--text-primary)' }}>{room.name}</h3>
                    <code style={{
                      fontSize: '0.8rem', color: '#f57f17', fontWeight: 800,
                      background: '#fff8e1', padding: '4px 10px', borderRadius: 6, border: '2px solid #ffe082'
                    }}>
                      #{room.id}
                    </code>
                  </div>
                  <span className="badge badge-gold" style={{ height: 'fit-content' }}>{room.gameType}</span>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    👥 {room.players.length}/{room.maxPlayers}
                  </span>
                  {room.aiCount > 0 && (
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      🤖 {room.aiCount} AI
                    </span>
                  )}
                </div>

                {/* Player avatars */}
                <div style={{ display: 'flex', gap: -8, marginBottom: 20, flexWrap: 'wrap' }}>
                  {room.players.map(p => (
                    <img key={p.id} src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`}
                      alt={p.username} title={p.username}
                      style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid white', marginLeft: -8, zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    />
                  ))}
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => handleJoin(room.id)}
                  disabled={room.players.length >= room.maxPlayers - room.aiCount}
                >
                  {room.players.length >= room.maxPlayers - room.aiCount ? 'Full' : `${t('lobby.joinBtn')} →`}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <motion.div 
              className="modal" 
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.4 }}
            >
              <h2 style={{ marginBottom: 8, fontSize: '1.8rem' }}>{t('lobby.createRoom')}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontWeight: 600 }}>
                {t('lobby.roomConfig')}
              </p>

              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>Room Name</label>
                  <input className="input"
                    placeholder={`${user.username}'s Room`}
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label>{t('lobby.gameSelection') || 'Chọn Trò Chơi'}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 8 }}>
                    <div 
                      onClick={() => setCreateForm({ ...createForm, gameType: 'COUP' })}
                      className={`game-card-select ${createForm.gameType === 'COUP' ? 'active' : ''}`}
                    >
                      <span style={{ fontSize: '1.5rem' }}>🃏</span>
                      <span>Coup</span>
                    </div>
                    <div 
                      onClick={() => setCreateForm({ ...createForm, gameType: 'KITTENS', maxPlayers: 5 })}
                      className={`game-card-select ${createForm.gameType === 'KITTENS' ? 'active' : ''}`}
                    >
                      <span style={{ fontSize: '1.5rem' }}>🙀</span>
                      <span>Mèo nổ</span>
                    </div>
                    <div 
                      onClick={() => setCreateForm({ ...createForm, gameType: 'UNO', maxPlayers: 10 })}
                      className={`game-card-select ${createForm.gameType === 'UNO' ? 'active' : ''}`}
                    >
                      <span style={{ fontSize: '1.5rem' }}>🌈</span>
                      <span>Uno</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('lobby.maxPlayers')}</label>
                    <select className="input"
                      value={createForm.maxPlayers}
                      onChange={e => setCreateForm(f => ({ ...f, maxPlayers: e.target.value }))}>
                      {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>

                  <div className="form-group">
                    <label>{t('lobby.aiBots')}</label>
                    <select className="input"
                      value={createForm.aiCount}
                      onChange={e => setCreateForm(f => ({ ...f, aiCount: e.target.value }))}>
                      {[0,1,2,3,4,5].filter(n => n < createForm.maxPlayers).map(n =>
                        <option key={n} value={n}>{n}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button type="button" className="btn btn-ghost"
                    style={{ flex: 1 }} onClick={() => setShowCreate(false)}>
                    {t('lobby.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary"
                    style={{ flex: 2 }} disabled={creating}>
                    {creating ? '...' : t('lobby.createBtn')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
