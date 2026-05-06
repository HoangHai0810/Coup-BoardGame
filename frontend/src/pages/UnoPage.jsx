import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';

const UNO_ASSETS = '/assets/uno_assets_pack_1777970075772.png'; // Path to the generated image
const WILD_IMG = '/assets/uno_wild_card_premium_1778036505397.png';
const DRAW4_IMG = '/assets/uno_wild_draw4_premium_1778036593265.png';
const COLOR_MAP = { RED: '#e74c3c', BLUE: '#3498db', GREEN: '#2ecc71', YELLOW: '#f1c40f', WILD: '#2c3e50' };

export default function UnoPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { subscribe, send } = useSocket();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [choosingColorFor, setChoosingColorFor] = useState(null); // cardId
  const logEndRef = useRef(null);

  useEffect(() => {
    const unsub1 = subscribe(`/topic/game/${roomId}`, data => {
      if (data.gameType === 'UNO') setGameState(data);
    });
    const unsub2 = subscribe(`/topic/game/${roomId}/private/${user?.id}`, data => {
      setMyHand(data.hand || []);
    });
    return () => { unsub1(); unsub2(); };
  }, [roomId, user?.id, subscribe]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.actionLog]);

  if (!gameState) return <div className="page-loading"><div className="spinner" /></div>;

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
    <div className="page uno-page" style={{ overflow: 'hidden' }}>
      <div className="uno-bg-overlay" />
      <Navbar />

      <div className="uno-container">
        {/* Opponents */}
        <div className="opponents-row">
          {gameState.players.filter(p => p.id !== user?.id).map(p => (
            <div key={p.id} className={`player-card ${gameState.currentPlayerId === p.id ? 'active' : ''}`}>
              <img src={p.avatarUrl} alt={p.username} />
              <div className="info">
                <div className="name">{p.username}</div>
                <div className="count">🎴 {p.handCount}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Center Board */}
        <div className="board-center">
          <div className="deck-area">
            <div className="pile draw-pile" onClick={handleDraw}>
              <div className="uno-card-back" style={{ backgroundImage: `url(${UNO_ASSETS})`, backgroundSize: '200% 100%', backgroundPosition: '0% 0%' }}></div>
            </div>
            <div className="pile discard-pile" style={{ background: COLOR_MAP[gameState.activeColor] }}>
              <div className="uno-card-front">
                <span className="value">{gameState.activeValue}</span>
              </div>
            </div>
          </div>
          
          <div className="game-info">
            <div className="current-color" style={{ color: COLOR_MAP[gameState.activeColor] }}>
              ● {gameState.activeColor}
            </div>
            <div className="direction">
              {gameState.clockwise ? '↻ Clockwise' : '↺ Counter-Clockwise'}
            </div>
          </div>
        </div>

        {/* My Hand */}
        <div className="my-hand-area">
          <div className="hand-scroll">
            {myHand.map((card) => (
                <motion.div 
                  key={card.id}
                  whileHover={{ y: -30, scale: 1.1 }}
                  className="uno-player-card"
                  style={{ 
                    cursor: 'pointer',
                    width: 100, height: 150,
                    background: card.color === 'WILD' ? '#2c3e50' : COLOR_MAP[card.color]
                  }}
                  onClick={() => handlePlayCard(card)}
                >
                  <div className="card-art-container" style={{ background: card.color === 'WILD' ? 'transparent' : 'rgba(255,255,255,0.1)' }}>
                    {card.color === 'WILD' ? (
                      <div className="card-art" style={{
                        backgroundImage: `url(${card.value === 'WILD_DRAW_4' ? DRAW4_IMG : WILD_IMG})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }} />
                    ) : (
                      <div style={{
                        fontSize: '3rem', fontWeight: 900, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                      }}>
                        {card.value}
                      </div>
                    )}
                  </div>
                  <div className="card-label" style={{ background: 'white', textAlign: 'center', fontSize: '10px' }}>{card.color}</div>
                </motion.div>
            ))}
          </div>
          <div className={`turn-banner ${isMyTurn ? 'my-turn' : ''}`}>
            {isMyTurn ? 'Tới lượt bạn!' : `Lượt của ${gameState.players.find(p => p.id === gameState.currentPlayerId)?.username}`}
          </div>
        </div>

        {/* Action Log */}
        <div className="log-panel">
          {gameState.actionLog.slice(-5).map((log, i) => (
            <div key={i} className="log-item">
              {typeof log === 'string' ? log : t(log.key, log.params)}
            </div>
          ))}
        </div>
      </div>

      {/* Color Selection Modal */}
      <AnimatePresence>
        {choosingColorFor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modal-overlay">
            <div className="color-modal">
              <h3>Chọn màu tiếp theo:</h3>
              <div className="color-grid">
                {['RED', 'YELLOW', 'GREEN', 'BLUE'].map(c => (
                  <div key={c} className="color-option" style={{ background: COLOR_MAP[c] }} onClick={() => selectColor(c)} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {gameState.phase === 'GAME_OVER' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="game-over-overlay"
            style={{ zIndex: 9999, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} 
              className="game-over-card"
              style={{ pointerEvents: 'auto', background: 'white', padding: 40, borderRadius: 32, textAlign: 'center' }}
            >
              <h1 className="display-font" style={{ color: 'var(--text-primary)', fontSize: '2.5rem', marginBottom: 10 }}>
                {t('game.gameOver')}
              </h1>
              <div className="winner-announcement" style={{ marginBottom: 32 }}>
                <span style={{ fontSize: '1.2rem' }}>🏆</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                  {gameState.players?.find(p => p.id === gameState.winnerId)?.username} đã chiến thắng!
                </span>
              </div>

              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button onClick={() => navigate(`/room/${roomId}`)} className="btn btn-primary" style={{ padding: '14px 28px', zIndex: 10000, cursor: 'pointer' }}>
                  Chơi lại
                </button>
                <button onClick={() => navigate('/lobby')} className="btn btn-ghost" style={{ padding: '14px 28px', zIndex: 10000, cursor: 'pointer' }}>
                  Về sảnh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .uno-page {
            background: #0f0c29;
            position: relative;
        }
        .uno-bg-overlay {
            position: absolute;
            inset: 0;
            background-image: url('/assets/uno_bg.png');
            background-size: cover;
            background-position: center;
            opacity: 0.25;
            filter: blur(2px);
            z-index: 0;
        }
        .uno-container {
          display: flex; flex-direction: column; height: calc(100vh - 70px);
          padding: 20px; gap: 20px; position: relative;
          z-index: 1;
        }
        .opponents-row { display: flex; justify-content: center; gap: 20px; }
        .player-card {
          background: white; padding: 10px 20px; border-radius: 16px; border: 3px solid #ddd;
          display: flex; align-items: center; gap: 12px; transition: all 0.3s;
        }
        .player-card.active { border-color: #ff5722; transform: scale(1.05); box-shadow: 0 0 15px rgba(255,87,34,0.2); }
        .player-card img { width: 48px; height: 48px; border-radius: 50%; border: 2px solid #eee; }
        .player-card .name { font-weight: 800; font-size: 0.9rem; }
        
        .board-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
        .deck-area { display: flex; gap: 40px; }
        .pile {
          width: 120px; height: 180px; border-radius: 12px; border: 5px solid white;
          box-shadow: 0 8px 16px rgba(0,0,0,0.1); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .uno-card-back { background: #000; color: #ff3b30; font-weight: 900; font-size: 2rem; border-radius: 8px; padding: 10px; border: 4px solid white; }
        .uno-card-front { color: white; font-weight: 900; font-size: 3rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }

        .game-info { text-align: center; font-weight: 900; }
        .current-color { font-size: 1.5rem; text-transform: uppercase; margin-bottom: 5px; }

        .my-hand-area { background: white; border-radius: 32px 32px 0 0; padding: 30px; box-shadow: 0 -10px 30px rgba(0,0,0,0.05); }
        .hand-scroll { display: flex; gap: -20px; overflow-x: auto; padding: 40px 0; justify-content: center; }
        .uno-card {
          width: 100px; height: 150px; flex-shrink: 0; border-radius: 12px; border: 4px solid white;
          display: flex; align-items: center; justify-content: center; color: white; cursor: pointer;
          font-weight: 900; font-size: 2rem; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          margin-left: -20px; transition: all 0.2s;
        }
        .uno-card:first-child { margin-left: 0; }
        .uno-card:hover { z-index: 10; margin-top: -20px; }

        .turn-banner { text-align: center; font-weight: 900; color: #999; margin-top: 10px; }
        .turn-banner.my-turn { color: #ff5722; font-size: 1.2rem; }

        .log-panel { position: absolute; left: 20px; top: 100px; width: 220px; display: flex; flex-direction: column; gap: 8px; }
        .log-item { background: white; padding: 10px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; border-left: 4px solid #ff5722; }

        .color-modal { background: white; padding: 40px; border-radius: 32px; text-align: center; }
        .color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
        .color-option { width: 80px; height: 80px; border-radius: 50%; cursor: pointer; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}
