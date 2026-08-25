import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import TurnTimer from '../components/TurnTimer';
import { playGameSound } from '../services/gameAudio';

const UNO_ASSETS = '/assets/uno_assets_pack_1777970075772.png';
const WILD_IMG = '/assets/uno_wild_card_premium_1778036505397.png';
const DRAW4_IMG = '/assets/uno_wild_draw4_premium_1778036593265.png';
const COLOR_MAP = { RED: '#ef4444', BLUE: '#3b82f6', GREEN: '#10b981', YELLOW: '#eab308', WILD: '#1e293b' };
const COLOR_GLOW_MAP = { 
  RED: 'rgba(239,68,68,0.4)', 
  BLUE: 'rgba(59,130,246,0.4)', 
  GREEN: 'rgba(16,185,129,0.4)', 
  YELLOW: 'rgba(234,179,8,0.4)', 
  WILD: 'rgba(255,255,255,0.1)' 
};

const NUMBER_MAP = {
  'ZERO': '0', 'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 
  'FIVE': '5', 'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9'
};

const getUnoSymbol = (val) => {
  if (val === 'SKIP') return '⊘';
  if (val === 'REVERSE') return '⇄';
  if (val === 'DRAW_2') return '+2';
  if (val === 'WILD_DRAW_4') return '+4';
  if (val === 'WILD') return '🌈';
  if (NUMBER_MAP[val]) return NUMBER_MAP[val];
  return val;
};

