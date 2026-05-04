import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const GAMES = [
  {
    id: 'coup',
    name: 'Coup',
    tag: 'Bluff & Strategy',
    players: '2–6 players',
    duration: '15–30 min',
    description: 'Lừa dối và loại bỏ đối thủ. Ai còn bài cuối cùng sẽ chiến thắng!',
    gradient: 'linear-gradient(135deg, #1e1f3a 0%, #4a2882 100%)',
    accentColor: '#9b5de5',
    icon: '🃏',
    available: true,
    path: '/lobby'
  },
  {
    id: 'exploding-kittens',
    name: 'Mèo Nổ',
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
    name: 'Cờ Tỉ Phú',
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

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePlayCoup = () => {
    if (!user) {
      toast('Bạn cần đăng nhập để chơi!', { icon: '🔒' });
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
        {/* Background orbs */}
        <div style={{
          position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(ellipse, rgba(155,93,229,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div className="container" style={{ position: 'relative' }}>
          <div className="badge badge-gold" style={{ marginBottom: 20, fontSize: '0.8rem' }}>
            🎮 Multiplayer Online Board Games
          </div>

          <h1 className="display-font" style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            marginBottom: 24,
            background: 'linear-gradient(135deg, #f0f0f8, #f5c842)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.1
          }}>
            BoardRealm
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'var(--text-secondary)',
            maxWidth: 560,
            margin: '0 auto 40px'
          }}>
            Chơi board game cùng bạn bè trực tuyến. Bluff, chiến lược, và đánh bại đối thủ ngay trong trình duyệt.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handlePlayCoup} className="btn btn-primary" style={{ fontSize: '1rem', padding: '14px 32px' }}>
              🃏 Chơi Coup Ngay
            </button>
            {!user && (
              <Link to="/register" className="btn btn-ghost" style={{ fontSize: '1rem', padding: '14px 32px' }}>
                Đăng ký miễn phí
              </Link>
            )}
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', gap: 40, justifyContent: 'center', marginTop: 60,
            flexWrap: 'wrap'
          }}>
            {[
              { value: '4', label: 'Games (sắp ra)' },
              { value: '2–6', label: 'Người chơi / phòng' },
              { value: '100%', label: 'Miễn phí' }
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-gold)' }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Game Cards */}
      <section style={{ padding: '0 0 80px' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.8rem' }}>
            Các Game
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 40 }}>
            Bắt đầu với Coup — các game khác sắp ra mắt!
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24
          }}>
            {GAMES.map(game => (
              <div key={game.id} className="card" style={{
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
                  borderBottom: `1px solid ${game.accentColor}33`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16
                }}>
                  <span style={{ fontSize: '2.5rem' }}>{game.icon}</span>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'white' }}>
                      {game.name}
                    </h3>
                    <div className="badge" style={{
                      background: `${game.accentColor}22`,
                      color: game.accentColor,
                      border: `1px solid ${game.accentColor}44`,
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
                      Chơi Ngay →
                    </button>
                  ) : (
                    <div style={{
                      padding: '10px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 8,
                      border: '1px dashed var(--border)'
                    }}>
                      🚧 Sắp ra mắt
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to play Coup */}
      <section style={{
        padding: '60px 0 80px',
        borderTop: '1px solid var(--border)'
      }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.8rem' }}>
            Cách chơi <span className="text-gold">Coup</span>
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 48 }}>
            Học trong 5 phút, chơi hàng giờ!
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, marginBottom: 40 }}>
            {[
              { icon: '🎭', title: '5 Nhân vật', desc: 'Duke, Assassin, Captain, Ambassador, Contessa — mỗi nhân vật có sức mạnh riêng.' },
              { icon: '💰', title: '2 Đồng xu', desc: 'Bắt đầu với 2 xu. Thu tiền, đánh thuế, hoặc ăn cắp để tích lũy.' },
              { icon: '🃏', title: '2 Lá bài', desc: 'Giữ bí mật 2 lá bài. Mất hết 2 lá = bị loại khỏi game.' },
              { icon: '🎯', title: 'Bluff!', desc: 'Có thể nhận làm bất kỳ nhân vật nào. Nhưng nếu bị thách thức và nói dối, bạn mất bài!' }
            ].map(rule => (
              <div key={rule.title} className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{rule.icon}</div>
                <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{rule.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>{rule.desc}</p>
              </div>
            ))}
          </div>

          {/* Characters grid */}
          <h3 style={{ textAlign: 'center', marginBottom: 24, fontSize: '1.3rem' }}>5 Nhân vật trong Coup</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { type: 'duke', name: 'Duke', icon: '👑', action: 'Thu thuế +3 xu', block: 'Chặn Viện trợ' },
              { type: 'assassin', name: 'Assassin', icon: '🗡️', action: 'Ám sát (-3 xu)', block: '—' },
              { type: 'captain', name: 'Captain', icon: '⚓', action: 'Ăn cắp +2 xu', block: 'Chặn ăn cắp' },
              { type: 'ambassador', name: 'Ambassador', icon: '🤝', action: 'Đổi bài', block: 'Chặn ăn cắp' },
              { type: 'contessa', name: 'Contessa', icon: '💎', action: '—', block: 'Chặn ám sát' },
            ].map(c => (
              <div key={c.type} className={`coup-card ${c.type}`} style={{
                width: '100%', height: 'auto', padding: '16px 12px',
                flexDirection: 'column', gap: 8, borderRadius: 12
              }}>
                <span style={{ fontSize: '1.8rem' }}>{c.icon}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'white' }}>{c.name}</span>
                {c.action !== '—' && (
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>⚡ {c.action}</span>
                )}
                {c.block !== '—' && (
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>🛡 {c.block}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 0',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <div className="container">
          <span className="display-font" style={{ color: 'var(--accent-gold)', marginRight: 8 }}>♟ BoardRealm</span>
          — Nền tảng board game trực tuyến
        </div>
      </footer>
    </div>
  );
}
