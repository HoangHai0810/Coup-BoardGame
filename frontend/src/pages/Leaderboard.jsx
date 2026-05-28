import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';

const GAME_TYPES = [
  { id: 'COUP', name: 'Coup', icon: '🃏', color: '#8e44ad' },
  { id: 'KITTENS', name: 'Mèo Nổ', icon: '🙀', color: '#f39c12' },
  { id: 'UNO', name: 'Uno', icon: '🌈', color: '#2980b9' },
  { id: 'MONOPOLY', name: 'Cờ Tỉ Phú', icon: '🎩', color: '#27ae60' }
];

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('COUP');
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/leaderboard/${activeTab}`);
        setLeaders(res.data);
      } catch (err) {
        toast.error("Không thể tải bảng xếp hạng");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [activeTab]);

  return (
    <div className="page" style={{ background: 'var(--bg-base)' }}>
      <Navbar />
      <div className="container" style={{ padding: '40px 24px', flex: 1, maxWidth: 900, margin: '0 auto' }}>
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="display-font" style={{ fontSize: '3rem', textAlign: 'center', marginBottom: 40, color: 'var(--text-primary)' }}>
            🏆 Bảng Xếp Hạng
          </h1>
        </motion.div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 40, overflowX: 'auto', paddingBottom: 8, justifyContent: 'center' }}>
          {GAME_TYPES.map(game => (
            <button
              key={game.id}
              onClick={() => setActiveTab(game.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '16px 28px',
                borderRadius: 24, fontSize: '1.1rem', fontWeight: 800,
                background: activeTab === game.id ? game.color : 'rgba(255,255,255,0.05)',
                color: activeTab === game.id ? '#fff' : 'var(--text-secondary)',
                border: `2px solid ${activeTab === game.id ? game.color : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{game.icon}</span>
              {game.name}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass" style={{ borderRadius: 32, padding: 32, minHeight: 400 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <div className="spinner" style={{ width: 60, height: 60 }}></div>
            </div>
          ) : leaders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>😴</div>
              <h3 style={{ fontSize: '1.4rem' }}>Chưa có ai chơi trò này cả!</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnimatePresence>
                {leaders.map((user, idx) => {
                  let rankIcon = `#${idx + 1}`;
                  let rowBg = 'rgba(255,255,255,0.03)';
                  let rankColor = 'var(--text-secondary)';
                  if (idx === 0) { rankIcon = '🥇'; rowBg = 'rgba(241, 196, 15, 0.15)'; rankColor = '#f1c40f'; }
                  else if (idx === 1) { rankIcon = '🥈'; rowBg = 'rgba(189, 195, 199, 0.1)'; rankColor = '#bdc3c7'; }
                  else if (idx === 2) { rankIcon = '🥉'; rowBg = 'rgba(211, 84, 0, 0.1)'; rankColor = '#d35400'; }

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '16px 24px',
                        borderRadius: 20, background: rowBg, gap: 24
                      }}
                    >
                      <div style={{ width: 50, fontSize: '1.5rem', fontWeight: 900, color: rankColor, textAlign: 'center' }}>
                        {rankIcon}
                      </div>
                      
                      <img src={user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
                           alt={user.username} 
                           style={{ width: 56, height: 56, borderRadius: '50%', border: `2px solid ${rankColor}` }} />
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{user.username}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Đã chơi: {user.totalMatches} • Thắng: {user.totalWins}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>Elo</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-gold)' }}>
                          {user.elo}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
