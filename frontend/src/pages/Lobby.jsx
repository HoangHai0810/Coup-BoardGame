import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Lobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', maxPlayers: 4, aiCount: 0, gameType: 'COUP', boardType: 'VIETNAM' });
  const [creating, setCreating] = useState(false);
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch { toast.error(t('lobby.errorLoadRooms') || 'Không thể tải danh sách phòng'); }
    finally { setLoading(false); }
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await api.get('/users/online');
      setOnlineUsers(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchRooms();
    fetchOnlineUsers();
    const interval = setInterval(() => {
        fetchRooms();
        fetchOnlineUsers();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/rooms', {
        name: createForm.name || t('lobby.defaultRoomName', { username: user.username }),
        maxPlayers: parseInt(createForm.maxPlayers),
        aiCount: parseInt(createForm.aiCount),
        gameType: createForm.gameType,
        boardType: createForm.boardType
      });
      toast.success(t('lobby.roomCreated'));
      navigate(`/room/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || t('lobby.errorCreateRoom'));
    } finally { setCreating(false); }
  };

  const handleJoin = async (roomId) => {
    try {
      await api.post(`/rooms/${roomId}/join`);
      navigate(`/room/${roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || t('lobby.errorJoinRoom'));
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
      toast.error(err.response?.data?.error || t('lobby.errorInvalidCode'));
    }
  };

  // Quick play vs AI
  const handleQuickPlay = async (type) => {
    setCreating(true);
    setShowQuickSelect(false);
    try {
      const res = await api.post('/rooms', {
        name: t('lobby.quickPlayVsAI', { username: user?.username || '', type }),
        maxPlayers: type === 'UNO' ? 6 : 4,
        aiCount: type === 'UNO' ? 5 : 3,
        gameType: type
      });
      navigate(`/room/${res.data.id}`);
    } catch { toast.error(t('lobby.errorCreateGame')); }
    finally { setCreating(false); }
  };

  return (
    <div className="page" style={{ background: 'var(--bg-base)' }}>
      <Navbar />

      <div className="container" style={{ padding: '48px 24px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 24 }}>
          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <h1 className="display-font" style={{ fontSize: '2.5rem', marginBottom: 8, color: 'var(--text-primary)' }}>
              🎮 {t('lobby.title')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 700 }}>
              {t('lobby.welcome', { name: user?.username })}
            </p>
          </motion.div>
          
          <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', position: 'relative' }}>
            <button onClick={() => setShowQuickSelect(!showQuickSelect)} className="btn btn-blue" disabled={creating} style={{ padding: '14px 28px' }}>
              ⚡ {t('lobby.quickPlay')}
            </button>
            <AnimatePresence>
              {showQuickSelect && (
                <motion.div 
                  initial={{ opacity: 0, y: 15, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.9 }}
                  style={{
                    position: 'absolute', top: '115%', right: 0, background: 'white', 
                    padding: 16, borderRadius: 24, boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000, display: 'flex', gap: 12, border: '4px solid var(--accent-primary)',
                    minWidth: 320
                  }}
                >
                  <button onClick={() => handleQuickPlay('COUP')} className="btn btn-ghost" style={{ flex: 1 }}>🃏 Coup</button>
                  <button onClick={() => handleQuickPlay('KITTENS')} className="btn btn-ghost" style={{ flex: 1, color: '#f57c00' }}>🙀 {t('games.kittens') || 'Mèo nổ'}</button>
                  <button onClick={() => handleQuickPlay('UNO')} className="btn btn-ghost" style={{ flex: 1, color: '#1976d2' }}>🌈 Uno</button>
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ padding: '14px 28px' }}>
              ＋ {t('lobby.createRoom')}
            </button>
          </motion.div>
        </div>

        {/* Join by code */}
        <motion.div 
          className="card" 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ padding: '24px 32px', marginBottom: 40, background: 'white', borderRadius: 32, border: '4px solid #e0e6ed' }}
        >
          <form onSubmit={handleJoinByCode} style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 900 }}>
              🔑 {t('lobby.joinRoom')}:
            </span>
            <input className="input"
              placeholder={t('lobby.joinCode')}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ width: 260, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 900, fontSize: '1.2rem', textAlign: 'center' }}
            />
            <button type="submit" className="btn btn-green" disabled={joinCode.length !== 6} style={{ padding: '14px 32px' }}>
              {t('lobby.joinBtn')} →
            </button>
          </form>
        </motion.div>

        <div className="lobby-layout">
          <div className="main-content">
            {/* Room list */}
            <h2 className="display-font" style={{ fontSize: '1.8rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
              {t('lobby.publicRooms')}
              <span className="badge badge-gold" style={{ fontSize: '1.1rem', padding: '6px 16px' }}>
                {rooms.length}
              </span>
            </h2>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                <div className="spinner" style={{ width: 60, height: 60 }} />
              </div>
            ) : rooms.length === 0 ? (
              <motion.div 
                className="card" 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ padding: 80, textAlign: 'center', border: '5px dashed var(--border)', borderRadius: 40, background: 'rgba(255,255,255,0.4)' }}
              >
                <div style={{ fontSize: '5rem', marginBottom: 24 }}>🎭</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontWeight: 800, fontSize: '1.2rem' }}>
                  {t('lobby.noRooms') || 'Không có phòng nào đang mở — hãy tạo phòng đầu tiên!'}
                </p>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ padding: '16px 40px' }}>
                  {t('lobby.createRoom')}
                </button>
              </motion.div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
                {rooms.map((room, i) => (
                  <motion.div 
                    key={room.id} 
                    className="card" 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{ padding: 32, borderRadius: 32, border: '4px solid #f0f4f8' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '1.4rem', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</h3>
                        <code style={{
                          fontSize: '0.9rem', color: '#f57f17', fontWeight: 900,
                          background: '#fff8e1', padding: '6px 14px', borderRadius: 12, border: '3px solid #ffe082'
                        }}>
                          #{room.id}
                        </code>
                      </div>
                      <span className="badge badge-blue" style={{ height: 'fit-content', fontSize: '0.8rem' }}>{room.gameType}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                      <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 800, background: '#f0f4f8', padding: '6px 14px', borderRadius: 99 }}>
                        👥 {room.players.length} / {room.maxPlayers}
                      </span>
                      {room.aiCount > 0 && (
                        <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 800, background: '#fff3e0', padding: '6px 14px', borderRadius: 99 }}>
                          🤖 {room.aiCount} AI
                        </span>
                      )}
                    </div>

                    {/* Player avatars */}
                    <div style={{ display: 'flex', gap: -12, marginBottom: 32, flexWrap: 'wrap', paddingLeft: 12 }}>
                      {room.players.map((p, idx) => (
                        <img key={p.id} src={p.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${p.username}`}
                          alt={p.username} title={p.username}
                          style={{ 
                            width: 44, height: 44, borderRadius: '50%', border: '4px solid white', 
                            marginLeft: -12, zIndex: room.players.length - idx, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' 
                          }}
                        />
                      ))}
                    </div>

                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '16px' }}
                      onClick={() => handleJoin(room.id)}
                      disabled={room.players.length >= room.maxPlayers - room.aiCount}
                    >
                      {room.players.length >= room.maxPlayers - room.aiCount ? (t('lobby.full') || 'Đã đầy') : `${t('lobby.joinBtn')} →`}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <ChatBox roomId="global" />
            
            <div className="card" style={{ padding: 32, borderRadius: 32, border: '4px solid #e0e6ed' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--accent-blue)' }}>
                <span className="online-dot" /> {t('lobby.onlinePlayers')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {onlineUsers.length === 0 ? (
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {t('lobby.onlyYouOnline') || 'Chỉ có bạn đang online'}
                  </p>
                ) : (
                  onlineUsers.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 16, background: u.id === user?.id ? '#f0f4f8' : 'transparent' }}>
                      <img src={u.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${u.username}`} 
                        alt={u.username} 
                        style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid ' + (u.id === user?.id ? 'var(--accent-primary)' : '#e0e6ed') }} 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{u.username}</span>
                        {u.id === user?.id && <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 900 }}>{t('game.you')}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div 
            className="modal-overlay" 
            onClick={() => setShowCreate(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal" 
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              style={{ padding: 48, maxWidth: 650, borderRadius: 40 }}
            >
              <h2 className="display-font" style={{ marginBottom: 12, fontSize: '2.2rem' }}>✨ {t('lobby.createRoom')}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 40, fontWeight: 700, fontSize: '1.1rem' }}>
                {t('lobby.roomConfig')}
              </p>

              <form onSubmit={handleCreate}>
                <div className="form-group" style={{ marginBottom: 32 }}>
                  <label style={{ fontSize: '1.1rem' }}>📝 {t('lobby.roomName') || 'Tên phòng'}</label>
                  <input className="input"
                    placeholder={t('lobby.defaultRoomName', { username: user.username })}
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    maxLength={100}
                    style={{ fontSize: '1.1rem', padding: '18px 24px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 32 }}>
                  <label style={{ fontSize: '1.1rem' }}>🎮 {t('lobby.gameSelection')}</label>
                  <div className="game-select-grid">
                    {[
                      { type: 'COUP', icon: '🃏', name: 'Coup' },
                      { type: 'KITTENS', icon: '🙀', name: t('games.kittens') || 'Mèo nổ', players: 5 },
                      { type: 'UNO', icon: '🌈', name: 'Uno', players: 10 },
                      { type: 'MONOPOLY', icon: '🎩', name: t('games.monopoly') || 'Cờ Tỉ Phú', players: 4 }
                    ].map(g => (
                      <div key={g.type}
                        onClick={() => setCreateForm({ ...createForm, gameType: g.type, maxPlayers: g.players || createForm.maxPlayers })}
                        className={`game-card-select ${createForm.gameType === g.type ? 'active' : ''}`}
                        style={{ padding: '20px 10px', height: 110 }}
                      >
                        <span style={{ fontSize: '2rem' }}>{g.icon}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 900 }}>{g.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 40 }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
                    <label>👥 {t('lobby.maxPlayers')}</label>
                      <select className="input"
                        value={createForm.maxPlayers}
                        style={{ padding: '16px 24px' }}
                        onChange={e => setCreateForm(f => ({ ...f, maxPlayers: e.target.value }))}>
                        {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                  </div>

                  <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
                    <label>🤖 {t('lobby.aiBots')}</label>
                    <select className="input"
                      value={createForm.aiCount}
                      style={{ padding: '16px 24px' }}
                      onChange={e => setCreateForm(f => ({ ...f, aiCount: e.target.value }))}>
                      {[0,1,2,3,4,5].filter(n => n < createForm.maxPlayers).map(n =>
                        <option key={n} value={n}>{n}</option>
                      )}
                    </select>
                  </div>
                </div>

                {createForm.gameType === 'MONOPOLY' && (
                  <div className="form-group" style={{ marginBottom: 40 }}>
                    <label>🌍 Phiên bản Bản Đồ</label>
                    <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                      <div 
                        onClick={() => setCreateForm({ ...createForm, boardType: 'VIETNAM' })}
                        className={`game-card-select ${createForm.boardType === 'VIETNAM' ? 'active' : ''}`}
                        style={{ flex: 1, padding: '16px', flexDirection: 'row', justifyContent: 'center' }}
                      >
                        <span style={{ fontSize: '1.5rem' }}>🇻🇳</span>
                        <span>Việt Nam</span>
                      </div>
                      <div 
                        onClick={() => setCreateForm({ ...createForm, boardType: 'WORLD' })}
                        className={`game-card-select ${createForm.boardType === 'WORLD' ? 'active' : ''}`}
                        style={{ flex: 1, padding: '16px', flexDirection: 'row', justifyContent: 'center' }}
                      >
                        <span style={{ fontSize: '1.5rem' }}>🌎</span>
                        <span>Thế Giới</span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 20, marginTop: 40 }}>
                  <button type="button" className="btn btn-ghost"
                    style={{ flex: 1, padding: '18px' }} onClick={() => setShowCreate(false)}>
                    {t('lobby.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary"
                    style={{ flex: 2, padding: '18px', fontSize: '1.2rem' }} disabled={creating}>
                    {creating ? '...' : t('lobby.createBtn')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
