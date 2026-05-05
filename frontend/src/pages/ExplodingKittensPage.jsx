import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

const CARD_EMOJIS = {
  EXPLODING_KITTEN: '🙀',
  DEFUSE: '🛠️',
  ATTACK: '🏹',
  SKIP: '🏃',
  FAVOR: '🎁',
  SHUFFLE: '🔀',
  SEE_THE_FUTURE: '🔮',
  NOPE: '🚫',
  CAT_BEARD: '🧔',
  CAT_TACO: '🌮',
  CAT_RAINBOW: '🌈',
  CAT_MELON: '🍉'
};

const CARD_COLORS = {
  EXPLODING_KITTEN: '#b71c1c',
  DEFUSE: '#2e7d32',
  ATTACK: '#e65100',
  SKIP: '#0277bd',
  FAVOR: '#6a1b9a',
  SHUFFLE: '#1565c0',
  SEE_THE_FUTURE: '#6a1b9b',
  NOPE: '#c62828',
  CAT_BEARD: '#795548',
  CAT_TACO: '#fbc02d',
  CAT_RAINBOW: '#ec407a',
  CAT_MELON: '#9ccc65'
};

const KITTENS_SHEET = '/assets/kittens_cards.png';

const KITTEN_ART_POS = {
  EXPLODING_KITTEN: '0% 0%',
  DEFUSE: '100% 0%',
  SKIP: '0% 100%',
  ATTACK: '100% 100%'
};

