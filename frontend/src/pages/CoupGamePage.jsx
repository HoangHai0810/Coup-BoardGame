import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import TurnTimer from '../components/TurnTimer';

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

export default function CoupGamePage() {
  const { roomId }          = useParams();
  const { user }            = useAuth();
  const { subscribe, send, connected } = useSocket();
  const navigate            = useNavigate();
  const { t }               = useTranslation();

  const [gameState, setGameState] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [targetAction, setTargetAction] = useState(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    const unsub1 = subscribe(`/topic/game/${roomId}`, state => {
      setGameState(state);
      if (state.phase === 'PLAYER_TURN') {
        setSelectedTarget(null);
        setTargetAction(null);
      }
    });
    const unsub2 = subscribe(`/topic/game/${roomId}/private/${user?.id}`, data => {
      setMyCards(data.cards);
    });
    
    if (connected) {
      send(`/app/game/${roomId}/connect`, {});
    }
    
    return () => { unsub1(); unsub2(); };
  }, [roomId, user?.id, subscribe, send, connected]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [gameState?.actionLog]);

  const sendAction = useCallback((action, targetId = null) => {
    send(`/app/game/${roomId}/action`, { action, targetId });
  }, [roomId, send]);

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
      setSelectedTarget(playerId);
      sendAction(targetAction, playerId);
      setTargetAction(null);
      setSelectedTarget(null);
    }
  };

  const handleChallenge  = () => send(`/app/game/${roomId}/challenge`, {});
  const handleAllow      = () => send(`/app/game/${roomId}/allow`, {});
  const handleBlock      = (card) => send(`/app/game/${roomId}/block`, { card });
  const handleChooseCard = (cardType) => send(`/app/game/${roomId}/choose-card`, { card: cardType });
  const handleExchange   = (keepCards) => send(`/app/game/${roomId}/exchange`, { keepCards });
  
  const handleLeave = async () => {
    try {
      await api.post(`/rooms/${roomId}/leave`);
    } catch (err) {}
    navigate('/lobby');
  };

  if (!gameState) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{t('game.loadingGame', 'Đang tải game...')}</p>
      </div>
    );
  }

  const me = gameState.players?.find(p => p.id === user?.id);
  const isMyTurn = gameState.currentPlayerId === user?.id;
  const pendingAction = gameState.pendingAction;
  const isResponding = gameState.phase === 'AWAITING_RESPONSES' || gameState.phase === 'AWAITING_BLOCK_RESPONSE';
  const needToLoseCard = gameState.phase === 'AWAITING_CARD_LOSS' && gameState.cardLossPlayerId === user?.id;
  const needExchange = gameState.phase === 'AWAITING_EXCHANGE' && pendingAction?.actorId === user?.id;
  const others = gameState.players?.filter(p => p.id !== user?.id) || [];

  return (
    <div className="page" style={{ 
      height: '100vh', display: 'flex', flexDirection: 'column', 
      background: 'var(--bg-base)', overflow: 'hidden' 
    }}>
      <Navbar />
      
      {/* Main Game Layout */}
      <div style={{ 
        flex: 1, display: 'flex', flexDirection: 'column', 
        padding: '20px 40px', gap: 20, minHeight: 0 
      }}>
        
        {/* TOP: OTHER PLAYERS */}
        <div className="opponents-row" style={{ 
          display: 'flex', gap: 20, justifyContent: 'center', 
          height: '180px', flexShrink: 0 
        }}>
          <AnimatePresence>
            {others.map((p, i) => (
              <motion.div key={p.id}
                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className={`player-seat ${gameState.currentPlayerId === p.id ? 'active-turn' : ''} ${p.eliminated ? 'eliminated' : ''}`}
                style={{
                  cursor: targetAction && !p.eliminated ? 'pointer' : 'default',
                  border: targetAction && !p.eliminated ? '4px solid var(--accent-red)' : '3px solid transparent',
                  background: 'white',
                  width: 160,
                  padding: '12px',
                  borderRadius: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onClick={() => !p.eliminated && targetAction && handleTargetSelect(p.id)}
              >
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <img src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`}
                       alt={p.username} className="player-avatar" style={{ width: 50, height: 50 }} />
                  {p.isAI && (
                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--text-primary)', color: 'white', padding: '2px 4px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 900 }}>🤖</div>
                  )}
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: 4, width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.username}
                </span>
                <div className="coin-display" style={{ padding: '2px 10px', fontSize: '0.85rem', marginBottom: 8, borderRadius: 12 }}>
                  <span className="coin-icon" style={{ width: 14, height: 14 }} />
                  {p.coins}
                </div>
                
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', width: '100%' }}>
                  {Array.from({ length: p.influenceCount }).map((_, i) => (
                    <div key={i} className="coup-card face-down"
                      style={{ width: 30, height: 45, borderRadius: 6, borderWidth: 2 }} />
                  ))}
                   {p.revealedCards?.map((c, i) => (
                    <div key={`rev-${i}`} className={`coup-card ${CARD_CLASS[c]} revealed`}
                      style={{ width: 35, height: 50, borderRadius: 6, borderWidth: 2, padding: 0 }}>
                      <div className="card-art-container" style={{ borderRadius: '4px 4px 0 0' }}>
                        <div className="card-art" style={{
                          backgroundImage: `url(${CARD_IMAGES[c]})`,
                          backgroundSize: 'cover'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* MIDDLE: ACTION AREA & SIDEBARS */}
        <div className="game-grid-layout">
          
          {/* LEFT: MY STATUS */}
          <div className="game-left-col" style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
            <motion.div 
              className={`player-seat ${isMyTurn ? 'active-turn' : ''}`} 
              style={{ padding: '24px', background: 'white', borderRadius: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div style={{ position: 'relative' }}>
                <img src={me?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username}`}
                     alt={user?.username} className="player-avatar" style={{ width: 100, height: 100 }} />
                <div className="badge badge-gold" style={{ position: 'absolute', bottom: 5, right: 5, fontSize: '0.8rem' }}>{t('game.you')}</div>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: 12 }}>{user?.username}</h2>
              <div className="coin-display" style={{ fontSize: '1.6rem', padding: '10px 30px', marginTop: 16 }}>
                <span className="coin-icon" style={{ width: 28, height: 28 }} />
                {me?.coins ?? 0}
              </div>
            </motion.div>

            {/* MY CARDS - Optimized height */}
            <div className="card" style={{ flex: 1, padding: '20px', background: 'white', borderRadius: 32, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 16, textAlign: 'center' }}>🃏 {t('game.cards.title')}</h3>
              <div style={{ flex: 1, display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
                {myCards.map((card, i) => (
                  <motion.div key={`${card.type}-${i}`}
                    whileHover={(!needToLoseCard || card.revealed) ? { scale: 1.05, y: -5 } : {}}
                    className={`coup-card ${CARD_CLASS[card.type]} ${card.revealed ? 'revealed' : ''}`}
                    style={{ 
                      cursor: (needToLoseCard && !card.revealed) ? 'pointer' : 'default',
                      width: 110, height: 165,
                      outline: needToLoseCard && !card.revealed ? '6px solid var(--accent-red)' : 'none',
                    }}
                    onClick={() => needToLoseCard && !card.revealed && handleChooseCard(card.type)}
                  >
                    <div className="card-art-container" style={{ borderRadius: '12px 12px 0 0' }}>
                      <div className="card-art" style={{ backgroundImage: `url(${CARD_IMAGES[card.type]})`, backgroundSize: 'cover' }} />
                    </div>
                    <div className="card-label" style={{ fontSize: '0.8rem', padding: '6px 0', fontWeight: 900 }}>{t(`game.cards.${card.type}`)}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: GAMEPLAY BOARD */}
          <div className="game-center-col" style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
            <TurnTimer 
              currentPlayerId={gameState.currentPlayerId} 
              currentPlayerName={gameState.players?.find(p => p.id === gameState.currentPlayerId)?.username || ''}
              currentUserId={user?.id}
              isActive={gameState.phase !== 'GAME_OVER'}
            />
            
            {/* Status Indicator */}
            <div style={{ height: '100px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AnimatePresence mode='wait'>
                {pendingAction ? (
                  <motion.div 
                    key="pending" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                    style={{ padding: '16px 32px', background: 'white', borderRadius: 24, border: '4px solid #fbc02d', boxShadow: 'var(--shadow-md)', width: '100%' }}
                  >
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}>
                      <span style={{ color: 'var(--accent-primary)' }}>{gameState.players?.find(p => p.id === pendingAction.actorId)?.username}</span>
                      {' '}{actionDescription(pendingAction, gameState, t)}
                    </div>
                  </motion.div>
                ) : targetAction ? (
                  <motion.div 
                    key="target-hint" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    style={{ padding: '16px 32px', background: '#fff3f3', border: '4px solid #ffcdd2', borderRadius: 24, width: '100%', textAlign: 'center' }}
                  >
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#b71c1c' }}>
                      {t('game.targetSelectHint', { action: t(`game.actions.${targetAction.toLowerCase()}`) || targetAction })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Main Interaction Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <AnimatePresence mode='wait'>
                {isMyTurn && gameState.phase === 'PLAYER_TURN' && !me?.eliminated && (
                  <motion.div key="action-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100%' }}>
                    <ActionPanel me={me} onAction={handleAction} t={t} />
                  </motion.div>
                )}

                {isResponding && pendingAction && !me?.eliminated &&
                  !gameState.pendingAction?.respondedPlayerIds?.includes(user?.id) && (
                  <motion.div key="response-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100%' }}>
                    <ResponsePanel
                      pendingAction={pendingAction} players={gameState.players} userId={user?.id}
                      phase={gameState.phase} onChallenge={handleChallenge} onBlock={handleBlock} onAllow={handleAllow} t={t}
                    />
                  </motion.div>
                )}

                {needExchange && pendingAction && (
                  <motion.div key="exchange-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100%' }}>
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
          <div className="game-right-col" style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
             <div className="card" style={{ flex: 1, background: 'white', borderRadius: 32, padding: '24px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>📜 {t('game.actionLog')}</h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {gameState.actionLog?.slice(-20).map((log, i) => {
                    const isNewest = i === (gameState.actionLog.slice(-20).length - 1);
                    return (
                      <div key={i} style={{ 
                        padding: '10px 14px', borderRadius: 12, 
                        background: isNewest ? '#fff9c4' : '#f8fafc',
                        fontSize: '0.85rem', fontWeight: 700 
                      }}>
                        {typeof log === 'string' ? log : t(log.key, { ...log.params, card: log.params?.card ? t(`game.cards.${log.params.card}`) : '' })}
                      </div>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-over-overlay" style={{ zIndex: 1000 }}>
            <div className="game-over-card" style={{ padding: 40, borderRadius: 40 }}>
              <div style={{ fontSize: '4rem' }}>👑</div>
              <h1 style={{ fontSize: '2.5rem' }}>{t('game.gameOver')}</h1>
              <div style={{ padding: '20px 40px', background: '#fff9c4', borderRadius: 24, border: '4px solid #fbc02d', margin: '24px 0' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>{gameState.players?.find(p => p.id === gameState.winnerId)?.username}</h2>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <button onClick={() => navigate(`/room/${roomId}`)} className="btn btn-primary">{t('game.replay')}</button>
                <button onClick={() => navigate('/lobby')} className="btn btn-ghost">{t('game.returnLobby')}</button>
              </div>
            </div>
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
    { key: 'INCOME', label: t('game.actions.income'), cls: 'income', disabled: mustCoup },
    { key: 'FOREIGN_AID', label: t('game.actions.foreign_aid'), cls: '', disabled: mustCoup },
    { key: 'TAX', label: t('game.actions.tax'), cls: 'tax', disabled: mustCoup },
    { key: 'STEAL', label: t('game.actions.steal'), cls: 'steal', disabled: mustCoup },
    { key: 'ASSASSINATE', label: t('game.actions.assassinate'), cls: 'assassinate', disabled: mustCoup || coins < 3 },
    { key: 'EXCHANGE', label: t('game.actions.exchange'), cls: '', disabled: mustCoup },
    { key: 'COUP', label: t('game.actions.coup'), cls: 'coup-action', disabled: coins < 7 },
  ];

  return (
    <div style={{ background: 'white', borderRadius: 32, border: '4px solid #e0e6ed', padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>⚡ {t('game.actionPanel')}</h3>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {actions.map(a => (
          <button key={a.key} className={`action-btn ${a.cls}`} disabled={a.disabled}
            style={{ padding: '12px', borderRadius: 16, fontSize: '1rem', height: '100%' }}
            onClick={() => onAction(a.key)}
          >
            {a.label}
          </button>
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

  // The actor must wait during action phase, but CAN respond during block phase.
  // The blocker must wait during block phase.
  if ((isActor && !isBlockPhase) || (isBlockPhase && isBlocker)) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDir: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: 32, border: '4px dashed #ddd' }}>
        <div className="spinner" style={{ width: 32, height: 32, marginBottom: 16 }} />
        <p style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>{t('game.waitingOthers')}</p>
      </div>
    );
  }

  const blockCards = { FOREIGN_AID: ['DUKE'], ASSASSINATE: ['CONTESSA'], STEAL: ['CAPTAIN', 'AMBASSADOR'] };
  const canBlock = !isBlockPhase && pendingAction.targetId === userId && blockCards[pendingAction.actionType];

  return (
    <div style={{ height: '100%', padding: 32, background: 'white', borderRadius: 32, border: '4px solid ' + (isBlockPhase ? 'var(--accent-blue)' : 'var(--accent-orange)'), display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h3 style={{ fontSize: '1.3rem', marginBottom: 20, color: isBlockPhase ? 'var(--accent-blue)' : 'var(--accent-orange)' }}>
        {isBlockPhase ? '🛡️ ' + t('game.challengeTitle') : '🎭 ' + t('game.responsePanel')}
      </h3>
      <p style={{ fontWeight: 800, marginBottom: 32, fontSize: '1.1rem' }}>
        {isBlockPhase
          ? <span><b>{blocker?.username}</b> {t('game.logs.block_claim', { player: '', card: t(`game.cards.${pendingAction.blockingCard}`) }).trim()}</span>
          : <span><b>{actor?.username}</b> {actionDescription(pendingAction, { players }, t)}</span>}
      </p>
      <div style={{ display: 'flex', gap: 16 }}>
        {isChallengeableAction(isBlockPhase ? 'BLOCK' : pendingAction.actionType) && (
          <button className="btn btn-danger" style={{ flex: 1, padding: 16 }} onClick={onChallenge}>⚔️ {t('game.challengeBtn')}</button>
        )}
        {canBlock && blockCards[pendingAction.actionType].map(card => (
          <button key={card} className="btn btn-blue" style={{ flex: 1, padding: 16 }} onClick={() => onBlock(card)}>🛡️ {t(`game.cards.${card}`)}</button>
        ))}
        <button className="btn btn-ghost" style={{ flex: 1, padding: 16, border: '2px solid #eee' }} onClick={onAllow}>✅ {t('game.allowBtn')}</button>
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
    <div style={{ background: 'white', borderRadius: 32, border: '4px solid var(--accent-primary)', padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: 12 }}>🤝 {t('game.exchangeTitle')} ({selected.length}/{keepCount})</h3>
      <div style={{ flex: 1, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
        {allCards.map((card, idx) => (
          <div key={`${card}_${idx}`} className={`coup-card ${CARD_CLASS[card]}`}
            style={{ width: 90, height: 135, cursor: 'pointer', outline: selected.includes(`${card}_${idx}`) ? '4px solid var(--accent-primary)' : 'none' }}
            onClick={() => toggle(card, idx)}
          >
            <div className="card-art-container"><div className="card-art" style={{ backgroundImage: `url(${CARD_IMAGES[card]})`, backgroundSize: 'cover' }} /></div>
            <div className="card-label" style={{ fontSize: '0.7rem' }}>{t(`game.cards.${card}`)}</div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: '100%', padding: 16, marginTop: 16 }} disabled={selected.length !== keepCount} onClick={() => onConfirm(selected.map(k => k.split('_')[0]))}>
        {t('game.confirm')}
      </button>
    </div>
  );
}

function actionDescription(pa, state, t) {
  const target = state?.players?.find(p => p.id === pa.targetId);
  const map = {
    INCOME: t('game.actions.income'), FOREIGN_AID: t('game.actions.foreign_aid'),
    TAX: t('game.logs.tax_claim', { player: '' }).trim(),
    STEAL: t('game.logs.steal_claim', { player: '', target: target?.username || '' }).trim(),
    ASSASSINATE: t('game.logs.assassinate_claim', { player: '', target: target?.username || '' }).trim(),
    EXCHANGE: t('game.logs.exchange_claim', { player: '' }).trim(),
    COUP: t('game.logs.coup', { player: '', target: target?.username || '' }).trim()
  };
  return map[pa.actionType] || pa.actionType;
}

function isChallengeableAction(action) {
  return ['TAX', 'ASSASSINATE', 'STEAL', 'EXCHANGE', 'BLOCK'].includes(action);
}
