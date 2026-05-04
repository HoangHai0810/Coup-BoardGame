import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const GAMES = [
    {
      id: 'coup',
      name: 'Coup',
      tag: 'Bluff & Strategy',
      players: '2–6 players',
      duration: '15–30 min',
      description: t('home.heroDesc'),
      gradient: 'linear-gradient(135deg, #1e1f3a 0%, #4a2882 100%)',
      accentColor: '#9b5de5',
      icon: '🃏',
      available: true,
      path: '/lobby'
    },
    {
      id: 'exploding-kittens',
      name: 'Exploding Kittens',
      tag: 'Luck & Chaos',
      players: '2–5 players',
      duration: '15 min',
      description: 'Tránh những chú mèo phát nổ — dùng thẻ đặc biệt để sống sót!',
      gradient: 'linear-gradient(135deg, #2d1a0a 0%, #7a4020 100%)',
      accentColor: '#f5a642',
      icon: '💥',
      available: false
    },
    {
      id: 'uno',
      name: 'Uno',
      tag: 'Card Game',
      players: '2–10 players',
      duration: '15–30 min',
      description: 'Đặt hết bài trước người khác. Đừng quên hô UNO!',
      gradient: 'linear-gradient(135deg, #0a2d1a 0%, #1a6e3d 100%)',
      accentColor: '#3ec97d',
      icon: '🎴',
      available: false
    },
    {
      id: 'monopoly',
      name: 'Monopoly',
      tag: 'Strategy & Trading',
      players: '2–6 players',
      duration: '60–180 min',
      description: 'Mua đất, xây nhà, phá sản đối thủ. Kẻ thống trị bất động sản thắng!',
      gradient: 'linear-gradient(135deg, #0a1a2d 0%, #1a3d6e 100%)',
      accentColor: '#4a90e2',
      icon: '🏦',
      available: false
    }
  ];

  const handlePlayCoup = () => {
    if (!user) {
      toast(t('nav.login'), { icon: '🔒' });
      navigate('/login');
    } else {
      navigate('/lobby');
    }
  };

  return (
    <div className="page">
      <Navbar />

      {/* Hero */}
      <section style={{
        padding: '80px 0 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ position: 'relative' }}>
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="badge badge-gold" style={{ marginBottom: 20, fontSize: '0.8rem' }}
          >
            🎮 Multiplayer Online Board Games
          </motion.div>

          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="display-font" style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            marginBottom: 24,
            color: 'var(--accent-primary)',
            lineHeight: 1.1
          }}>
            {t('home.title')}
          </motion.h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'var(--text-secondary)',
            maxWidth: 560,
            margin: '0 auto 40px'
          }}>
            {t('home.subtitle')}
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayCoup} className="btn btn-primary" style={{ fontSize: '1rem', padding: '14px 32px' }}
            >
              🃏 {t('home.playNow')}
            </motion.button>
            {!user && (
              <Link to="/register" className="btn btn-ghost" style={{ fontSize: '1rem', padding: '14px 32px' }}>
                {t('nav.register')}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Game Cards */}
      <section style={{ padding: '0 0 80px' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: 40, fontSize: '2rem' }}>
            {t('home.games')}
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24
          }}>
            {GAMES.map((game, index) => (
              <motion.div 
                key={game.id} 
                className="card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                style={{
                  overflow: 'hidden',
                  cursor: game.available ? 'pointer' : 'default',
                  position: 'relative'
                }}
                onClick={() => game.available && handlePlayCoup()}
              >
                {/* Card header */}
                <div style={{
                  background: game.gradient,
                  padding: '28px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16
                }}>
                  <span style={{ fontSize: '3rem' }}>{game.icon}</span>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'white' }}>
                      {game.name}
                    </h3>
                    <div className="badge" style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: 'none',
                      fontSize: '0.7rem', marginTop: 6
                    }}>
                      {game.tag}
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '20px 24px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16, lineHeight: 1.6 }}>
                    {game.description}
                  </p>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                    <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>👥 {game.players}</span>
                    <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>⏱ {game.duration}</span>
                  </div>

                  {game.available ? (
                    <button className="btn btn-primary" style={{ width: '100%' }}
                      onClick={(e) => { e.stopPropagation(); handlePlayCoup(); }}>
                      {t('home.playNow')} →
                    </button>
                  ) : (
                    <div style={{
                      padding: '10px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      background: '#f4f6f8',
                      borderRadius: 12,
                      border: '2px dashed var(--border)'
                    }}>
                      🚧 Coming soon
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '3px solid var(--border)',
        padding: '24px 0',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <div className="container">
          <span className="display-font" style={{ color: 'var(--accent-primary)', marginRight: 8, fontWeight: 900 }}>♟ BoardRealm</span>
          — 2026
        </div>
      </footer>
    </div>
  );
}
