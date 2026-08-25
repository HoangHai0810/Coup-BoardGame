import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import TurnTimer from '../components/TurnTimer';
import { playGameSound } from '../services/gameAudio';

const CARD_IMAGES = {
  DUKE: '/assets/coup_duke_card_1777970293754.png',
  ASSASSIN: '/assets/coup_assassin_card_single_1777970882549.png',
  CAPTAIN: '/assets/coup_captain_card_single_retry_1777971535119.png',
  AMBASSADOR: '/assets/coup_ambassador_card_single_1777971641716.png',
  CONTESSA: '/assets/coup_contessa_card_single_1777971721011.png'
};

const CARD_CLASS = {
  DUKE: 'duke', ASSASSIN: 'assassin', CAPTAIN: 'captain', AMBASSADOR: 'ambassador', CONTESSA: 'contessa'
};

const CARD_THEMES = {
  DUKE: { color: 'var(--duke-color, #9333ea)', glow: 'rgba(147,51,234,0.4)', icon: '👑' },
  ASSASSIN: { color: 'var(--assassin-color, #1e293b)', glow: 'rgba(30,41,59,0.4)', icon: '🗡️' },
  CAPTAIN: { color: 'var(--captain-color, #0284c7)', glow: 'rgba(2,132,199,0.4)', icon: '⚓' },
  AMBASSADOR: { color: 'var(--ambassador-color, #16a34a)', glow: 'rgba(22,163,74,0.4)', icon: '📜' },
  CONTESSA: { color: 'var(--contessa-color, #dc2626)', glow: 'rgba(220,38,38,0.4)', icon: '🛡️' }
};

const PREVIEW_COUP_USER = { id: 'preview-me', username: 'Bạn' };
const PREVIEW_COUP_STATE = {
  phase: 'PLAYER_TURN', currentPlayerId: 'preview-me', pendingAction: null, actionLog: ['Ván Coup bắt đầu. Đến lượt của Bạn.'],
  players: [
    { id: 'preview-me', username: 'Bạn', coins: 3, influenceCount: 2, revealedCards: [], eliminated: false, isAI: false },
    { id: 'p2', username: 'Roberta', coins: 2, influenceCount: 2, revealedCards: [], eliminated: false, isAI: true },
    { id: 'p3', username: 'Magnus', coins: 5, influenceCount: 2, revealedCards: [], eliminated: false, isAI: true },
    { id: 'p4', username: 'Isabella', coins: 1, influenceCount: 2, revealedCards: [], eliminated: false, isAI: true }
  ]
};
const PREVIEW_COUP_CARDS = [{ type: 'DUKE', revealed: false }, { type: 'CAPTAIN', revealed: false }];