export default function UnoPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { subscribe, send, connected } = useSocket();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [choosingColorFor, setChoosingColorFor] = useState(null);
  const logEndRef = useRef(null);
  const soundLogRef = useRef(0);

  useEffect(() => {
    const unsub1 = subscribe(`/topic/game/${roomId}`, data => {
      if (data.gameType === 'UNO') setGameState(data);
    });
    const unsub2 = subscribe(`/topic/game/${roomId}/private/${user?.id}`, data => {
      setMyHand(data.hand || []);
    });
    if (connected) {
      send(`/app/game/${roomId}/connect`, {});
    }
    return () => { unsub1(); unsub2(); };
  }, [roomId, user?.id, subscribe, send, connected]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const length = gameState?.actionLog?.length || 0;
    if (soundLogRef.current && length > soundLogRef.current) playGameSound('card');
    soundLogRef.current = length;
  }, [gameState?.actionLog]);

  if (!gameState) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', gap: 20 }}>
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width: 50, height: 50, border: '4px solid rgba(139,92,246,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}
      />
      <p style={{ color: 'white', fontWeight: 800 }}>{t('game.loadingUno', 'Đang tải UNO...')}</p>
    </div>
  );

  const isMyTurn = gameState.currentPlayerId === user?.id;

  const handlePlayCard = (card) => {
    if (!isMyTurn) return;
    if (card.color === 'WILD') {
      setChoosingColorFor(card.id);
    } else {
      send(`/app/game/${roomId}/uno/play`, { cardId: card.id });
    }
  };

  const selectColor = (color) => {
    send(`/app/game/${roomId}/uno/play`, { cardId: choosingColorFor, color });
    setChoosingColorFor(null);
  };

  const handleDraw = () => {
    if (!isMyTurn) return;
    send(`/app/game/${roomId}/uno/draw`, {});
  };

  // Check card compatibility with active card
  const isCardPlayable = (card) => {
    if (!isMyTurn) return false;
    if (card.color === 'WILD') return true;
    if (card.color === gameState.activeColor) return true;
    if (card.value === gameState.activeValue) return true;
    return false;
  };

  return (
    <div className="page uno-table-page" style={{
      height: '100vh', display: 'flex', flexDirection: 'column', 
      background: 'var(--bg-base)', overflow: 'hidden', position: 'relative' 
    }}>
      <button className="game-back-btn" onClick={() => navigate('/lobby')}><span>←</span> Trở về</button>
      {/* Dynamic ambient color glow from the active pile color */}
      <div 
        style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          width: '500px', 
          height: '500px', 
          background: COLOR_MAP[gameState.activeColor] || 'var(--accent-primary)', 
          opacity: 0.08, 
          filter: 'blur(100px)', 
          borderRadius: '50%', 
          pointerEvents: 'none',
          transition: 'background 0.5s ease' 
        }} 
      />

      <Navbar />

      <div className="uno-table-scene" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 40px', gap: 20, position: 'relative', zIndex: 1, minHeight: 0 }}>
        
        {/* TOP: OPPONENTS */}
        <div className="opponents-row" style={{ display: 'flex', justifyContent: 'center', gap: 24, height: '140px', flexShrink: 0 }}>
          {gameState.players.filter(p => p.id !== user?.id).map((p, i) => {
            const isCurrentTurn = gameState.currentPlayerId === p.id;
            return (
              <motion.div key={p.id} 
                initial={{ y: -30, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`player-seat glass ${isCurrentTurn ? 'active-turn' : ''}`}
                style={{ 
                  width: 140, 
                  padding: 12, 
                  borderRadius: 24, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  border: isCurrentTurn ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
                  background: 'var(--bg-card)', 
                  boxShadow: isCurrentTurn ? 'var(--shadow-glow-gold)' : 'var(--shadow-sm)',
                  position: 'relative'
                }}
              >
                {isCurrentTurn && (
                  <div style={{ position: 'absolute', top: 6, right: 8, fontSize: '0.6rem', color: 'var(--accent-gold)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-gold)', animation: 'pulse-radar 1s infinite' }} />
                    LƯỢT
                  </div>
                )}
                
                <img 
                  src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`} 
                  alt={p.username} 
                  style={{ width: 44, height: 44, borderRadius: '50%', border: isCurrentTurn ? '2px solid var(--accent-gold)' : '2px solid var(--border)', marginBottom: 8 }} 
                />
                
                <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.username}
                </div>
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800, marginTop: 2 }}>
                  🎴 {p.handCount} {t('game.uno.cardsTitle', 'lá')}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* MIDDLE: BOARD & SIDEBARS */}
        <div className="game-grid-layout">
          
          {/* LEFT: MY STATUS */}
          <div className="game-left-col" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <motion.div className={`glass ${isMyTurn ? 'active-turn' : ''}`} 
              style={{ 
                padding: '24px 20px', 
                borderRadius: 32, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                background: 'var(--bg-card)', 
                border: isMyTurn ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                boxShadow: isMyTurn ? 'var(--shadow-glow)' : 'var(--shadow-sm)'
              }}
            >
              <div style={{ position: 'relative' }}>
                <img 
                  src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username}`} 
                  alt={user?.username} 
                  style={{ width: 72, height: 72, borderRadius: '50%', border: isMyTurn ? '3px solid var(--accent-primary)' : '2px solid var(--border)' }} 
                />
                <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--accent-gold)', color: 'black', padding: '3px 8px', borderRadius: 8, fontSize: '0.65rem', fontWeight: 900 }}>BẠN</div>
              </div>
              <h2 style={{ color: 'var(--text-primary)', marginTop: 12, fontSize: '1.1rem', fontWeight: 900 }}>{user?.username}</h2>
              
              {isMyTurn && (
                <div className="badge badge-gold" style={{ marginTop: 12, padding: '4px 12px', fontSize: '0.7rem', fontWeight: 800, animation: 'pulse-border 2s infinite' }}>
                  ⚡ {t('game.yourTurn', 'LƯỢT CỦA BẠN')}
                </div>
              )}
            </motion.div>
            
            {/* Action Log Mini */}
            <div className="glass" style={{ flex: 1, borderRadius: 32, padding: 20, background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 800 }}>📜 {t('game.actionLog', 'LỊCH SỬ')}</h4>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                {gameState.actionLog?.slice(-15).map((log, i) => (
                  <div key={i} style={{ 
                    padding: '8px 12px', 
                    background: 'var(--bg-input)', 
                    borderRadius: 12, 
                    fontSize: '0.78rem', 
                    fontWeight: 700,
                    borderLeft: `4px solid ${COLOR_MAP[gameState.activeColor] || 'var(--accent-primary)'}`,
                    color: 'var(--text-secondary)'
                  }}>
                    {typeof log === 'string' ? log : t(log.key, log.params)}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>

          {/* CENTER: PLAY AREA */}
          <div className="game-center-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
            <TurnTimer 
              currentPlayerId={gameState.currentPlayerId} 
              currentPlayerName={gameState.players.find(p => p.id === gameState.currentPlayerId)?.username || ''}
              currentUserId={user?.id}
              isActive={gameState.phase !== 'GAME_OVER'}
            />
            
            <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
              {/* Draw Pile */}
              <motion.div 
                whileHover={isMyTurn ? { scale: 1.05, y: -4, boxShadow: 'var(--shadow-glow)' } : {}}
                whileActive={isMyTurn ? { scale: 0.98 } : {}}
                className="pile" 
                onClick={handleDraw}
                style={{ 
                  width: 120, 
                  height: 175, 
                  background: '#151722', 
                  border: isMyTurn ? '4px solid var(--accent-gold)' : '4px solid white', 
                  borderRadius: 20, 
                  cursor: isMyTurn ? 'pointer' : 'default',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  boxShadow: 'var(--shadow-lg)', 
                  position: 'relative'
                }}
              >
                <div style={{ backgroundImage: `url(${UNO_ASSETS})`, width: '100%', height: '100%', backgroundSize: '200% 100%', backgroundPosition: '0% 0%', borderRadius: 14 }}></div>
                {isMyTurn && (
                  <div style={{ position: 'absolute', top: -45, background: 'var(--accent-gold)', color: 'black', padding: '6px 16px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 900, boxShadow: '0 4px 10px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
                    👆 RÚT BÀI
                  </div>
                )}
              </motion.div>

              {/* Discard Pile */}
              <motion.div
                animate={{ boxShadow: `0 10px 30px ${COLOR_GLOW_MAP[gameState.activeColor] || 'transparent'}` }}
                transition={{ duration: 0.4 }}
                style={{
                  width: 120, 
                  height: 175,
                  background: 'white',
                  border: '5px solid white', 
                  borderRadius: 20,
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  position: 'relative', 
                  overflow: 'hidden'
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: COLOR_MAP[gameState.activeColor] || '#2c3e50', transition: 'background 0.4s ease' }}>
                  {gameState.activeColor !== 'WILD' && (
                    <div style={{ position: 'absolute', top: '15%', left: '10%', width: '80%', height: '70%', background: '#fff', borderRadius: '50%', transform: 'rotate(-25deg)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }} />
                  )}
                </div>

                {['WILD', 'WILD_DRAW_4'].includes(gameState.activeValue) ? (
                  <>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${gameState.activeValue === 'WILD_DRAW_4' ? DRAW4_IMG : WILD_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    {gameState.activeColor !== 'WILD' && (
                      <div style={{ position: 'absolute', inset: 0, border: `6px solid ${COLOR_MAP[gameState.activeColor]}`, borderRadius: 14, boxShadow: `inset 0 0 20px ${COLOR_MAP[gameState.activeColor]}` }} />
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ position: 'absolute', top: 6, left: 6, color: 'white', fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(gameState.activeValue) ? '1.2rem' : '1.5rem', fontWeight: 900, textShadow: '1px 1px 2px rgba(0,0,0,0.4)', lineHeight: 1 }}>
                      {getUnoSymbol(gameState.activeValue)}
                    </div>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR_MAP[gameState.activeColor], fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(gameState.activeValue) ? '3.5rem' : '4.8rem', fontWeight: 900, textShadow: '2px 2px 4px rgba(0,0,0,0.25)', transition: 'color 0.4s ease' }}>
                      {getUnoSymbol(gameState.activeValue)}
                    </div>
                    <div style={{ position: 'absolute', bottom: 6, right: 6, color: 'white', fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(gameState.activeValue) ? '1.2rem' : '1.5rem', fontWeight: 900, textShadow: '1px 1px 2px rgba(0,0,0,0.4)', lineHeight: 1, transform: 'rotate(180deg)' }}>
                      {getUnoSymbol(gameState.activeValue)}
                    </div>
                  </>
                )}
              </motion.div>
            </div>

            <div style={{ color: 'var(--text-primary)', textAlign: 'center' }}>
              <div className="mono-font" style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8, background: 'var(--bg-glass)', border: '1px solid var(--border)', padding: '6px 20px', borderRadius: 20 }}>
                {gameState.clockwise ? '↻ CLOCKWISE' : '↺ COUNTER-CLOCKWISE'}
              </div>
            </div>
          </div>

          {/* RIGHT: CHAT & SPECIAL */}
          <div className="game-right-col" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ChatBox roomId={roomId} mode="inline" />
            
            <AnimatePresence>
              {choosingColorFor && (
                <motion.div 
                  initial={{ y: 30, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  exit={{ y: 30, opacity: 0 }}
                  className="glass" 
                  style={{ padding: 20, borderRadius: 32, background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <h3 style={{ marginBottom: 16, textAlign: 'center', color: 'var(--text-primary)', fontWeight: 900, fontSize: '1rem' }}>Chọn màu bài:</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {['RED', 'BLUE', 'GREEN', 'YELLOW'].map(c => (
                      <motion.button 
                        key={c} 
                        whileHover={{ scale: 1.08 }} 
                        whileActive={{ scale: 0.95 }}
                        onClick={() => selectColor(c)} 
                        style={{ height: 50, background: COLOR_MAP[c], border: '3px solid white', borderRadius: 14, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }} 
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* BOTTOM: MY HAND */}
        <div className="uno-hand-tray" style={{ height: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid var(--border)', borderRadius: '40px 40px 0 0', margin: '0 -40px' }}>
          <div style={{ 
            display: 'flex', 
            gap: -24, 
            justifyContent: 'center', 
            padding: '0 80px', 
            width: '100%', 
            overflowX: 'auto',
            paddingBottom: 16, 
            scrollbarWidth: 'none'
          }}>
            {myHand.map((card, i) => {
              const playable = isCardPlayable(card);
              return (
                <motion.div key={card.id}
                  initial={{ y: 60, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14, delay: i * 0.02 }}
                  whileHover={{ 
                    y: -50, 
                    scale: 1.15, 
                    zIndex: 100, 
                    boxShadow: playable ? '0 15px 30px rgba(251,191,36,0.3)' : '0 15px 30px rgba(0,0,0,0.5)'
                  }}
                  style={{ 
                    flexShrink: 0, 
                    width: 105, 
                    height: 155, 
                    background: 'white',
                    borderRadius: 18, 
                    border: playable ? '4px solid var(--accent-gold)' : '4px solid white', 
                    cursor: playable ? 'pointer' : 'not-allowed', 
                    margin: '0 -18px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden', 
                    boxShadow: 'var(--shadow-sm)',
                    opacity: playable ? 1 : 0.6,
                    position: 'relative'
                  }}
                  onClick={() => playable && handlePlayCard(card)}
                >
                  <div style={{ position: 'absolute', inset: 0, background: card.color === 'WILD' ? '#1e293b' : COLOR_MAP[card.color] }}>
                    {card.color !== 'WILD' && (
                      <div style={{ position: 'absolute', top: '15%', left: '10%', width: '80%', height: '70%', background: '#fff', borderRadius: '50%', transform: 'rotate(-25deg)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }} />
                    )}
                  </div>

                  {card.color === 'WILD' ? (
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${card.value === 'WILD_DRAW_4' ? DRAW4_IMG : WILD_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  ) : (
                    <>
                      <div style={{ position: 'absolute', top: 6, left: 6, color: 'white', fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(card.value) ? '1rem' : '1.2rem', fontWeight: 900, textShadow: '1px 1px 2px rgba(0,0,0,0.4)', lineHeight: 1 }}>
                        {getUnoSymbol(card.value)}
                      </div>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR_MAP[card.color], fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(card.value) ? '2.5rem' : '3.8rem', fontWeight: 900, textShadow: '2px 2px 4px rgba(0,0,0,0.25)' }}>
                        {getUnoSymbol(card.value)}
                      </div>
                      <div style={{ position: 'absolute', bottom: 6, right: 6, color: 'white', fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(card.value) ? '1rem' : '1.2rem', fontWeight: 900, textShadow: '1px 1px 2px rgba(0,0,0,0.4)', lineHeight: 1, transform: 'rotate(180deg)' }}>
                        {getUnoSymbol(card.value)}
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Game Over Overlays */}
      <AnimatePresence>
        {gameState.phase === 'GAME_OVER' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="game-over-overlay" 
            style={{ zIndex: 2000, background: 'rgba(6,8,16,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }} 
              animate={{ scale: 1, y: 0 }} 
              className="game-over-card glass" 
              style={{ padding: 40, borderRadius: 40, background: 'var(--bg-surface)', border: '1px solid var(--accent-gold)', width: 450, textAlign: 'center', boxShadow: 'var(--shadow-glow-gold)' }}
            >
              <div style={{ fontSize: '5rem', marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>👑</div>
              <h1 className="display-font" style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: 12 }}>{t('game.gameOver', 'TRÒ CHƠI KẾT THÚC')}</h1>
              
              <div style={{ padding: '24px 40px', background: 'rgba(245,158,11,0.08)', borderRadius: 24, border: '2px solid var(--accent-gold)', margin: '24px 0' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--accent-gold)', fontWeight: 800, marginBottom: 6 }}>Vượt Trội</div>
                <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>
                  {gameState.players?.find(p => p.id === gameState.winnerId)?.username} THẮNG!
                </h2>
              </div>
              
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <motion.button 
                  whileHover={{ scale: 1.05, boxShadow: 'var(--shadow-glow)' }}
                  whileActive={{ scale: 0.95 }}
                  onClick={() => navigate(`/room/${roomId}`)} 
                  className="btn btn-primary"
                  style={{ padding: '14px 28px', borderRadius: 16, fontWeight: 800 }}
                >
                  CHƠI LẠI
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileActive={{ scale: 0.95 }}
                  onClick={() => navigate('/lobby')} 
                  className="btn btn-ghost"
                  style={{ padding: '14px 28px', borderRadius: 16, border: '1px solid var(--border)', fontWeight: 800 }}
                >
                  VỀ SẢNH
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .spinner {
          width: 50px; height: 50px; border: 5px solid rgba(255,255,255,0.1); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-border {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