export default function ExplodingKittensPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { subscribe, send } = useSocket();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [targetAction, setTargetAction] = useState(null); // { card, targetId }
  const logEndRef = useRef(null);

  useEffect(() => {
    const unsub1 = subscribe(`/topic/game/${roomId}`, data => {
      if (data.gameType === 'KITTENS') {
        setGameState(data);
      }
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
  const me = gameState.players.find(p => p.id === user?.id);

  const handlePlayCard = (card) => {
    if (!isMyTurn) return;
    if (card === 'FAVOR') {
        setTargetAction({ card });
        return;
    }
    send(`/app/game/${roomId}/kittens/play`, { card });
  };

  const handleDraw = () => {
    if (!isMyTurn) return;
    send(`/app/game/${roomId}/kittens/draw`, {});
  };

  const handleTarget = (targetId) => {
    if (targetAction) {
        send(`/app/game/${roomId}/kittens/play`, { card: targetAction.card, targetId });
        setTargetAction(null);
    }
  };

  const handleDefuse = (pos) => {
    send(`/app/game/${roomId}/kittens/defuse`, { position: pos });
  };

  const handleGiveCard = (card) => {
    send(`/app/game/${roomId}/kittens/give-card`, { card });
  };

  const handleCloseFuture = () => {
    setGameState(prev => ({ ...prev, futureCards: [] }));
  };

  return (
    <div className="page kittens-page" style={{ overflow: 'hidden' }}>
      <div className="game-bg-overlay" />
      <Navbar />

      <div className="game-container">
        
        {/* Opponents */}
        <div className="opponents-row">
            {gameState.players.filter(p => p.id !== user?.id).map(p => (
                <div key={p.id} 
                    className={`player-mini ${gameState.currentPlayerId === p.id ? 'active' : ''} ${p.exploded ? 'exploded' : ''}`}
                    onClick={() => handleTarget(p.id)}
                    style={{ cursor: targetAction ? 'pointer' : 'default' }}
                >
                    <img src={p.avatarUrl} alt={p.username} className="avatar-sm" />
                    <div className="info">
                        <div className="name">{p.username}</div>
                        <div className="cards-count">🎴 {p.handCount}</div>
                    </div>
                    {p.exploded && <div className="boom-label">BOOM</div>}
                </div>
            ))}
        </div>

        {/* Center Board */}
        <div className="board-center">
            <div className="deck-piles">
                <div className="pile draw-pile" onClick={handleDraw}>
                    <div className="card-back">KITTENS</div>
                    <div className="count">{gameState.drawPileCount}</div>
                </div>
                <div className="pile discard-pile">
                    <AnimatePresence mode="wait">
                        {gameState.discardTop ? (
                            <motion.div 
                                key={gameState.discardTop}
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="card-front" 
                                style={{ background: CARD_COLORS[gameState.discardTop] }}
                            >
                                <span className="emoji">{CARD_EMOJIS[gameState.discardTop]}</span>
                                <span className="label">{gameState.discardTop}</span>
                            </motion.div>
                        ) : (
                            <div className="empty-pile" />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Explosion Effect */}
            <AnimatePresence>
                {gameState.players.some(p => p.exploded && !me.exploded) && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="explosion-flash"
                    />
                )}
            </AnimatePresence>

            {gameState.phase === 'EXPLODING' && isMyTurn && (
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="defuse-modal">
                    <h2>🙀 BẠN ĐÃ RÚT PHẢI MÈO NỔ!</h2>
                    <p>Sử dụng Gỡ Bom để sống sót!</p>
                    <div className="defuse-options">
                        <button onClick={() => handleDefuse(0)} className="btn btn-primary">Đặt lại lên đầu</button>
                        <button onClick={() => handleDefuse(Math.floor(Math.random() * gameState.drawPileCount))} className="btn btn-ghost">Đặt ngẫu nhiên</button>
                        <button onClick={() => handleDefuse(gameState.drawPileCount)} className="btn btn-ghost">Đặt xuống cuối</button>
                    </div>
                </motion.div>
            )}

            {gameState.turnsLeft > 1 && (
                <div className="turns-badge">🔥 {gameState.turnsLeft} turns left!</div>
            )}

            {/* See the Future Modal */}
            <AnimatePresence>
                {gameState.futureCards && gameState.futureCards.length > 0 && isMyTurn && (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="future-modal">
                        <h3>🔮 Nhìn trước tương lai</h3>
                        <div className="future-cards">
                            {gameState.futureCards.map((card, i) => (
                                <div key={i} className="kittens-card" style={{ background: CARD_COLORS[card], width: 70, height: 100 }}>
                                    <div className="card-art-container">
                                        <div className="card-art" style={{
                                          backgroundImage: `url(${KITTENS_SHEET})`,
                                          backgroundSize: '200% 200%',
                                          backgroundPosition: KITTEN_ART_POS[card] || '0% 0%',
                                        }} />
                                    </div>
                                    <div className="card-label" style={{ fontSize: '0.5rem', padding: '2px 0' }}>{card}</div>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleCloseFuture}>Đóng</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Favor Modal (Target's view) */}
            <AnimatePresence>
                {gameState.phase === 'AWAITING_FAVOR' && gameState.favorTargetId === user?.id && (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="favor-modal">
                        <h3>🎁 Bạn phải tặng 1 lá bài cho {gameState.players.find(p => p.id === gameState.favorRequesterId)?.username}</h3>
                        <p>Chọn một lá bài để đưa đi:</p>
                        <div className="hand-scroll">
                            {myHand.map((card, idx) => (
                                <div key={idx} className="kittens-card" style={{ background: CARD_COLORS[card] }} onClick={() => handleGiveCard(card)}>
                                    <div className="card-art-container">
                                        <div className="card-art" style={{
                                          backgroundImage: `url(${KITTENS_SHEET})`,
                                          backgroundSize: '200% 200%',
                                          backgroundPosition: KITTEN_ART_POS[card] || '0% 0%',
                                        }} />
                                    </div>
                                    <div className="card-label" style={{ fontSize: '0.6rem' }}>{card}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* My Hand */}
        <div className="my-hand-area">
            <div className="hand-scroll">
                {myHand.map((card, idx) => (
                    <motion.div 
                        key={idx}
                        whileHover={{ y: -30, scale: 1.1 }}
                        className="kittens-card"
                        style={{ background: CARD_COLORS[card] }}
                        onClick={() => handlePlayCard(card)}
                    >
                        <div className="card-art-container">
                          <div className="card-art" style={{
                            backgroundImage: `url(${KITTENS_SHEET})`,
                            backgroundSize: '200% 200%',
                            backgroundPosition: KITTEN_ART_POS[card] || '0% 0%',
                            opacity: KITTEN_ART_POS[card] ? 1 : 0.2
                          }} />
                        </div>
                        <div className="card-label" style={{ fontSize: '0.6rem' }}>{card}</div>
                    </motion.div>
                ))}
            </div>
            
            <div className="my-info">
                <div className={`turn-indicator ${isMyTurn ? 'my-turn' : ''}`}>
                    {isMyTurn ? 'Lượt của bạn!' : `Đợi ${gameState.players.find(p => p.id === gameState.currentPlayerId)?.username}...`}
                </div>
                {targetAction && (
                    <div className="target-hint">🎯 Chọn một người chơi để sử dụng {targetAction.card}</div>
                )}
            </div>
        </div>

        {/* Action Log Overlay */}
        <div className="log-sidebar">
            <h3>📜 Game Log</h3>
            <div className="log-entries">
                {gameState.actionLog.map((log, i) => (
                    <div key={i} className="log-entry">
                        {typeof log === 'string' ? log : t(log.key, log.params)}
                    </div>
                ))}
                <div ref={logEndRef} />
            </div>
        </div>

      </div>

      {/* Game Over */}
      <AnimatePresence>
        {gameState.phase === 'GAME_OVER' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="game-over-overlay"
            style={{ zIndex: 9999 }}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} 
              className="game-over-card"
              style={{ pointerEvents: 'auto' }}
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
                <button onClick={() => navigate(`/room/${roomId}`)} className="btn btn-primary" style={{ padding: '14px 28px', zIndex: 10000 }}>
                  Chơi lại
                </button>
                <button onClick={() => navigate('/lobby')} className="btn btn-ghost" style={{ padding: '14px 28px', zIndex: 10000 }}>
                  Về sảnh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .kittens-page {
            background: #1a0f0f;
            position: relative;
        }
        .game-bg-overlay {
            position: absolute;
            inset: 0;
            background-image: url('/assets/kittens_bg.png');
            background-size: cover;
            background-position: center;
            opacity: 0.3;
            filter: blur(4px);
            z-index: 0;
        }
        .game-container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 70px);
            padding: 20px;
            gap: 20px;
            position: relative;
            z-index: 1;
        }
        .explosion-flash {
            position: fixed;
            inset: 0;
            background: white;
            z-index: 1000;
            pointer-events: none;
            animation: flash 0.5s ease-out forwards;
        }
        @keyframes flash {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
        }
        .opponents-row {
            display: flex;
            justify-content: center;
            gap: 20px;
        }
        .player-mini {
            padding: 10px;
            background: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            border: 3px solid #ddd;
            transition: all 0.2s;
        }
        .player-mini.active {
            border-color: #ff5722;
            box-shadow: 0 0 15px rgba(255,87,34,0.3);
            transform: scale(1.05);
        }
        .player-mini.exploded {
            opacity: 0.5;
            filter: grayscale(1);
        }
        .board-center {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .deck-piles {
            display: flex;
            gap: 40px;
        }
        .pile {
            width: 120px;
            height: 180px;
            border-radius: 12px;
            box-shadow: 0 8px 0 rgba(0,0,0,0.1);
            position: relative;
            cursor: pointer;
        }
        .draw-pile {
            background: #2c3e50;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card-back {
            color: white;
            font-weight: 900;
            transform: rotate(-90deg);
            font-size: 1.5rem;
        }
        .pile .count {
            position: absolute;
            bottom: -30px;
            width: 100%;
            text-align: center;
            font-weight: 900;
            color: #2c3e50;
        }
        .card-front {
            width: 100%;
            height: 100%;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            border: 4px solid white;
        }
        .card-front .emoji { font-size: 3rem; }
        .card-front .label { font-weight: 900; font-size: 0.8rem; margin-top: 10px; text-transform: uppercase; }

        .my-hand-area {
            height: 220px;
            background: rgba(0,0,0,0.03);
            border-radius: 24px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .hand-scroll {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            padding: 10px 0;
            justify-content: center;
        }
        .kittens-card {
            width: 90px;
            height: 130px;
            flex-shrink: 0;
            border-radius: 12px;
            border: 3px solid white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            box-shadow: 0 4px 0 rgba(0,0,0,0.1);
        }
        .kittens-card .emoji { font-size: 2.5rem; }
        .kittens-card .name { font-size: 0.6rem; font-weight: 900; text-transform: uppercase; margin-top: 5px; text-align: center; }

        .log-sidebar {
            position: absolute;
            right: 20px;
            top: 100px;
            width: 250px;
            background: white;
            border-radius: 16px;
            padding: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            max-height: 400px;
            display: flex;
            flex-direction: column;
        }
        .log-entries {
            overflow-y: auto;
            font-size: 0.8rem;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .log-entry { padding: 5px 0; border-bottom: 1px dashed #eee; font-weight: 600; }

        .defuse-modal {
            position: absolute;
            background: white;
            padding: 40px;
            border-radius: 32px;
            border: 8px solid #b71c1c;
            text-align: center;
            z-index: 100;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        .defuse-options { display: flex; gap: 15px; margin-top: 25px; }

        .turns-badge {
            background: #ff3d00;
            color: white;
            padding: 8px 20px;
            border-radius: 99px;
            font-weight: 900;
            margin-top: 20px;
            box-shadow: 0 4px 0 #bf360c;
        }

        .future-modal, .favor-modal {
            position: absolute;
            background: white;
            padding: 30px;
            border-radius: 24px;
            border: 4px solid #283593;
            text-align: center;
            z-index: 100;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .future-cards { display: flex; gap: 10px; margin-top: 15px; }
        .future-card-mini {
            width: 70px;
            height: 100px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.6rem;
            font-weight: 800;
        }
        .future-card-mini .emoji { font-size: 1.5rem; }
      `}</style>
    </div>
  );
}
