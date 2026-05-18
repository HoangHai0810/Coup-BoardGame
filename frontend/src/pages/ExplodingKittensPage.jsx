import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';

const CARD_EMOJIS = {
  EXPLODING_KITTEN: '💣',
  DEFUSE: '🔧',
  ATTACK: '⚔️',
  SKIP: '⏭️',
  FAVOR: '🤲',
  SHUFFLE: '🔄',
  SEE_THE_FUTURE: '🔮',
  NOPE: '🛑',
  CAT_BEARD: '🧔',
  CAT_TACO: '🌮',
  CAT_RAINBOW: '🌈',
  CAT_MELON: '🍉'
};

const KITTENS_IMAGES = {
  EXPLODING_KITTEN: '/assets/kittens_exploding_card_single_1777971975774.png',
  DEFUSE: '/assets/kittens_defuse_card_single_new_1777972381705.png',
  ATTACK: '/assets/kittens_attack_card_single_1777972477188.png',
  SKIP: '/assets/kittens_skip_card_single_1777972836070.png',
  FAVOR: '/assets/kittens_favor_card_single_1777972917335.png',
  SHUFFLE: '/assets/kittens_shuffle_card_single_1777973283160.png',
  SEE_THE_FUTURE: '/assets/kittens_future_card_single_1777973696097.png',
  NOPE: '/assets/kittens_nope_card_single_v2_1778036390192.png',
  CAT_BEARD: '/assets/kittens_cat_cards_batch_1778837802384.png',
  CAT_TACO: '/assets/kittens_cat_cards_batch_1778837802384.png',
  CAT_RAINBOW: '/assets/kittens_cat_cards_batch_1778837802384.png',
  CAT_MELON: '/assets/kittens_cat_cards_batch_1778837802384.png'
};

const CAT_POSITIONS = {
  CAT_BEARD: '0% 0%',
  CAT_TACO: '33.3% 0%',
  CAT_RAINBOW: '66.6% 0%',
  CAT_MELON: '100% 0%'
};

const CARD_COLORS = {
  EXPLODING_KITTEN: '#212121',
  DEFUSE: '#2ecc71',
  ATTACK: '#e74c3c',
  SKIP: '#3498db',
  FAVOR: '#9b59b6',
  SHUFFLE: '#f1c40f',
  SEE_THE_FUTURE: '#1abc9c',
  NOPE: '#34495e',
  CAT_BEARD: '#7f8c8d',
  CAT_TACO: '#e67e22',
  CAT_RAINBOW: '#fd79a8',
  CAT_MELON: '#27ae60'
};

