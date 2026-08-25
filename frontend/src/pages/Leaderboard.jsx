import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';

const GAME_TYPES = [
  { id: 'COUP', name: 'Coup', icon: '🃏', color: 'var(--accent-purple)', glow: 'rgba(168,85,247,0.4)' },
  { id: 'KITTENS', name: 'Mèo Nổ', icon: '🙀', color: 'var(--accent-gold)', glow: 'rgba(245,158,11,0.4)' },
  { id: 'UNO', name: 'Uno', icon: '🌈', color: 'var(--accent-blue)', glow: 'rgba(59,130,246,0.4)' },
  { id: 'MONOPOLY', name: 'Cờ Tỉ Phú', icon: '🎩', color: 'var(--accent-green)', glow: 'rgba(16,185,129,0.4)' }
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
      } catch {
        toast.error("Không thể tải bảng xếp hạng");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [activeTab]);

  const activeGame = GAME_TYPES.find(g => g.id === activeTab);

  // Separate top 3 for podium
  const topThree = leaders.slice(0, 3);
  const remainingLeaders = leaders.slice(3);

  // Map top 3 positions for display (Rank 2, Rank 1, Rank 3)
  const podiumOrder = [];
  if (topThree[1]) podiumOrder.push({ player: topThree[1], rank: 2, height: 160, medal: '🥈', color: '#bdc3c7', delay: 0.1 });
  if (topThree[0]) podiumOrder.push({ player: topThree[0], rank: 1, height: 200, medal: '🥇', color: '#fbbf24', delay: 0, glow: true });
  if (topThree[2]) podiumOrder.push({ player: topThree[2], rank: 3, height: 130, medal: '🥉', color: '#d35400', delay: 0.2 });

  return (
    <div className="page" style={{ background: 'var(--bg-base)', position: 'relative', overflowX: 'hidden' }}>
      {/* Background gradients */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: activeGame?.color, opacity: 0.05, filter: 'blur(120px)', borderRadius: '50%', pointerEvents: 'none', transition: 'all 0.5s ease' }} />

      <Navbar />
      <div className="container" style={{ padding: '40px 24px', flex: 1, maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        
        <motion.div 
          initial={{ y: -30, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <h1 className="display-font text-shimmer-glow" style={{ fontSize: '3.5rem', marginBottom: 12 }}>
            🏆 Bảng Xếp Hạng
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1.1rem' }}>Những nhà vô địch hàng đầu của BoardRealm</p>
        </motion.div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, overflowX: 'auto', paddingBottom: 8, justifyContent: 'center' }}>
          {GAME_TYPES.map(game => (
            <motion.button
              key={game.id}
              whileHover={{ scale: 1.05, y: -2 }}
              whileActive={{ scale: 0.95 }}
              onClick={() => setActiveTab(game.id)}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: 10, 
                padding: '14px 24px',
                borderRadius: 24, 
                fontSize: '1.05rem', 
                fontWeight: 900,
                background: activeTab === game.id ? game.color : 'var(--bg-glass)',
                color: activeTab === game.id ? '#ffffff' : 'var(--text-secondary)',
                border: activeTab === game.id ? `2px solid ${game.color}` : '1px solid var(--border)',
                cursor: 'pointer', 
                transition: 'background 0.3s, color 0.3s', 
                whiteSpace: 'nowrap',
                boxShadow: activeTab === game.id ? `0 0 20px ${game.glow}` : 'none'
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>{game.icon}</span>
              {game.name}
            </motion.button>
          ))}
        </div>

        {/* Main Area */}
        <div className="glass" style={{ borderRadius: 32, padding: '32px 24px', minHeight: 450, position: 'relative', overflow: 'hidden' }}>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ width: 50, height: 50, border: '4px solid rgba(139,92,246,0.1)', borderTopColor: activeGame?.color, borderRadius: '50%' }}
              />
            </div>
          ) : leaders.length === 0 ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}
            >
              <div style={{ fontSize: '5rem', marginBottom: 20, animation: 'float 3s ease-in-out infinite' }}>😴</div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', fontWeight: 850 }}>Chưa có chiến binh nào ghi danh!</h3>
              <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>Hãy bắt đầu một trận đấu và trở thành người đầu tiên.</p>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              
              {/* Podium for Top 3 */}
              {topThree.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16, padding: '24px 0 16px 0', borderBottom: '1px solid var(--border)', minHeight: 280 }}>
                  <AnimatePresence>
                    {/* Render Rank 2, then Rank 1, then Rank 3 */}
                    {podiumOrder.map(({ player, rank, height, medal, delay, glow }) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 80, delay }}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          width: '100%',
                          maxWidth: 180
                        }}
                      >
                        {/* Avatar section */}
                        <div style={{ position: 'relative', marginBottom: 12 }}>
                          <motion.div
                            animate={glow ? { scale: [1, 1.05, 1], filter: ['drop-shadow(0 0 8px rgba(251,191,36,0.3))', 'drop-shadow(0 0 20px rgba(251,191,36,0.6))', 'drop-shadow(0 0 8px rgba(251,191,36,0.3))'] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                            style={{ 
                              width: rank === 1 ? 84 : 70, 
                              height: rank === 1 ? 84 : 70, 
                              borderRadius: '50%',
                              padding: 3,
                              background: glow ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'rgba(255,255,255,0.1)',
                              boxShadow: glow ? '0 10px 25px rgba(245,158,11,0.3)' : 'none'
                            }}
                          >
                            <img 
                              src={player.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${player.username}`} 
                              alt={player.username}
                              style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-surface)' }}
                            />
                          </motion.div>
                          <div style={{ 
                            position: 'absolute', 
                            bottom: -6, 
                            left: '50%', 
                            transform: 'translateX(-50%)', 
                            fontSize: rank === 1 ? '1.5rem' : '1.25rem',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' 
                          }}>
                            {medal}
                          </div>
                        </div>

                        {/* Name and ELO */}
                        <div style={{ textAlign: 'center', marginBottom: 10, width: '100%' }}>
                          <div style={{ fontWeight: 900, fontSize: rank === 1 ? '1.15rem' : '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {player.username}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2, fontWeight: 700 }}>
                            Thắng {player.totalWins}/{player.totalMatches}
                          </div>
                        </div>

                        {/* Pillar block */}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height }}
                          transition={{ type: 'spring', stiffness: 50, delay: delay + 0.2 }}
                          style={{
                            width: '100%',
                            background: glow 
                              ? 'linear-gradient(180deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.02) 100%)' 
                              : 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
                            border: `1px solid ${glow ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '16px 16px 8px 8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            boxShadow: glow ? '0 10px 30px rgba(245,158,11,0.05), inset 0 0 15px rgba(245,158,11,0.1)' : 'inset 0 0 15px rgba(255,255,255,0.01)',
                            padding: 12
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: glow ? 'var(--accent-gold)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Elo</span>
                          <span style={{ fontSize: rank === 1 ? '1.8rem' : '1.5rem', fontWeight: 900, color: glow ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{player.elo}</span>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Ranks 4 and below list */}
              {remainingLeaders.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <AnimatePresence>
                    {remainingLeaders.map((player, idx) => {
                      const absoluteRank = idx + 4;
                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ type: 'spring', stiffness: 100, delay: idx * 0.05 }}
                          whileHover={{ x: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                          style={{
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '14px 20px',
                            borderRadius: 20, 
                            background: 'rgba(255,255,255,0.01)', 
                            border: '1px solid var(--border)',
                            gap: 20,
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ width: 40, fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-muted)', textAlign: 'center' }}>
                            #{absoluteRank}
                          </div>
                          
                          <img 
                            src={player.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${player.username}`}
                            alt={player.username} 
                            style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--border)' }} 
                          />
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {player.username}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2, fontWeight: 700 }}>
                              Tỷ lệ thắng: {Math.round((player.totalWins / (player.totalMatches || 1)) * 100)}% • Đã chơi: {player.totalMatches}
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>Elo</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: activeGame?.color }}>
                              {player.elo}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
