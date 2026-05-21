import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import TurnTimer from '../components/TurnTimer';
import toast from 'react-hot-toast';

const UNO_ASSETS = '/assets/uno_assets_pack_1777970075772.png';
const WILD_IMG = '/assets/uno_wild_card_premium_1778036505397.png';
const DRAW4_IMG = '/assets/uno_wild_draw4_premium_1778036593265.png';
const COLOR_MAP = { RED: '#e74c3c', BLUE: '#3498db', GREEN: '#2ecc71', YELLOW: '#f1c40f', WILD: '#2c3e50' };

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
  }, [gameState?.actionLog]);

  if (!gameState) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0c29', gap: 20 }}>
      <div className="spinner" />
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

  return (
    <div className="page" style={{ 
      height: '100vh', display: 'flex', flexDirection: 'column', 
      background: 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)',
      overflow: 'hidden', position: 'relative'
    }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("/assets/uno_bg.png")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.1, pointerEvents: 'none' }} />
      <Navbar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 40px', gap: 20, position: 'relative', zIndex: 1, minHeight: 0 }}>
        
        {/* TOP: OPPONENTS */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, height: '140px', flexShrink: 0 }}>
          {gameState.players.filter(p => p.id !== user?.id).map((p, i) => (
            <motion.div key={p.id} 
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`player-seat glass ${gameState.currentPlayerId === p.id ? 'active-turn' : ''}`}
              style={{ 
                width: 140, padding: 12, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center',
                border: gameState.currentPlayerId === p.id ? '4px solid white' : '2px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
                boxShadow: gameState.currentPlayerId === p.id ? '0 0 20px rgba(255,255,255,0.4)' : 'none'
              }}
            >
              <img src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`} 
                   alt={p.username} style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid white', marginBottom: 8 }} />
              <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'white', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.username}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontWeight: 800 }}>🎴 {p.handCount} lá bài</div>
            </motion.div>
          ))}
        </div>

        {/* MIDDLE: BOARD & SIDEBARS */}
        <div className="game-grid-layout">
          
          {/* LEFT: MY STATUS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <motion.div className={`glass ${isMyTurn ? 'active-turn' : ''}`} 
              style={{ 
                padding: 24, borderRadius: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', 
                background: 'rgba(255,255,255,0.15)', border: '3px solid white',
                boxShadow: isMyTurn ? '0 0 30px rgba(255,255,255,0.3)' : 'var(--shadow-lg)'
              }}>
              <div style={{ position: 'relative' }}>
                <img src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username}`} 
                     alt={user?.username} style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid white' }} />
                <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#f1c40f', color: 'black', padding: '4px 10px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 900, border: '2px solid white' }}>YOU</div>
              </div>
              <h2 style={{ color: 'white', marginTop: 12, fontSize: '1.2rem', fontWeight: 900 }}>{user?.username}</h2>
              {isMyTurn && <div className="badge badge-gold" style={{ marginTop: 12, animation: 'pulse-border 2s infinite' }}>LƯỢT CỦA BẠN</div>}
            </motion.div>
            
            {/* Action Log Mini */}
            <div className="glass" style={{ flex: 1, borderRadius: 32, padding: 20, background: 'rgba(0,0,0,0.3)', color: 'white', display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>📜 {t('game.actionLog')}</h4>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                {gameState.actionLog?.slice(-15).map((log, i) => (
                  <div key={i} style={{ 
                    padding: '10px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700,
                    borderLeft: '4px solid #f1c40f'
                  }}>
                    {typeof log === 'string' ? log : t(log.key, log.params)}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>

          {/* CENTER: PLAY AREA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
            <TurnTimer 
              currentPlayerId={gameState.currentPlayerId} 
              currentPlayerName={gameState.players.find(p => p.id === gameState.currentPlayerId)?.username || ''}
              currentUserId={user?.id}
              isActive={gameState.phase !== 'GAME_OVER'}
            />
            
            <div style={{ display: 'flex', gap: 60, alignItems: 'center' }}>
              {/* Draw Pile */}
              <motion.div whileHover={{ scale: 1.05 }} className="pile" onClick={handleDraw}
                style={{ 
                  width: 130, height: 190, background: '#1a1a1a', border: '6px solid white', borderRadius: 20, cursor: isMyTurn ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'relative'
                }}>
                <div style={{ backgroundImage: `url(${UNO_ASSETS})`, width: '100%', height: '100%', backgroundSize: '200% 100%', backgroundPosition: '0% 0%', borderRadius: 14 }}></div>
                {isMyTurn && <div style={{ position: 'absolute', top: -50, background: '#f1c40f', color: 'black', padding: '8px 24px', borderRadius: 12, fontWeight: 900, boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>RÚT BÀI</div>}
              </motion.div>

              {/* Discard Pile */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                style={{
                  width: 130, height: 190,
                  background: 'white',
                  border: '6px solid white', borderRadius: 20,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: COLOR_MAP[gameState.activeColor] || '#2c3e50' }}>
                  {gameState.activeColor !== 'WILD' && (
                    <div style={{ position: 'absolute', top: '15%', left: '10%', width: '80%', height: '70%', background: '#fff', borderRadius: '50%', transform: 'rotate(-25deg)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }} />
                  )}
                </div>

                {['WILD', 'WILD_DRAW_4'].includes(gameState.activeValue) ? (
                  <>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${gameState.activeValue === 'WILD_DRAW_4' ? DRAW4_IMG : WILD_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    {gameState.activeColor !== 'WILD' && (
                      <div style={{ position: 'absolute', inset: 0, border: `8px solid ${COLOR_MAP[gameState.activeColor]}`, borderRadius: 14, boxShadow: `inset 0 0 20px ${COLOR_MAP[gameState.activeColor]}` }} />
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ position: 'absolute', top: 8, left: 8, color: 'white', fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(gameState.activeValue) ? '1.4rem' : '1.8rem', fontWeight: 900, textShadow: '1px 1px 2px rgba(0,0,0,0.5)', lineHeight: 1 }}>
                      {getUnoSymbol(gameState.activeValue)}
                    </div>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR_MAP[gameState.activeColor], fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(gameState.activeValue) ? '4rem' : '5.5rem', fontWeight: 900, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                      {getUnoSymbol(gameState.activeValue)}
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, color: 'white', fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(gameState.activeValue) ? '1.4rem' : '1.8rem', fontWeight: 900, textShadow: '1px 1px 2px rgba(0,0,0,0.5)', lineHeight: 1, transform: 'rotate(180deg)' }}>
                      {getUnoSymbol(gameState.activeValue)}
                    </div>
                  </>
                )}
              </motion.div>
            </div>

            <div style={{ color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.8, background: 'rgba(0,0,0,0.2)', padding: '8px 32px', borderRadius: 20 }}>
                {gameState.clockwise ? '↻ CLOCKWISE' : '↺ COUNTER-CLOCKWISE'}
              </div>
            </div>
          </div>

          {/* RIGHT: CHAT & SPECIAL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ChatBox roomId={roomId} />
            
            <AnimatePresence>
              {choosingColorFor && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                  className="glass" style={{ padding: 24, borderRadius: 32, background: 'rgba(255,255,255,0.95)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                  <h3 style={{ marginBottom: 20, textAlign: 'center', color: '#1a2a6c', fontWeight: 900 }}>Chọn màu mới:</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {['RED', 'BLUE', 'GREEN', 'YELLOW'].map(c => (
                      <motion.button key={c} whileHover={{ scale: 1.1 }} whileActive={{ scale: 0.9 }}
                        onClick={() => selectColor(c)} 
                        style={{ height: 60, background: COLOR_MAP[c], border: '4px solid white', borderRadius: 16, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* BOTTOM: MY HAND */}
        <div style={{ height: '240px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'rgba(0,0,0,0.15)', borderRadius: '40px 40px 0 0', margin: '0 -40px' }}>
          <div style={{ 
            display: 'flex', gap: -30, justifyContent: 'center', padding: '0 100px', width: '100%', overflowX: 'auto',
            paddingBottom: 20, scrollbarWidth: 'none'
          }}>
            {myHand.map((card, i) => (
              <motion.div key={card.id}
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -50, scale: 1.15, zIndex: 100 }}
                style={{ 
                  flexShrink: 0, width: 120, height: 180, background: 'white',
                  borderRadius: 20, border: '6px solid white', cursor: 'pointer', margin: '0 -25px',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 15px 30px rgba(0,0,0,0.4)',
                  transition: 'margin 0.3s', position: 'relative'
                }}
                onClick={() => handlePlayCard(card)}
              >
                <div style={{ position: 'absolute', inset: 0, background: card.color === 'WILD' ? '#2c3e50' : COLOR_MAP[card.color] }}>
                  {card.color !== 'WILD' && (
                    <div style={{ position: 'absolute', top: '15%', left: '10%', width: '80%', height: '70%', background: '#fff', borderRadius: '50%', transform: 'rotate(-25deg)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }} />
                  )}
                </div>

                {card.color === 'WILD' ? (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${card.value === 'WILD_DRAW_4' ? DRAW4_IMG : WILD_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                ) : (
                  <>
                    <div style={{ position: 'absolute', top: 8, left: 8, color: 'white', fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(card.value) ? '1.2rem' : '1.5rem', fontWeight: 900, textShadow: '1px 1px 2px rgba(0,0,0,0.5)', lineHeight: 1 }}>
                      {getUnoSymbol(card.value)}
                    </div>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR_MAP[card.color], fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(card.value) ? '3rem' : '4.5rem', fontWeight: 900, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                      {getUnoSymbol(card.value)}
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, color: 'white', fontSize: ['SKIP', 'REVERSE', 'DRAW_2'].includes(card.value) ? '1.2rem' : '1.5rem', fontWeight: 900, textShadow: '1px 1px 2px rgba(0,0,0,0.5)', lineHeight: 1, transform: 'rotate(180deg)' }}>
                      {getUnoSymbol(card.value)}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {gameState.phase === 'GAME_OVER' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-over-overlay" style={{ zIndex: 2000 }}>
            <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} className="game-over-card glass" style={{ padding: 60, borderRadius: 60, background: 'rgba(255,255,255,0.98)', textAlign: 'center', boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize: '6rem', marginBottom: 20 }}>👑</div>
              <h1 style={{ fontSize: '3.5rem', color: '#1a2a6c', fontWeight: 900, marginBottom: 12 }}>{t('game.gameOver')}</h1>
              <div style={{ padding: '30px 60px', background: '#f1c40f', borderRadius: 32, margin: '32px 0', border: '6px solid white' }}>
                <h2 style={{ fontSize: '2.2rem', margin: 0, fontWeight: 900 }}>{gameState.players?.find(p => p.id === gameState.winnerId)?.username} THẮNG!</h2>
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <button onClick={() => navigate(`/room/${roomId}`)} className="btn btn-primary" style={{ padding: '20px 50px', fontSize: '1.2rem' }}>CHƠI LẠI</button>
                <button onClick={() => navigate('/lobby')} className="btn btn-ghost" style={{ padding: '20px 50px', fontSize: '1.2rem' }}>VỀ SẢNH</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .spinner {
          width: 50px; height: 50px; border: 5px solid rgba(255,255,255,0.1); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-border {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