export default function ExplodingKittensPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { subscribe, send, connected } = useSocket();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [targetAction, setTargetAction] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [requestedCard, setRequestedCard] = useState(null);
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
    if (connected) {
      send(`/app/game/${roomId}/connect`, {});
    }
    return () => { unsub1(); unsub2(); };
  }, [roomId, user?.id, subscribe, send, connected]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.actionLog]);

  if (!gameState) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div className="spinner" />
      <p style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>Đang tải mèo nổ...</p>
    </div>
  );

  const isMyTurn = gameState.currentPlayerId === user?.id;
  const me = gameState.players?.find(p => p.id === user?.id);
  const others = gameState.players?.filter(p => p.id !== user?.id) || [];

  const handlePlayCard = (card, index) => {
    if (!isMyTurn) return;
    if (selectedCards?.includes(index)) {
      setSelectedCards(selectedCards.filter(i => i !== index));
      return;
    }
    if (selectedCards?.length > 0) {
      setSelectedCards([...selectedCards, index]);
      return;
    }
    if (['ATTACK', 'FAVOR'].includes(card)) {
      setTargetAction({ card, type: card });
      toast('Chọn mục tiêu!', { icon: '🎯' });
    } else {
      send(`/app/game/${roomId}/kittens/play`, { cardTypes: [card] });
    }
  };

  const handleComboPlay = () => {
    const cards = selectedCards?.map(i => myHand[i]) || [];
    if (cards.length === 2 && cards[0] === cards[1]) {
      setTargetAction({ card: 'COMBO2', type: 'COMBO2' });
    } else if (cards.length === 3 && cards[0] === cards[1] && cards[1] === cards[2]) {
      setTargetAction({ card: 'COMBO3', type: 'COMBO3' });
    } else if (cards.length === 5 && new Set(cards).size === 5) {
      setTargetAction({ card: 'COMBO5', type: 'COMBO5' });
    } else {
      toast.error("Combo không hợp lệ!");
      setSelectedCards([]);
    }
  };

  const handleDraw = () => {
    if (!isMyTurn || gameState.phase !== 'PLAYER_TURN') return;
    send(`/app/game/${roomId}/kittens/draw`, {});
  };

  const handleTarget = (targetId) => {
    if (targetAction) {
      const cards = selectedCards?.length > 0 ? selectedCards.map(i => myHand[i]) : [targetAction.card];
      send(`/app/game/${roomId}/kittens/play`, { 
        cardTypes: cards, 
        targetId,
        requestedCard: requestedCard 
      });
      setTargetAction(null);
      setSelectedCards([]);
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
    <div className="page" style={{ 
      height: '100vh', display: 'flex', flexDirection: 'column', 
      background: 'linear-gradient(135deg, #2c3e50 0%, #000000 100%)',
      overflow: 'hidden', position: 'relative'
    }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("/assets/kittens_bg.png")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15, pointerEvents: 'none' }} />
      <Navbar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: 24, position: 'relative', zIndex: 1 }}>
        
        {/* Opponents Row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          {others.map(p => (
            <motion.div key={p.id} 
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className={`player-seat ${gameState.currentPlayerId === p.id ? 'active-turn' : ''} ${p.exploded ? 'eliminated' : ''}`}
              onClick={() => handleTarget(p.id)}
              style={{ 
                cursor: targetAction ? 'pointer' : 'default',
                width: 160, minHeight: 180, background: 'rgba(255,255,255,0.9)',
                border: targetAction ? '4px solid var(--accent-red)' : (gameState.currentPlayerId === p.id ? '4px solid var(--accent-gold)' : 'none')
              }}
            >
              <div style={{ position: 'relative' }}>
                <img src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`} alt={p.username} className="player-avatar" style={{ width: 64, height: 64 }} />
                {p.exploded && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,0,0,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>💥</div>}
              </div>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <div style={{ fontWeight: 900, fontSize: '1rem' }}>{p.username}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 800 }}>🎴 {p.handCount} {t('game.cards.title')}</div>
              </div>
              {p.exploded && <span className="badge badge-red" style={{ marginTop: 8 }}>ELIMINATED</span>}
            </motion.div>
          ))}
        </div>

        {/* Board Center */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          
          <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
            {/* Draw Pile */}
            <motion.div 
              whileHover={{ scale: isMyTurn ? 1.05 : 1 }}
              className={`pile ${isMyTurn ? 'pulse-gold' : ''}`} 
              onClick={handleDraw}
              style={{ 
                width: 130, height: 190, background: '#1a1a1a', border: '4px solid white', borderRadius: 16,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: isMyTurn ? 'pointer' : 'default', position: 'relative', boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{ fontWeight: 900, color: 'white', transform: 'rotate(-90deg)', fontSize: '1.4rem', letterSpacing: 4 }}>KITTENS</div>
              <div style={{ position: 'absolute', bottom: -40, width: '100%', textAlign: 'center', color: 'white', fontWeight: 900, fontSize: '1.2rem' }}>
                {gameState.drawPileCount}
              </div>
              {isMyTurn && <div style={{ position: 'absolute', top: -30, background: 'var(--accent-gold)', color: 'black', padding: '4px 12px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 900 }}>RÚT BÀI</div>}
            </motion.div>

            {/* Discard Pile */}
            <div style={{ width: 130, height: 190, borderRadius: 16, border: '4px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <AnimatePresence mode="wait">
                {gameState.discardTop ? (
                  <motion.div 
                    key={gameState.discardTop}
                    initial={{ scale: 0.5, opacity: 0, rotate: 15 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    className="kittens-card"
                    style={{ 
                      width: '100%', height: '100%', background: CARD_COLORS[gameState.discardTop], 
                      margin: 0, border: '4px solid white', position: 'absolute'
                    }}
                  >
                    <div className="card-art-container" style={{ background: 'rgba(0,0,0,0.1)' }}>
                      <div className="card-art" style={{
                        backgroundImage: `url(${KITTENS_IMAGES[gameState.discardTop] || ''})`,
                        backgroundSize: gameState.discardTop?.startsWith('CAT_') ? '400% 100%' : 'cover',
                        backgroundPosition: CAT_POSITIONS[gameState.discardTop] || 'center'
                      }} />
                    </div>
                    <div className="card-label" style={{ fontSize: '0.6rem', padding: '4px 0', fontWeight: 900 }}>{t(`game.kittens.cards.${gameState.discardTop}`)}</div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 320 }}>
            {/* Action Log Floating */}
            <div className="card" style={{ 
              maxHeight: 350, background: 'rgba(255,255,255,0.95)', 
              backdropFilter: 'blur(10px)', borderRadius: 24, padding: 20,
              display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xl)'
            }}>
              <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>📜 {t('game.actionLog')}</h4>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {gameState.actionLog.slice(-15).map((log, i) => {
                  const text = typeof log === 'string' ? log : t(`game.kittens.logs.${log.key.replace('kittens.logs.', '')}`, {
                    ...log.params,
                    card: log.params?.card ? t(`game.kittens.cards.${log.params.card}`) : ''
                  });
                  return (
                    <div key={i} style={{ 
                      padding: '8px 12px', background: '#f0f4f8', borderRadius: 10, 
                      fontSize: '0.85rem', fontWeight: 700, borderLeft: '4px solid var(--accent-primary)' 
                    }}>
                      {text}
                    </div>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            </div>

            {/* Chat Box Mini */}
            <ChatBox roomId={roomId} />
          </div>
        </div>

        {/* Modals for Action Responses */}
        <AnimatePresence>
          {gameState.phase === 'EXPLODING' && isMyTurn && (
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="defuse-modal" style={{ borderRadius: 40, padding: 48 }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>🙀</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-red)' }}>{t('game.kittens.logs.exploded', { player: 'BẠN' })}</h2>
              <p style={{ fontWeight: 800, marginBottom: 32 }}>Sử dụng Gỡ Bom để quay lại cuộc chơi!</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <button onClick={() => handleDefuse(0)} className="btn btn-primary" style={{ padding: '16px' }}>Đầu bộ bài</button>
                <button onClick={() => handleDefuse(Math.floor(Math.random() * gameState.drawPileCount))} className="btn btn-ghost" style={{ padding: '16px' }}>Ngẫu nhiên</button>
                <button onClick={() => handleDefuse(gameState.drawPileCount)} className="btn btn-ghost" style={{ padding: '16px' }}>Cuối bộ bài</button>
              </div>
            </motion.div>
          )}

          {gameState.futureCards?.length > 0 && isMyTurn && (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="future-modal" style={{ borderRadius: 40, width: 'auto', padding: 40 }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 24 }}>🔮 {t('game.kittens.cards.SEE_THE_FUTURE')}</h3>
              <div style={{ display: 'flex', gap: 16 }}>
                {gameState.futureCards.map((card, i) => (
                  <div key={i} className="kittens-card" style={{ background: CARD_COLORS[card], width: 100, height: 140, border: '4px solid white' }}>
                    <div className="card-art-container">
                      <div className="card-art" style={{
                        backgroundImage: `url(${KITTENS_IMAGES[card] || ''})`,
                        backgroundSize: card?.startsWith('CAT_') ? '400% 100%' : 'cover',
                        backgroundPosition: CAT_POSITIONS[card] || 'center'
                      }} />
                    </div>
                    <div className="card-label" style={{ fontSize: '0.6rem', fontWeight: 900 }}>{t(`game.kittens.cards.${card}`)}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ marginTop: 32, width: '100%' }} onClick={handleCloseFuture}>Xong</button>
            </motion.div>
          )}

          {gameState.phase === 'AWAITING_FAVOR' && gameState.favorTargetId === user?.id && (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="favor-modal" style={{ borderRadius: 40, width: 600 }}>
              <h3 style={{ fontWeight: 900 }}>🎁 {t('game.kittens.logs.favor', { player: gameState.players.find(p => p.id === gameState.favorRequesterId)?.username, target: 'bạn' })}</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 24 }}>
                {myHand.map((card, idx) => (
                  <div key={idx} className="kittens-card" style={{ background: CARD_COLORS[card], width: 80, height: 120 }} onClick={() => handleGiveCard(card)}>
                    <div className="card-art-container">
                      <div className="card-art" style={{
                        backgroundImage: `url(${KITTENS_IMAGES[card] || ''})`,
                        backgroundSize: card?.startsWith('CAT_') ? '400% 100%' : 'cover',
                        backgroundPosition: CAT_POSITIONS[card] || 'center'
                      }} />
                    </div>
                    <div className="card-label" style={{ fontSize: '0.5rem', fontWeight: 900 }}>{t(`game.kittens.cards.${card}`)}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Hand Area */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', 
          borderRadius: 40, padding: '24px 40px', border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', gap: 32
        }}>
          <div style={{ flex: 1, display: 'flex', gap: 12, overflowX: 'auto', padding: '20px 0', minHeight: 180 }}>
            <AnimatePresence>
              {myHand.map((card, idx) => (
                <motion.div 
                  key={`${card}-${idx}`}
                  layout initial={{ scale: 0, x: 50 }} animate={{ scale: 1, x: 0 }}
                  whileHover={{ y: -40, scale: 1.1, zIndex: 10 }}
                  className="kittens-card"
                  style={{ 
                    background: CARD_COLORS[card], width: 110, height: 160, 
                    border: selectedCards.includes(idx) ? '6px solid var(--accent-gold)' : '4px solid white',
                    boxShadow: selectedCards.includes(idx) ? '0 0 20px var(--accent-gold)' : '0 10px 20px rgba(0,0,0,0.2)'
                  }}
                  onClick={() => handlePlayCard(card, idx)}
                >
                  <div className="card-art-container">
                    <div className="card-art" style={{
                      backgroundImage: `url(${KITTENS_IMAGES[card] || ''})`,
                      backgroundSize: card?.startsWith('CAT_') ? '400% 100%' : 'cover',
                      backgroundPosition: CAT_POSITIONS[card] || 'center'
                    }} />
                  </div>
                  <div className="card-label" style={{ fontSize: '0.75rem', fontWeight: 900 }}>{t(`game.kittens.cards.${card}`)}</div>
                  {selectedCards.includes(idx) && (
                    <div style={{ position: 'absolute', top: 10, right: 10, background: 'var(--accent-gold)', color: 'black', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>✓</div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div className={`turn-indicator ${isMyTurn ? 'my-turn' : ''}`} style={{ fontSize: '1.2rem', padding: '12px 24px', width: '100%' }}>
              {isMyTurn ? t('game.yourTurn') : `Đợi ${gameState.players.find(p => p.id === gameState.currentPlayerId)?.username}...`}
            </div>
            {selectedCards.length > 0 && (
              <button className="btn btn-primary" onClick={handleComboPlay} style={{ width: '100%', padding: '16px' }}>
                🔥 COMBO ({selectedCards.length} lá)
              </button>
            )}
            {gameState.turnsLeft > 1 && (
              <div style={{ background: 'var(--accent-red)', color: 'white', padding: '8px 20px', borderRadius: 99, fontWeight: 900, fontSize: '0.9rem' }}>
                🧨 CÒN {gameState.turnsLeft} LƯỢT!
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameState.phase === 'GAME_OVER' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-over-overlay" style={{ zIndex: 10000 }}>
            <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} className="game-over-card" style={{ padding: 60, borderRadius: 60, pointerEvents: 'auto' }}>
              <div style={{ fontSize: '6rem', marginBottom: 20 }}>🏆</div>
              <h1 className="display-font" style={{ fontSize: '3.5rem', marginBottom: 24 }}>{t('game.gameOver')}</h1>
              <div style={{ padding: '24px 48px', background: '#fff9c4', borderRadius: 32, border: '6px solid #fbc02d', marginBottom: 40 }}>
                <div style={{ fontWeight: 900, fontSize: '2rem' }}>{gameState.players?.find(p => p.id === gameState.winnerId)?.username}</div>
                <div style={{ color: '#f57f17', fontWeight: 800, marginTop: 8 }}>CHIẾN THẮNG!</div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <button onClick={() => navigate(`/room/${roomId}`)} className="btn btn-primary" style={{ padding: '18px 40px' }}>{t('game.replay')}</button>
                <button onClick={() => navigate('/lobby')} className="btn btn-ghost" style={{ padding: '18px 40px' }}>{t('game.returnLobby')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .player-seat {
            padding: 16px;
            border-radius: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-shadow: var(--shadow-lg);
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .player-seat.active-turn {
            animation: pulse-border 1.5s infinite;
        }
        .player-seat.eliminated {
            filter: grayscale(1);
            opacity: 0.6;
        }
        .kittens-card {
            border-radius: 16px;
            padding: 4px;
            display: flex;
            flex-direction: column;
            transition: all 0.2s ease-out;
            position: relative;
        }
        .card-art-container {
            flex: 1;
            border-radius: 12px 12px 4px 4px;
            overflow: hidden;
            background: white;
            position: relative;
        }
        .card-art {
            width: 100%;
            height: 100%;
        }
        .card-label {
            text-align: center;
            color: white;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .pulse-gold {
            animation: pulse-gold-glow 2s infinite;
        }
        @keyframes pulse-gold-glow {
            0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(255, 215, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
        }
      `}</style>
    </div>
  );
}
