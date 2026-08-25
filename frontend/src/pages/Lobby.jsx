import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import api from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const GAME_TYPES = [
  { type: 'COUP',     icon: '🃏', name: 'Coup',     color: '#7c3aed', defaultMax: 4 },
  { type: 'KITTENS',  icon: '🙀', name: 'Mèo Nổ',   color: '#ea580c', defaultMax: 5 },
  { type: 'UNO',      icon: '🌈', name: 'Uno',      color: '#10b981', defaultMax: 6 },
  { type: 'MONOPOLY', icon: '🎩', name: 'Monopoly', color: '#3b82f6', defaultMax: 4 },
];


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
  const [showMatchmakingSelect, setShowMatchmakingSelect] = useState(false);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const { subscribe, send } = useSocket();

  useEffect(() => {
    const unsub = subscribe('/user/queue/matchmaking', (msg) => {
      if (msg.status === 'MATCH_FOUND') {
        setIsMatchmaking(false);
        toast.success(t('lobby.matchFound') || 'Đã tìm thấy trận! Đang vào phòng...');
        navigate(`/room/${msg.roomId}`);
      }
    });
    return () => unsub && unsub();
  }, [subscribe, navigate, t]);

  const fetchRooms = async () => {
    try { const res = await api.get('/rooms'); setRooms(res.data); }
    catch { toast.error(t('lobby.errorLoadRooms') || 'Không thể tải danh sách phòng'); }
    finally { setLoading(false); }
  };

  const fetchOnlineUsers = async () => {
    try { const res = await api.get('/users/online'); setOnlineUsers(res.data); } catch { setOnlineUsers([]); }
  };

  useEffect(() => {
    fetchRooms(); fetchOnlineUsers();
    const interval = setInterval(() => { fetchRooms(); fetchOnlineUsers(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async e => {
    e.preventDefault(); setCreating(true);
    try {
      const res = await api.post('/rooms', {
        name: createForm.name || t('lobby.defaultRoomName', { username: user.username }),
        maxPlayers: parseInt(createForm.maxPlayers),
        aiCount: parseInt(createForm.aiCount),
        gameType: createForm.gameType,
        boardType: createForm.boardType,
      });
      toast.success(t('lobby.roomCreated')); navigate(`/room/${res.data.id}`);
    } catch (err) { toast.error(err.response?.data?.error || t('lobby.errorCreateRoom')); }
    finally { setCreating(false); }
  };

  const handleJoin = async (roomId) => {
    try { await api.post(`/rooms/${roomId}/join`); navigate(`/room/${roomId}`); }
    catch (err) { toast.error(err.response?.data?.error || t('lobby.errorJoinRoom')); }
  };

  const handleJoinByCode = async e => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try { await api.post(`/rooms/${code}/join`); navigate(`/room/${code}`); }
    catch (err) { toast.error(err.response?.data?.error || t('lobby.errorInvalidCode')); }
  };

  const handleQuickPlay = async (type) => {
    setCreating(true); setShowQuickSelect(false);
    try {
      const g = GAME_TYPES.find(g => g.type === type);
      const res = await api.post('/rooms', {
        name: t('lobby.quickPlayVsAI', { username: user?.username || '', type }),
        maxPlayers: g?.defaultMax || 4,
        aiCount: (g?.defaultMax || 4) - 1,
        gameType: type,
      });
      navigate(`/room/${res.data.id}`);
    } catch { toast.error(t('lobby.errorCreateGame')); }
    finally { setCreating(false); }
  };

  const joinMatchmaking = (type) => {
    setShowMatchmakingSelect(false); setIsMatchmaking(true);
    send(`/app/matchmaking/join/${type}`, {});
  };

  const cancelMatchmaking = () => {
    ['COUP','KITTENS','UNO','MONOPOLY'].forEach(t => send(`/app/matchmaking/leave/${t}`, {}));
    setIsMatchmaking(false);
  };

  const filteredRooms = filterType === 'ALL' ? rooms : rooms.filter(r => r.gameType === filterType);

  return (
    <div className="page" style={{ background: 'var(--bg-base)' }}>
      {/* Ambient background glow */}
      <div style={{ position: 'fixed', top: '10%', left: '5%', width: '40vw', height: '40vw',
        background: 'var(--accent-primary)', filter: 'blur(160px)', opacity: 0.07,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '5%', right: '5%', width: '35vw', height: '35vw',
        background: 'var(--accent-cyan)', filter: 'blur(160px)', opacity: 0.05,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      <Navbar />

      <div className="container" style={{ padding: '40px 24px', flex: 1, position: 'relative', zIndex: 1 }}>

        {/* ─── Header Row ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36, flexWrap: 'wrap', gap: 20 }}>
          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <div className="badge badge-cyan" style={{ marginBottom: 10, letterSpacing: '1.5px' }}>GAME LOBBY</div>
            <h1 className="display-font" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginBottom: 6 }}>
              🎮 {t('lobby.title')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
              {t('lobby.welcome', { name: user?.username })}
            </p>
          </motion.div>

          <motion.div
            initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative' }}
          >
            {/* Matchmaking */}
            <div style={{ position: 'relative' }}>
              {isMatchmaking ? (
                <button onClick={cancelMatchmaking} className="btn btn-danger" style={{ padding: '12px 24px' }}>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  {t('lobby.cancelMatchmaking') || 'Hủy ghép trận...'}
                </button>
              ) : (
                <button onClick={() => setShowMatchmakingSelect(!showMatchmakingSelect)} className="btn btn-gold" style={{ padding: '12px 24px' }}>
                  ⚔️ {t('lobby.matchmaking') || 'Ghép trận'}
                </button>
              )}
              <AnimatePresence>
                {showMatchmakingSelect && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.9 }}
                    className="glass-premium"
                    style={{ position: 'absolute', top: '115%', right: 0, padding: 16, borderRadius: 20, zIndex: 1000, minWidth: 380, display: 'flex', gap: 10 }}
                  >
                    {GAME_TYPES.map(g => (
                      <button key={g.type} onClick={() => joinMatchmaking(g.type)} className="btn btn-ghost"
                        style={{ flex: 1, flexDirection: 'column', gap: 4, padding: '10px 8px', borderRadius: 14, fontSize: '0.8rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{g.icon}</span>{g.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Play */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowQuickSelect(!showQuickSelect)} className="btn btn-blue" disabled={creating} style={{ padding: '12px 24px' }}>
                ⚡ {t('lobby.quickPlay')}
              </button>
              <AnimatePresence>
                {showQuickSelect && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.9 }}
                    className="glass-premium"
                    style={{ position: 'absolute', top: '115%', right: 0, padding: 16, borderRadius: 20, zIndex: 1000, minWidth: 380, display: 'flex', gap: 10 }}
                  >
                    {GAME_TYPES.map(g => (
                      <button key={g.type} onClick={() => handleQuickPlay(g.type)} className="btn btn-ghost"
                        style={{ flex: 1, flexDirection: 'column', gap: 4, padding: '10px 8px', borderRadius: 14, fontSize: '0.8rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{g.icon}</span>{g.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ padding: '12px 24px' }}>
              ＋ {t('lobby.createRoom')}
            </button>
          </motion.div>
        </div>

        {/* ─── Join by Code ─── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="glass-premium"
          style={{ padding: '20px 28px', marginBottom: 32, borderRadius: 24 }}
        >
          <form onSubmit={handleJoinByCode} style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
              🔑 {t('lobby.joinRoom')}:
            </span>
            <input className="input"
              placeholder={t('lobby.joinCode')}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ width: 220, textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 900, fontSize: '1.1rem', textAlign: 'center', flex: 'none' }}
            />
            <button type="submit" className="btn btn-green" disabled={joinCode.length !== 6} style={{ padding: '12px 28px', whiteSpace: 'nowrap' }}>
              {t('lobby.joinBtn')} →
            </button>
          </form>
        </motion.div>

        {/* ─── Main layout ─── */}
        <div className="lobby-layout">
          <div>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <h2 className="display-font" style={{ fontSize: '1.5rem', marginRight: 8 }}>
                {t('lobby.publicRooms')}
                <span className="badge badge-gold" style={{ marginLeft: 12, fontSize: '0.85rem', padding: '4px 12px' }}>{filteredRooms.length}</span>
              </h2>
              {['ALL', ...GAME_TYPES.map(g => g.type)].map(type => (
                <button key={type} onClick={() => setFilterType(type)}
                  style={{
                    padding: '6px 16px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 700,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: filterType === type ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: filterType === type ? 'white' : 'var(--text-secondary)',
                    boxShadow: filterType === type ? 'var(--shadow-glow)' : 'none',
                  }}>
                  {type === 'ALL' ? '🌐 All' : GAME_TYPES.find(g => g.type === type)?.icon + ' ' + GAME_TYPES.find(g => g.type === type)?.name}
                </button>
              ))}
            </div>

            {/* Room list */}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <div className="spinner" style={{ width: 56, height: 56 }} />
              </div>
            ) : filteredRooms.length === 0 ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="glass-premium"
                style={{ padding: '80px 40px', textAlign: 'center', borderRadius: 32 }}
              >
                <div style={{ fontSize: '5rem', marginBottom: 24 }}>🎭</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontWeight: 600, fontSize: '1.1rem' }}>
                  {t('lobby.noRooms') || 'Không có phòng nào — hãy tạo phòng đầu tiên!'}
                </p>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ padding: '14px 36px' }}>
                  {t('lobby.createRoom')}
                </button>
              </motion.div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                <AnimatePresence>
                  {filteredRooms.map((room, i) => {
                    const g = GAME_TYPES.find(g => g.type === room.gameType) || GAME_TYPES[0];
                    const isFull = room.players.length >= room.maxPlayers - room.aiCount;
                    return (
                      <motion.div
                        key={room.id}
                        layout
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ y: -6, scale: 1.01 }}
                        className="glass-premium"
                        style={{ padding: 24, borderRadius: 24, overflow: 'hidden', position: 'relative', cursor: 'default' }}
                      >
                        {/* Game color accent top bar */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                          background: `linear-gradient(90deg, transparent, ${g.color}, transparent)` }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <span style={{ fontSize: '1.6rem' }}>{g.icon}</span>
                              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {room.name}
                              </h3>
                            </div>
                            <code style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 900, fontFamily: 'var(--font-mono)',
                              background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                              #{room.id}
                            </code>
                          </div>
                          <span className="badge" style={{ background: `${g.color}20`, color: g.color, border: `1px solid ${g.color}40`, flexShrink: 0 }}>
                            {room.gameType}
                          </span>
                        </div>

                        {/* Players row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ display: 'flex' }}>
                            {room.players.slice(0, 5).map((p, idx) => (
                              <img key={p.id} src={p.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${p.username}`}
                                alt={p.username} title={p.username}
                                style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--bg-base)',
                                  marginLeft: idx > 0 ? -8 : 0, zIndex: room.players.length - idx, objectFit: 'cover' }}
                              />
                            ))}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isFull ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                              👥 {room.players.length} / {room.maxPlayers}
                              {room.aiCount > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>+ {room.aiCount} 🤖</span>}
                            </div>
                            {/* Player bar */}
                            <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, marginTop: 6, overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(room.players.length / room.maxPlayers) * 100}%` }}
                                transition={{ delay: i * 0.06 + 0.3, duration: 0.6 }}
                                style={{ height: '100%', background: isFull ? 'var(--accent-red)' : `${g.color}`, borderRadius: 99 }}
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          className={isFull ? 'btn btn-ghost' : 'btn btn-primary'}
                          style={{ width: '100%', padding: '11px', fontSize: '0.9rem', borderRadius: 14,
                            ...(isFull ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                          onClick={() => !isFull && handleJoin(room.id)}
                          disabled={isFull}
                        >
                          {isFull ? (t('lobby.full') || '🚫 Phòng Đầy') : `${t('lobby.joinBtn')} →`}
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ─── Sidebar ─── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <ChatBox roomId="global" />

            {/* Online Players */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              className="hud-panel"
              style={{ borderRadius: 24 }}
            >
              <div className="hud-panel-header">
                <span className="online-dot" /> {t('lobby.onlinePlayers')}
                <span className="badge badge-green" style={{ marginLeft: 'auto', fontSize: '0.72rem' }}>{onlineUsers.length}</span>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {onlineUsers.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                    {t('lobby.onlyYouOnline') || 'Chỉ có bạn đang online'}
                  </p>
                ) : onlineUsers.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 12,
                      background: u.id === user?.id ? 'rgba(139,92,246,0.08)' : 'transparent',
                      border: u.id === user?.id ? '1px solid rgba(139,92,246,0.15)' : '1px solid transparent' }}
                  >
                    <div style={{ position: 'relative' }}>
                      <img src={u.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=${u.username}`}
                        alt={u.username}
                        style={{ width: 34, height: 34, borderRadius: '50%', border: `2px solid ${u.id === user?.id ? 'var(--accent-primary-light)' : 'var(--border)'}` }}
                      />
                      <span className="online-dot" style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, border: '1.5px solid var(--bg-base)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</div>
                      {u.id === user?.id && <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary-light)', fontWeight: 800 }}>YOU</div>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </aside>
        </div>
      </div>

      {/* ─── Create Room Modal ─── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="modal-overlay" onClick={() => setShowCreate(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" onClick={e => e.stopPropagation()}
              initial={{ scale: 0.88, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.88, y: 40, opacity: 0 }}
              style={{ maxWidth: 600, padding: 48 }}
            >
              <h2 className="display-font" style={{ marginBottom: 8, fontSize: '2rem' }}>✨ {t('lobby.createRoom')}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 36, fontSize: '0.95rem' }}>{t('lobby.roomConfig')}</p>

              <form onSubmit={handleCreate}>
                <div className="form-group" style={{ marginBottom: 28 }}>
                  <label>📝 {t('lobby.roomName') || 'Tên phòng'}</label>
                  <input className="input" placeholder={t('lobby.defaultRoomName', { username: user.username })}
                    value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    maxLength={100} style={{ borderRadius: 14 }} />
                </div>

                <div className="form-group" style={{ marginBottom: 28 }}>
                  <label>🎮 {t('lobby.gameSelection')}</label>
                  <div className="game-select-grid">
                    {GAME_TYPES.map(g => (
                      <div key={g.type}
                        onClick={() => setCreateForm({ ...createForm, gameType: g.type, maxPlayers: g.defaultMax })}
                        className={`game-card-select ${createForm.gameType === g.type ? 'active' : ''}`}
                        style={{ padding: '18px 10px', height: 100 }}
                      >
                        <span style={{ fontSize: '1.8rem' }}>{g.icon}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{g.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>👥 {t('lobby.maxPlayers')}</label>
                    <select className="input" value={createForm.maxPlayers} style={{ borderRadius: 14 }}
                      onChange={e => setCreateForm(f => ({ ...f, maxPlayers: e.target.value }))}>
                      {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>🤖 {t('lobby.aiBots')}</label>
                    <select className="input" value={createForm.aiCount} style={{ borderRadius: 14 }}
                      onChange={e => setCreateForm(f => ({ ...f, aiCount: e.target.value }))}>
                      {[0,1,2,3,4,5].filter(n => n < createForm.maxPlayers).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                {createForm.gameType === 'MONOPOLY' && (
                  <div className="form-group" style={{ marginBottom: 28 }}>
                    <label>🌍 {t('lobby.boardVersion') || 'Phiên bản bản đồ'}</label>
                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                      {[{ type: 'VIETNAM', icon: '🇻🇳', name: 'Việt Nam' }, { type: 'WORLD', icon: '🌎', name: 'Thế Giới' }].map(b => (
                        <div key={b.type} onClick={() => setCreateForm({ ...createForm, boardType: b.type })}
                          className={`game-card-select ${createForm.boardType === b.type ? 'active' : ''}`}
                          style={{ flex: 1, padding: 16, flexDirection: 'row', gap: 10 }}>
                          <span style={{ fontSize: '1.4rem' }}>{b.icon}</span>
                          <span style={{ fontWeight: 800 }}>{b.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 14 }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: '14px' }} onClick={() => setShowCreate(false)}>
                    {t('lobby.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '14px', fontSize: '1rem' }} disabled={creating}>
                    {creating ? '⏳ Creating...' : `✨ ${t('lobby.createBtn')}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Matchmaking overlay ─── */}
      <AnimatePresence>
        {isMatchmaking && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 10000 }}>
            <motion.div className="hud-panel"
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              style={{ padding: 48, width: '100%', maxWidth: 420, textAlign: 'center', background: 'rgba(6,8,16,0.95)' }}
            >
              {/* Radar */}
              <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {[1, 1.4, 1.8].map((scale, i) => (
                  <div key={i} style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: `2px solid var(--accent-${i === 0 ? 'cyan' : i === 1 ? 'primary-light' : 'pink'})`,
                    animation: 'pulse-radar 2s linear infinite',
                    animationDelay: `${i * 0.6}s`, opacity: 0.5 - i * 0.1,
                  }} />
                ))}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  style={{ position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'conic-gradient(from 0deg, transparent 70%, rgba(139,92,246,0.4) 100%)', }}
                />
                <span style={{ fontSize: '3rem', zIndex: 2 }}>⚔️</span>
              </div>

              <h2 className="display-font text-shimmer-glow" style={{ fontSize: '1.8rem', marginBottom: 10 }}>
                {t('lobby.searchingMatch') || 'Đang Tìm Trận Đấu'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '0.9rem', lineHeight: 1.7 }}>
                {t('lobby.searchingDesc') || 'Đang tìm kiếm đối thủ xứng tầm trong vùng đất BoardRealm...'}
              </p>
              <button onClick={cancelMatchmaking} className="btn btn-danger" style={{ width: '100%', padding: '14px' }}>
                ✕ {t('lobby.cancelMatchmaking') || 'Hủy tìm trận'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse-radar {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
