import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/* ─── Floating particle canvas ─── */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      o: Math.random() * 0.5 + 0.1,
      color: ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b'][Math.floor(Math.random() * 4)],
    }));

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.o;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

const GAMES = [
  {
    id: 'coup',
    name: 'Coup',
    tag: 'Bluff & Strategy',
    players: '2–6 players',
    duration: '15–30 min',
    icon: '🃏',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #4c1d95 60%, #7c3aed 100%)',
    glow: 'rgba(124,58,237,0.6)',
    accentColor: '#a855f7',
    available: true,
    path: '/lobby',
    desc: 'Master deception & political intrigue. Eliminate rivals, claim the throne.'
  },
  {
    id: 'kittens',
    name: 'Exploding Kittens',
    tag: 'Luck & Chaos',
    players: '2–5 players',
    duration: '15 min',
    icon: '💥',
    gradient: 'linear-gradient(135deg, #1a0a00 0%, #7c2d00 60%, #c2410c 100%)',
    glow: 'rgba(194,65,12,0.6)',
    accentColor: '#f97316',
    available: true,
    desc: 'Draw cards, avoid explosions, and use special powers to survive chaos.'
  },
  {
    id: 'uno',
    name: 'Uno',
    tag: 'Card Game',
    players: '2–10 players',
    duration: '15–30 min',
    icon: '🌈',
    gradient: 'linear-gradient(135deg, #012a16 0%, #065f46 60%, #10b981 100%)',
    glow: 'rgba(16,185,129,0.6)',
    accentColor: '#34d399',
    available: true,
    desc: 'Match colors and numbers, unleash action cards, shout UNO to win!'
  },
  {
    id: 'monopoly',
    name: 'Monopoly',
    tag: 'Strategy & Trading',
    players: '2–6 players',
    duration: '60–180 min',
    icon: '🏦',
    gradient: 'linear-gradient(135deg, #0a1a2d 0%, #1e3a5f 60%, #2563eb 100%)',
    glow: 'rgba(37,99,235,0.6)',
    accentColor: '#60a5fa',
    available: true,
    desc: 'Buy properties, build empires, bankrupt opponents in the ultimate wealth war.'
  },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handlePlay = (game) => {
    if (!user) { toast(t('nav.login'), { icon: '🔒' }); navigate('/login'); return; }
    navigate('/lobby');
  };

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden' }}
      onMouseMove={e => { mouseX.set(e.clientX); mouseY.set(e.clientY); }}>
      <ParticleCanvas />

      {/* Ambient blobs */}
      <motion.div style={{ x: springX, y: springY }}
        animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="ambient-blob"
        sx={{ position: 'absolute', top: '-20%', left: '-15%', width: '55vw', height: '55vw',
          background: 'var(--accent-primary)', filter: 'blur(140px)', opacity: 0.12,
          borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }}
      />
      <div style={{ position: 'absolute', top: '-20%', left: '-15%', width: '55vw', height: '55vw',
        background: 'var(--accent-primary)', filter: 'blur(140px)', opacity: 0.12,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '45vw', height: '45vw',
        background: 'var(--accent-cyan)', filter: 'blur(140px)', opacity: 0.08,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '30%', right: '20%', width: '25vw', height: '25vw',
        background: 'var(--accent-pink)', filter: 'blur(120px)', opacity: 0.06,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      <Navbar />

      {/* ─── Hero ─── */}
      <section style={{ padding: '110px 0 70px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ marginBottom: 28, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}
          >
            <span className="badge badge-cyan" style={{ fontSize: '0.8rem', padding: '6px 16px', letterSpacing: '1.5px' }}>
              🎮 MULTIPLAYER ONLINE
            </span>
            <span className="badge badge-purple" style={{ fontSize: '0.8rem', padding: '6px 16px', letterSpacing: '1.5px' }}>
              ⚡ REAL-TIME PvP
            </span>
          </motion.div>

          <motion.h1
            className="display-font text-shimmer-glow"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4, delay: 0.2 }}
            style={{ fontSize: 'clamp(3.5rem, 8vw, 7rem)', marginBottom: 28, lineHeight: 1.05, letterSpacing: '-0.04em' }}
          >
            {t('home.title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.7, fontWeight: 400 }}
          >
            {t('home.subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <motion.button
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
              onClick={() => handlePlay(GAMES[0])}
              className="btn btn-primary"
              style={{ fontSize: '1.05rem', padding: '16px 40px', borderRadius: 99 }}
            >
              🃏 {t('home.playNow')}
            </motion.button>
            {!user && (
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
                <Link to="/register" className="btn btn-ghost"
                  style={{ fontSize: '1.05rem', padding: '16px 40px', borderRadius: 99 }}>
                  {t('nav.register')} →
                </Link>
              </motion.div>
            )}
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 64, flexWrap: 'wrap' }}
          >
            {[
              { label: 'Games Available', value: '4', icon: '🎲' },
              { label: 'AI Opponents', value: '∞', icon: '🤖' },
              { label: 'Play Modes', value: '3', icon: '⚡' },
            ].map((stat, i) => (
              <motion.div key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 4 }}>{stat.icon}</div>
                <div className="display-font" style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-primary-light)', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: 4 }}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border), var(--accent-primary), var(--border), transparent)', margin: '0 40px', position: 'relative', zIndex: 1 }} />

      {/* ─── Game Cards ─── */}
      <section style={{ padding: '80px 0 100px', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: 60 }}
          >
            <span className="badge badge-purple" style={{ marginBottom: 16, fontSize: '0.75rem', letterSpacing: '2px' }}>
              CHOOSE YOUR GAME
            </span>
            <h2 className="display-font" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginTop: 12 }}>
              {t('home.games')}
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 28 }}>
            {GAMES.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 40, scale: 0.92 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 100, damping: 18 }}
                whileHover={{ y: -10, scale: 1.02 }}
                onClick={() => handlePlay(game)}
                style={{
                  borderRadius: 28,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                  transition: 'all 0.35s cubic-bezier(0.25,0.8,0.25,1)',
                }}
              >
                {/* Card Header */}
                <div style={{
                  background: game.gradient,
                  padding: '36px 28px 28px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Glow effect */}
                  <div style={{ position: 'absolute', bottom: -40, right: -20, width: 120, height: 120,
                    background: game.accentColor, filter: 'blur(40px)', opacity: 0.5, borderRadius: '50%' }} />
                  {/* Grid lines overlay */}
                  <div style={{ position: 'absolute', inset: 0, backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                    backgroundSize: '24px 24px', opacity: 0.5 }} />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <motion.span
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
                      style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.3))', lineHeight: 1 }}
                    >
                      {game.icon}
                    </motion.span>
                    <div>
                      <h3 className="display-font" style={{ fontSize: '1.6rem', color: 'white', fontWeight: 900, lineHeight: 1.1, marginBottom: 8 }}>
                        {game.name}
                      </h3>
                      <span style={{ display: 'inline-block', background: 'rgba(0,0,0,0.35)', color: 'rgba(255,255,255,0.9)',
                        borderRadius: 99, padding: '3px 12px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
                        border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                        {game.tag}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '24px 28px 28px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.7 }}>
                    {game.desc}
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                    <span className="badge badge-gold" style={{ fontSize: '0.73rem' }}>👥 {game.players}</span>
                    <span className="badge badge-blue" style={{ fontSize: '0.73rem' }}>⏱ {game.duration}</span>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', padding: '13px', borderRadius: 14 }}
                    onClick={e => { e.stopPropagation(); handlePlay(game); }}>
                    {t('home.playNow')} →
                  </button>
                </div>

                {/* Bottom accent line */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, ${game.accentColor}, transparent)`, opacity: 0.6 }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Feature Highlights ─── */}
      <section style={{ padding: '0 0 100px', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { icon: '🤖', title: 'AI Opponents', desc: 'Play solo against intelligent bots', color: 'var(--accent-cyan)' },
              { icon: '⚔️', title: 'PvP Matchmaking', desc: 'Auto-match with global players', color: 'var(--accent-purple)' },
              { icon: '🌐', title: 'Real-Time Play', desc: 'WebSocket powered instant sync', color: 'var(--accent-blue)' },
              { icon: '🏆', title: 'ELO Leaderboard', desc: 'Compete & climb the rankings', color: 'var(--accent-gold)' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                className="glass-premium"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                style={{ padding: '32px 24px', borderRadius: 24, textAlign: 'center', cursor: 'default' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: 16, filter: `drop-shadow(0 0 12px ${f.color})` }}>{f.icon}</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8, color: f.color }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '32px 0',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="container">
          <span className="display-font" style={{ fontWeight: 900, background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginRight: 8, fontSize: '1rem' }}>
            ♟ BoardRealm
          </span>
          © 2026 · All rights reserved
        </div>
      </footer>
    </div>
  );
}
