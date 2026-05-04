import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Lobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', maxPlayers: 4, aiCount: 0 });
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
        aiCount: parseInt(createForm.aiCount)
      });
      toast.success('Phòng đã được tạo!');
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
        aiCount: 3
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
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: 4 }}>🎮 Lobby — Coup</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Tạo phòng hoặc tham gia phòng đang chờ</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={handleQuickPlay} className="btn btn-green" disabled={creating}>
              ⚡ Quick Play (vs AI)
            </button>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              ＋ Tạo phòng
            </button>
          </div>
        </div>

        {/* Join by code */}
        <div className="card" style={{ padding: 20, marginBottom: 32 }}>
          <form onSubmit={handleJoinByCode} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
              🔑 Vào phòng bằng mã:
            </span>
            <input className="input"
              placeholder="Nhập mã 6 ký tự (vd: XKQM2A)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ width: 200, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}
            />
            <button type="submit" className="btn btn-blue" disabled={joinCode.length !== 6}>
              Tham gia →
            </button>
          </form>
        </div>

        {/* Room list */}
        <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>
          Phòng đang mở
          <span className="badge badge-green" style={{ marginLeft: 10, fontSize: '0.75rem' }}>
            {rooms.length} phòng
          </span>
        </h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎭</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Chưa có phòng nào — hãy tạo phòng đầu tiên!
            </p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              Tạo phòng ngay
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {rooms.map(room => (
              <div key={room.id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{room.name}</h3>
                    <code style={{
                      fontSize: '0.75rem', color: 'var(--accent-gold)',
                      background: 'rgba(245,200,66,0.1)', padding: '2px 8px', borderRadius: 4
                    }}>
                      {room.id}
                    </code>
                  </div>
                  <span className="badge badge-gold">{room.gameType}</span>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    👥 {room.players.length}/{room.maxPlayers}
                  </span>
                  {room.aiCount > 0 && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      🤖 {room.aiCount} AI
                    </span>
                  )}
                </div>

                {/* Player avatars */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {room.players.map(p => (
                    <img key={p.id} src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`}
                      alt={p.username} title={p.username}
                      style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)' }}
                    />
                  ))}
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => handleJoin(room.id)}
                  disabled={room.players.length >= room.maxPlayers - room.aiCount}
                >
                  {room.players.length >= room.maxPlayers - room.aiCount ? 'Phòng đầy' : 'Vào phòng →'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 8, fontSize: '1.5rem' }}>Tạo phòng mới</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
              Tạo phòng và chia sẻ mã với bạn bè
            </p>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Tên phòng</label>
                <input className="input"
                  placeholder={`${user.username}'s Room`}
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  maxLength={100}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Số người chơi tối đa</label>
                  <select className="input"
                    value={createForm.maxPlayers}
                    onChange={e => setCreateForm(f => ({ ...f, maxPlayers: e.target.value }))}>
                    {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} người</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Số AI bot</label>
                  <select className="input"
                    value={createForm.aiCount}
                    onChange={e => setCreateForm(f => ({ ...f, aiCount: e.target.value }))}>
                    {[0,1,2,3,4,5].filter(n => n < createForm.maxPlayers).map(n =>
                      <option key={n} value={n}>{n === 0 ? 'Không có AI' : `${n} AI`}</option>
                    )}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost"
                  style={{ flex: 1 }} onClick={() => setShowCreate(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary"
                  style={{ flex: 2 }} disabled={creating}>
                  {creating ? 'Đang tạo...' : 'Tạo phòng ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