export default function CoupGamePage({ preview = false }) {
  const { roomId }          = useParams();
  const { user }            = useAuth();
  const { subscribe, send, connected } = useSocket();
  const navigate            = useNavigate();
  const { t }               = useTranslation();
  const currentUser         = preview ? PREVIEW_COUP_USER : user;

  const [gameState, setGameState] = useState(preview ? PREVIEW_COUP_STATE : null);
  const [myCards, setMyCards] = useState(preview ? PREVIEW_COUP_CARDS : []);
  const [targetAction, setTargetAction] = useState(null);
  const logEndRef = useRef(null);
  const soundLogRef = useRef(0);

  useEffect(() => {
    if (preview) return undefined;
    const unsub1 = subscribe(`/topic/game/${roomId}`, state => {
      setGameState(state);
      if (state.phase === 'PLAYER_TURN') {
        setTargetAction(null);
      }
    });
    const unsub2 = subscribe(`/topic/game/${roomId}/private/${currentUser?.id}`, data => {
      setMyCards(data.cards);
    });
    
    if (connected) {
      send(`/app/game/${roomId}/connect`, {});
    }
    
    return () => { unsub1(); unsub2(); };
  }, [roomId, currentUser?.id, subscribe, send, connected, preview]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const length = gameState?.actionLog?.length || 0;
    if (soundLogRef.current && length > soundLogRef.current) playGameSound('action');
    soundLogRef.current = length;
  }, [gameState?.actionLog]);

  const sendAction = useCallback((action, targetId = null) => {
    if (preview) {
      setGameState(current => ({ ...current, actionLog: [...current.actionLog, `Bạn thực hiện ${action}${targetId ? ' vào mục tiêu đã chọn' : ''}.`] }));
      return;
    }
    send(`/app/game/${roomId}/action`, { action, targetId });
  }, [roomId, send, preview]);

  const handleAction = (action) => {
    if (['STEAL', 'ASSASSINATE', 'COUP'].includes(action)) {
      setTargetAction(action);
      toast('Chọn người chơi để nhắm vào!', { icon: '🎯' });
    } else {
      sendAction(action);
    }
  };

  const handleTargetSelect = (playerId) => {
    if (targetAction) {
      sendAction(targetAction, playerId);
      setTargetAction(null);
    }
  };

  const handleChallenge  = () => send(`/app/game/${roomId}/challenge`, {});
  const handleAllow      = () => send(`/app/game/${roomId}/allow`, {});
  const handleBlock      = (card) => send(`/app/game/${roomId}/block`, { card });
  const handleChooseCard = (cardType) => send(`/app/game/${roomId}/choose-card`, { card: cardType });
  const handleExchange   = (keepCards) => send(`/app/game/${roomId}/exchange`, { keepCards });
  
  if (!gameState) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, background: 'var(--bg-base)' }}>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: 50, height: 50, border: '4px solid rgba(139,92,246,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}
        />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 800 }}>{t('game.loadingGame', 'Đang tải game...')}</p>
      </div>
    );
  }

  const me = gameState.players?.find(p => p.id === currentUser?.id);
  const isMyTurn = gameState.currentPlayerId === currentUser?.id;
  const pendingAction = gameState.pendingAction;
  const isResponding = gameState.phase === 'AWAITING_RESPONSES' || gameState.phase === 'AWAITING_BLOCK_RESPONSE';
  const needToLoseCard = gameState.phase === 'AWAITING_CARD_LOSS' && gameState.cardLossPlayerId === currentUser?.id;
  const needExchange = gameState.phase === 'AWAITING_EXCHANGE' && pendingAction?.actorId === currentUser?.id;
  const others = gameState.players?.filter(p => p.id !== currentUser?.id) || [];

  return (
    <div className="page coup-game-page" style={{
      height: '100vh', display: 'flex', flexDirection: 'column', 
      background: 'var(--bg-base)', overflow: 'hidden', position: 'relative' 
    }}>
      <button className="game-back-btn" onClick={() => navigate('/lobby')}><span>←</span> Trở về</button>
      {/* Background Neon Effects */}
      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: isMyTurn ? 'var(--accent-primary)' : 'transparent', opacity: 0.05, filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none', transition: 'all 0.5s ease' }} />

      <Navbar />
      
      {/* Main Game Layout */}
      <div className="coup-arena" style={{
        flex: 1, display: 'flex', flexDirection: 'column', 
        padding: '20px 40px', gap: 20, minHeight: 0, position: 'relative', zIndex: 2
      }}>
        
        {/* TOP: OTHER PLAYERS */}
        <div className="opponents-row" style={{ 
          display: 'flex', gap: 20, justifyContent: 'center', 
          height: '180px', flexShrink: 0 
        }}>
          <AnimatePresence>
            {others.map((p) => {
              const isCurrentTurn = gameState.currentPlayerId === p.id;
              const isTargetSelectable = targetAction && !p.eliminated;
              return (
                <motion.div key={p.id}
                  initial={{ y: -30, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }}
                  whileHover={isTargetSelectable ? { scale: 1.05, y: -5, boxShadow: '0 0 25px rgba(239,68,68,0.5)' } : { scale: 1.02 }}
                  className={`player-seat glass ${isCurrentTurn ? 'active-turn' : ''} ${p.eliminated ? 'eliminated' : ''}`}
                  style={{
                    cursor: isTargetSelectable ? 'pointer' : 'default',
                    border: isTargetSelectable ? '3px solid var(--accent-red)' : (isCurrentTurn ? '2px solid var(--accent-gold)' : '1px solid var(--border)'),
                    background: isCurrentTurn ? 'rgba(245,158,11,0.03)' : 'var(--bg-card)',
                    width: 160,
                    padding: '12px',
                    borderRadius: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isCurrentTurn ? 'var(--shadow-glow-gold)' : 'var(--shadow-sm)',
                    position: 'relative'
                  }}
                  onClick={() => !p.eliminated && targetAction && handleTargetSelect(p.id)}
                >
                  {isCurrentTurn && (
                    <div style={{ position: 'absolute', top: 6, right: 10, fontSize: '0.65rem', color: 'var(--accent-gold)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-gold)', animation: 'pulse-radar 1s infinite' }} />
                      TURN
                    </div>
                  )}

                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    <img 
                      src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`}
                      alt={p.username} 
                      className="player-avatar" 
                      style={{ 
                        width: 52, 
                        height: 52, 
                        border: isCurrentTurn ? '2px solid var(--accent-gold)' : '2px solid var(--border)' 
                      }} 
                    />
                    {p.isAI && (
                      <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--accent-cyan)', color: 'black', padding: '2px 6px', borderRadius: 6, fontSize: '0.55rem', fontWeight: 900 }}>AI</div>
                    )}
                    {p.eliminated && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>💀</div>
                    )}
                  </div>
                  
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: 4, width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                    {p.username}
                  </span>
                  
                  <div className="coin-display" style={{ padding: '3px 12px', fontSize: '0.8rem', marginBottom: 8, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <span className="coin-icon" style={{ width: 12, height: 12 }} />
                    <span style={{ fontWeight: 800, color: 'var(--accent-gold)' }}>{p.coins}</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', width: '100%', minHeight: 45 }}>
                    {Array.from({ length: p.influenceCount }).map((_, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="coup-card face-down"
                        style={{ width: 28, height: 42, borderRadius: 6, borderWidth: 1.5, background: 'linear-gradient(135deg, #1e293b, #0f172a)' }} 
                      />
                    ))}
                    {p.revealedCards?.map((c, i) => (
                      <motion.div 
                        key={`rev-${i}`} 
                        initial={{ rotateY: 180, scale: 0.8 }}
                        animate={{ rotateY: 0, scale: 1 }}
                        className={`coup-card ${CARD_CLASS[c]} revealed`}
                        style={{ width: 32, height: 48, borderRadius: 6, borderWidth: 1.5, padding: 0, border: `1.5px solid ${CARD_THEMES[c]?.color}` }}
                      >
                        <div className="card-art-container" style={{ borderRadius: '4px 4px 0 0' }}>
                          <div className="card-art" style={{
                            backgroundImage: `url(${CARD_IMAGES[c]})`,
                            backgroundSize: 'cover'
                          }} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* MIDDLE: ACTION AREA & SIDEBARS */}
        <div className="game-grid-layout">
          
          {/* LEFT: MY STATUS */}
          <div className="game-left-col" style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
            <motion.div 
              className={`player-seat glass ${isMyTurn ? 'active-turn' : ''}`} 
              style={{ 
                padding: '24px', 
                background: 'var(--bg-card)', 
                border: isMyTurn ? '2px solid var(--accent-primary)' : '1px solid var(--border)', 
                borderRadius: 32, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                boxShadow: isMyTurn ? 'var(--shadow-glow)' : 'var(--shadow-sm)'
              }}
            >
              <div style={{ position: 'relative' }}>
                <img 
                  src={me?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser?.username}`}
                  alt={currentUser?.username}
                  className="player-avatar" 
                  style={{ width: 90, height: 90, border: isMyTurn ? '3px solid var(--accent-primary)' : '2px solid var(--border)' }} 
                />
                <div className="badge badge-gold" style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '0.7rem', padding: '4px 10px' }}>{t('game.you', 'BẠN')}</div>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: 12, color: 'var(--text-primary)' }}>{currentUser?.username}</h2>
              
              <motion.div 
                animate={me?.coins >= 10 ? { scale: [1, 1.05, 1], filter: 'drop-shadow(0 0 10px var(--accent-gold))' } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
                className="coin-display" 
                style={{ fontSize: '1.4rem', padding: '8px 24px', marginTop: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 20 }}
              >
                <span className="coin-icon" style={{ width: 24, height: 24 }} />
                <span style={{ color: 'var(--accent-gold)', marginLeft: 8, fontWeight: 900 }}>{me?.coins ?? 0}</span>
              </motion.div>
            </motion.div>

            {/* MY CARDS */}
            <div className="card glass" style={{ flex: 1, padding: '20px', background: 'var(--bg-card)', borderRadius: 32, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: 16, textAlign: 'center', fontWeight: 800 }}>🃏 {t('game.cards.title', 'BÀI CỦA BẠN')}</h3>
              <div style={{ flex: 1, display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center' }}>
                <AnimatePresence>
                  {myCards.map((card, i) => {
                    const theme = CARD_THEMES[card.type] || { color: '#ccc', glow: 'transparent', icon: '❓' };
                    const selectable = needToLoseCard && !card.revealed;
                    return (
                      <motion.div key={`${card.type}-${i}`}
                        initial={{ scale: 0, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, y: -30 }}
                        whileHover={(!card.revealed) ? { 
                          scale: 1.08, 
                          y: -10, 
                          boxShadow: `0 15px 30px ${theme.glow}` 
                        } : {}}
                        className={`coup-card ${CARD_CLASS[card.type]} ${card.revealed ? 'revealed' : ''}`}
                        style={{ 
                          cursor: selectable ? 'pointer' : 'default',
                          width: 100, 
                          height: 150,
                          border: selectable ? '3px solid var(--accent-red)' : (card.revealed ? `2px solid ${theme.color}` : '3px solid white'),
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onClick={() => selectable && handleChooseCard(card.type)}
                      >
                        {selectable && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.1)', zIndex: 5 }} />
                        )}
                        <div className="card-art-container" style={{ borderRadius: '10px 10px 0 0' }}>
                          <div className="card-art" style={{ backgroundImage: `url(${CARD_IMAGES[card.type]})`, backgroundSize: 'cover' }} />
                        </div>
                        <div className="card-label" style={{ 
                          fontSize: '0.75rem', 
                          padding: '6px 0', 
                          fontWeight: 900, 
                          background: card.revealed ? 'rgba(0,0,0,0.5)' : theme.color,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}>
                          <span>{theme.icon}</span>
                          <span>{t(`game.cards.${card.type}`)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* CENTER: GAMEPLAY BOARD */}
          <div className="game-center-col" style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
            <TurnTimer 
              currentPlayerId={gameState.currentPlayerId} 
              currentPlayerName={gameState.players?.find(p => p.id === gameState.currentPlayerId)?.username || ''}
              currentUserId={currentUser?.id}
              isActive={gameState.phase !== 'GAME_OVER'}
            />
            
            {/* Status Indicator */}
            <div style={{ height: '90px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AnimatePresence mode='wait'>
                {pendingAction ? (
                  <motion.div 
                    key="pending" 
                    initial={{ y: -20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    exit={{ y: 20, opacity: 0 }}
                    style={{ 
                      padding: '16px 24px', 
                      background: 'var(--bg-glass)', 
                      borderRadius: 24, 
                      border: '2px solid var(--accent-gold)', 
                      boxShadow: '0 0 15px rgba(245,158,11,0.15)', 
                      width: '100%' 
                    }}
                  >
                    <div style={{ fontSize: '1rem', fontWeight: 800, textAlign: 'center', color: 'var(--text-primary)' }}>
                      <span style={{ color: 'var(--accent-gold)' }}>
                        {gameState.players?.find(p => p.id === pendingAction.actorId)?.username}
                      </span>
                      {' '}{actionDescription(pendingAction, gameState, t)}
                    </div>
                  </motion.div>
                ) : targetAction ? (
                  <motion.div 
                    key="target-hint" 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ 
                      padding: '16px 24px', 
                      background: 'rgba(239,68,68,0.08)', 
                      border: '2px solid var(--accent-red)', 
                      borderRadius: 24, 
                      width: '100%', 
                      textAlign: 'center' 
                    }}
                  >
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--accent-red)' }}>
                      🎯 {t('game.targetSelectHint', { action: t(`game.actions.${targetAction.toLowerCase()}`) || targetAction })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Main Interaction Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <AnimatePresence mode='wait'>
                {isMyTurn && gameState.phase === 'PLAYER_TURN' && !me?.eliminated && (
                  <motion.div 
                    key="action-panel" 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.98 }} 
                    style={{ height: '100%' }}
                  >
                    <ActionPanel me={me} onAction={handleAction} t={t} />
                  </motion.div>
                )}

                {isResponding && pendingAction && !me?.eliminated &&
                  !gameState.pendingAction?.respondedPlayerIds?.includes(currentUser?.id) && (
                  <motion.div 
                    key="response-panel" 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.98 }} 
                    style={{ height: '100%' }}
                  >
                    <ResponsePanel
                      pendingAction={pendingAction} players={gameState.players} userId={currentUser?.id}
                      phase={gameState.phase} onChallenge={handleChallenge} onBlock={handleBlock} onAllow={handleAllow} t={t}
                    />
                  </motion.div>
                )}

                {needExchange && pendingAction && (
                  <motion.div 
                    key="exchange-panel" 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.98 }} 
                    style={{ height: '100%' }}
                  >
                    <ExchangePanel
                      myCards={myCards.filter(c => !c.revealed).map(c => c.type)}
                      drawnCards={[pendingAction.drawnCard1, pendingAction.drawnCard2].filter(Boolean)}
                      onConfirm={handleExchange} t={t}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT: LOG & CHAT */}
          <div className="game-right-col" style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
             <div className="card glass" style={{ flex: 1, background: 'var(--bg-card)', borderRadius: 32, padding: '20px', display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📜</span> {t('game.actionLog', 'LỊCH SỬ HÀNH ĐỘNG')}
                </h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                  {gameState.actionLog?.slice(-20).map((log, i) => {
                    const isNewest = i === (gameState.actionLog.slice(-20).length - 1);
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ 
                          padding: '10px 14px', 
                          borderRadius: 12, 
                          background: isNewest ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-input)',
                          border: isNewest ? '1px solid var(--accent-gold)' : '1px solid var(--border)',
                          fontSize: '0.82rem', 
                          fontWeight: 700,
                          color: isNewest ? 'var(--accent-gold)' : 'var(--text-secondary)'
                        }}
                      >
                        {typeof log === 'string' ? log : t(log.key, { ...log.params, card: log.params?.card ? t(`game.cards.${log.params.card}`) : '' })}
                      </motion.div>
                    );
                  })}
                  <div ref={logEndRef} />
                </div>
              </div>
              <ChatBox roomId={roomId} />
          </div>

        </div>
      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameState.phase === 'GAME_OVER' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="game-over-overlay" 
            style={{ zIndex: 1000, background: 'rgba(6,8,16,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 30 }} 
              className="game-over-card glass" 
              style={{ padding: 40, borderRadius: 40, background: 'var(--bg-surface)', border: '1px solid var(--accent-gold)', width: 450, textAlign: 'center', boxShadow: 'var(--shadow-glow-gold)' }}
            >
              <div style={{ fontSize: '4.5rem', animation: 'float 3s ease-in-out infinite' }}>👑</div>
              <h1 className="display-font" style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginTop: 12 }}>{t('game.gameOver', 'TRÒ CHƠI KẾT THÚC')}</h1>
              
              <div style={{ padding: '24px 40px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 24, border: '2px solid var(--accent-gold)', margin: '24px 0' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--accent-gold)', fontWeight: 800, marginBottom: 6 }}>Chiến thắng</div>
                <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>
                  {gameState.players?.find(p => p.id === gameState.winnerId)?.username}
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
                  {t('game.replay', 'Chơi Lại')}
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileActive={{ scale: 0.95 }}
                  onClick={() => navigate('/lobby')} 
                  className="btn btn-ghost"
                  style={{ padding: '14px 28px', borderRadius: 16, border: '1px solid var(--border)', fontWeight: 800 }}
                >
                  {t('game.returnLobby', 'Về Sảnh')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───

function ActionPanel({ me, onAction, t }) {
  const coins = me?.coins ?? 0;
  const mustCoup = coins >= 10;
  
  const actions = [
    { key: 'INCOME', label: t('game.actions.income', 'Lấy 1 Xu'), cls: 'income', desc: '+1 xu (không thể bị chặn)', disabled: mustCoup },
    { key: 'FOREIGN_AID', label: t('game.actions.foreign_aid', 'Viện Trợ'), cls: 'aid', desc: '+2 xu (chặn bởi Duke)', disabled: mustCoup },
    { key: 'TAX', label: t('game.actions.tax', 'Thu Thuế'), cls: 'tax', desc: '+3 xu (Duke, chặn viện trợ)', disabled: mustCoup },
    { key: 'STEAL', label: t('game.actions.steal', 'Cướp Đoạt'), cls: 'steal', desc: 'Lấy 2 xu từ ng khác (Captain/Ambassador)', disabled: mustCoup },
    { key: 'ASSASSINATE', label: t('game.actions.assassinate', 'Ám Sát'), cls: 'assassinate', desc: 'Mất 3 xu, giết 1 bài (chặn bởi Contessa)', disabled: mustCoup || coins < 3 },
    { key: 'EXCHANGE', label: t('game.actions.exchange', 'Đổi Bài'), cls: 'exchange', desc: 'Rút 2 bài mới từ xấp và đổi bài cũ', disabled: mustCoup },
    { key: 'COUP', label: t('game.actions.coup', 'Đảo Chính'), cls: 'coup-action', desc: 'Mất 7 xu, tiêu diệt 1 bài lập tức', disabled: coins < 7 },
  ];

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 32, border: '1px solid var(--border)', padding: 20, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>⚡</span> {t('game.actionPanel', 'BẢNG HÀNH ĐỘNG')}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {actions.map(a => (
          <motion.button 
            key={a.key} 
            whileHover={!a.disabled ? { scale: 1.02, y: -2 } : {}}
            whileActive={!a.disabled ? { scale: 0.98 } : {}}
            className={`action-btn ${a.cls}`} 
            disabled={a.disabled}
            style={{ 
              padding: '10px 14px', 
              borderRadius: 16, 
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: a.disabled ? 'not-allowed' : 'pointer',
              height: 54,
              lineHeight: 1.2
            }}
            onClick={() => onAction(a.key)}
          >
            <strong style={{ display: 'block' }}>{a.label}</strong>
            <span style={{ fontSize: '0.62rem', opacity: 0.7, marginTop: 2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{a.desc}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ResponsePanel({ pendingAction, players, userId, phase, onChallenge, onBlock, onAllow, t }) {
  const actor = players?.find(p => p.id === pendingAction.actorId);
  const blocker = players?.find(p => p.id === pendingAction.blockerId);
  const isBlockPhase = phase === 'AWAITING_BLOCK_RESPONSE';
  const isActor = pendingAction.actorId === userId;
  const isBlocker = pendingAction.blockerId === userId;

  if ((isActor && !isBlockPhase) || (isBlockPhase && isBlocker)) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: 32, border: '2px dashed var(--border)', padding: 20 }}>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: 24, height: 24, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', marginBottom: 12 }}
        />
        <p style={{ fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('game.waitingOthers', 'Đang đợi người chơi khác phản hồi...')}</p>
      </div>
    );
  }

  const blockCards = { FOREIGN_AID: ['DUKE'], ASSASSINATE: ['CONTESSA'], STEAL: ['CAPTAIN', 'AMBASSADOR'] };
  const canBlock = !isBlockPhase && blockCards[pendingAction.actionType] &&
    (pendingAction.actionType === 'FOREIGN_AID' || pendingAction.targetId === userId);

  return (
    <div style={{ 
      height: '100%', 
      padding: 24, 
      background: 'var(--bg-card)', 
      borderRadius: 32, 
      border: '2px solid ' + (isBlockPhase ? 'var(--accent-blue)' : 'var(--accent-gold)'), 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center',
      boxShadow: isBlockPhase ? '0 0 15px rgba(59,130,246,0.15)' : '0 0 15px rgba(245,158,11,0.15)'
    }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: 12, color: isBlockPhase ? 'var(--accent-blue)' : 'var(--accent-gold)', fontWeight: 900 }}>
        {isBlockPhase ? '🛡️ ' + t('game.challengeTitle', 'Phản hồi Chống đỡ') : '🎭 ' + t('game.responsePanel', 'Phản hồi Hành động')}
      </h3>
      <p style={{ fontWeight: 800, marginBottom: 24, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {isBlockPhase
          ? <span><b>{blocker?.username}</b> {t('game.logs.block_claim', { player: '', card: t(`game.cards.${pendingAction.blockingCard}`) }).trim()}</span>
          : <span><b>{actor?.username}</b> {actionDescription(pendingAction, { players }, t)}</span>}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        {isChallengeableAction(isBlockPhase ? 'BLOCK' : pendingAction.actionType) && (
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileActive={{ scale: 0.97 }}
            className="btn btn-danger" 
            style={{ flex: 1, padding: '12px 6px', borderRadius: 14, fontSize: '0.9rem', fontWeight: 900 }} 
            onClick={onChallenge}
          >
            ⚔️ {t('game.challengeBtn', 'Nghi ngờ')}
          </motion.button>
        )}
        {canBlock && blockCards[pendingAction.actionType].map(card => (
          <motion.button 
            key={card} 
            whileHover={{ scale: 1.03 }}
            whileActive={{ scale: 0.97 }}
            className="btn btn-blue" 
            style={{ flex: 1, padding: '12px 6px', borderRadius: 14, fontSize: '0.9rem', fontWeight: 900 }} 
            onClick={() => onBlock(card)}
          >
            🛡️ Chặn = {t(`game.cards.${card}`)}
          </motion.button>
        ))}
        <motion.button 
          whileHover={{ scale: 1.03 }}
          whileActive={{ scale: 0.97 }}
          className="btn btn-ghost" 
          style={{ flex: 1, padding: '12px 6px', borderRadius: 14, border: '1px solid var(--border)', fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-secondary)' }} 
          onClick={onAllow}
        >
          ✅ {t('game.allowBtn', 'Cho qua')}
        </motion.button>
      </div>
    </div>
  );
}

function ExchangePanel({ myCards, drawnCards, onConfirm, t }) {
  const allCards = [...myCards, ...drawnCards];
  const keepCount = myCards.length;
  const [selected, setSelected] = useState([]);

  const toggle = (card, idx) => {
    const key = `${card}_${idx}`;
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 32, border: '2px solid var(--accent-primary)', padding: 20, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 800 }}>🤝 {t('game.exchangeTitle', 'Tráo đổi Bài')} ({selected.length}/{keepCount})</h3>
      <div style={{ flex: 1, display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
        {allCards.map((card, idx) => {
          const theme = CARD_THEMES[card] || { color: '#ccc', icon: '❓' };
          const isSelected = selected.includes(`${card}_${idx}`);
          return (
            <motion.div 
              key={`${card}_${idx}`} 
              whileHover={{ scale: 1.05 }}
              className={`coup-card ${CARD_CLASS[card]}`}
              style={{ 
                width: 80, 
                height: 120, 
                cursor: 'pointer', 
                border: isSelected ? '3px solid var(--accent-primary)' : '2px solid white',
                boxShadow: isSelected ? '0 0 15px rgba(109,40,217,0.3)' : 'none',
                position: 'relative'
              }}
              onClick={() => toggle(card, idx)}
            >
              <div className="card-art-container"><div className="card-art" style={{ backgroundImage: `url(${CARD_IMAGES[card]})`, backgroundSize: 'cover' }} /></div>
              <div className="card-label" style={{ fontSize: '0.65rem', padding: '4px 0', background: theme.color, color: '#fff', textAlign: 'center', fontWeight: 800 }}>
                {theme.icon} {t(`game.cards.${card}`)}
              </div>
            </motion.div>
          );
        })}
      </div>
      <motion.button 
        whileHover={selected.length === keepCount ? { scale: 1.02 } : {}}
        whileActive={selected.length === keepCount ? { scale: 0.98 } : {}}
        className="btn btn-primary" 
        style={{ width: '100%', padding: 14, marginTop: 12, borderRadius: 14, fontWeight: 900 }} 
        disabled={selected.length !== keepCount} 
        onClick={() => onConfirm(selected.map(k => k.split('_')[0]))}
      >
        {t('game.confirm', 'Xác Nhận')}
      </motion.button>
    </div>
  );
}

function actionDescription(pa, state, t) {
  const target = state?.players?.find(p => p.id === pa.targetId);
  const map = {
    INCOME: t('game.actions.income', 'Lấy 1 xu'), 
    FOREIGN_AID: t('game.actions.foreign_aid', 'yêu cầu Viện trợ'),
    TAX: t('game.logs.tax_claim', { player: 'khai báo làm Thuế' }).trim(),
    STEAL: t('game.logs.steal_claim', { player: 'yêu cầu Cướp đoạt từ', target: target?.username || '' }).trim(),
    ASSASSINATE: t('game.logs.assassinate_claim', { player: 'yêu cầu Ám sát', target: target?.username || '' }).trim(),
    EXCHANGE: t('game.logs.exchange_claim', { player: 'yêu cầu Đổi bài' }).trim(),
    COUP: t('game.logs.coup', { player: 'Đảo chính', target: target?.username || '' }).trim()
  };
  return map[pa.actionType] || pa.actionType;
}

function isChallengeableAction(action) {
  return ['TAX', 'ASSASSINATE', 'STEAL', 'EXCHANGE', 'BLOCK'].includes(action);
}
