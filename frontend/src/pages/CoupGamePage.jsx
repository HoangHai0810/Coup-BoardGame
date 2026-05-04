import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CARD_EMOJIS = {
  DUKE: '👑', ASSASSIN: '🗡️', CAPTAIN: '⚓', AMBASSADOR: '🤝', CONTESSA: '💎'
};
const CARD_CLASS = {
  DUKE: 'duke', ASSASSIN: 'assassin', CAPTAIN: 'captain', AMBASSADOR: 'ambassador', CONTESSA: 'contessa'
};

export default function CoupGamePage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { send, subscribe } = useSocket();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [gameState, setGameState] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [targetAction, setTargetAction] = useState(null);

  useEffect(() => {
    const unsub1 = subscribe(`/topic/game/${roomId}`, state => {
      setGameState(state);
      if (state.phase === 'PLAYER_TURN') {
        setSelectedTarget(null);
        setTargetAction(null);
      }
    });
    const unsub2 = subscribe(`/user/queue/private`, data => {
      if (data.playerId === user?.id) {
        setMyCards(data.cards);
      }
    });
    return () => { unsub1(); unsub2(); };
  }, [roomId, user?.id, subscribe]);

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

  const handleChallenge = () => send(`/app/game/${roomId}/challenge`, {});
  const handleAllow = () => send(`/app/game/${roomId}/allow`, {});
  const handleBlock = (card) => send(`/app/game/${roomId}/block`, { card });
  const handleChooseCard = (cardType) => send(`/app/game/${roomId}/choose-card`, { card: cardType });
  const handleExchange = (keepCards) => send(`/app/game/${roomId}/exchange`, { keepCards });
  
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
        <p style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Đang tải game...</p>
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 24px', borderBottom: '3px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'white'
      }}>
        <span className="display-font" style={{ color: 'var(--accent-primary)', fontSize: '1.4rem', fontWeight: 900 }}>
          ♟ Coup
        </span>
        <span className="badge badge-gold" style={{ fontFamily: 'monospace', letterSpacing: '0.1em', fontSize: '1rem' }}>
          #{roomId}
        </span>
        <button onClick={handleLeave} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
          ← {t('room.leave')}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: 20, maxWidth: 1200, margin: '0 auto', width: '100%' }}>

        {/* Other players */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <AnimatePresence>
            {others.map((p, i) => (
              <motion.div key={p.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: i * 0.1 }}
                className={`player-seat ${gameState.currentPlayerId === p.id ? 'active-turn' : ''} ${p.eliminated ? 'eliminated' : ''}`}
                style={{
                  cursor: targetAction && !p.eliminated ? 'pointer' : 'default',
                  border: targetAction && !p.eliminated ? '4px solid var(--accent-red)' : undefined,
                  animation: targetAction && !p.eliminated ? 'pulse-border 1s infinite' : undefined
                }}
                onClick={() => !p.eliminated && targetAction && handleTargetSelect(p.id)}
              >
                <img src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`}
                     alt={p.username} className="player-avatar" />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, textAlign: 'center', maxWidth: 100, wordBreak: 'break-word', color: 'var(--text-primary)' }}>
                  {p.username}
                  {p.isAI && <span style={{ color: 'var(--text-muted)' }}> 🤖</span>}
                </span>
                <div className="coin-display">
                  <span className="coin-icon" />
                  {p.coins}
                </div>
                {/* Card count */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {Array.from({ length: p.influenceCount }).map((_, i) => (
                    <motion.div key={i} className="coup-card face-down"
                      initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ delay: 0.2 }}
                      style={{ width: 36, height: 50, borderRadius: 8, flexShrink: 0, borderWidth: 2 }} />
                  ))}
                  {p.revealedCards?.map((c, i) => (
                    <div key={`rev-${i}`} className={`coup-card ${CARD_CLASS[c]} revealed`}
                      style={{ width: 36, height: 50, borderRadius: 8, fontSize: '0.8rem', flexShrink: 0, borderWidth: 2 }}>
                      {CARD_EMOJIS[c]}
                    </div>
                  ))}
                </div>
                {p.eliminated && <span className="badge badge-red" style={{ marginTop: 4 }}>{t('game.eliminated')}</span>}
                {gameState.currentPlayerId === p.id && !p.eliminated && (
                  <span className="badge badge-gold" style={{ marginTop: 4 }}>▶ Lượt</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Main content row */}
        <div style={{ display: 'flex', gap: 20, flex: 1, flexWrap: 'wrap' }}>

          {/* Left: My seat + cards */}
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            style={{ flex: '1 1 300px', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <div className={`player-seat ${isMyTurn ? 'active-turn' : ''}`} style={{ width: '100%', alignItems: 'center', background: 'white', boxShadow: 'var(--shadow-md)' }}>
              <img src={me?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username}`}
                   alt={user?.username} className="player-avatar" style={{ width: 90, height: 90, border: isMyTurn ? '5px solid var(--accent-primary)' : '3px solid var(--border)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {user?.username}
                </span>
                <span className="badge badge-gold" style={{ fontSize: '0.7rem', fontWeight: 900 }}>BẠN</span>
              </div>
              <div className="coin-display" style={{ fontSize: '1.4rem', padding: '10px 24px', background: 'var(--bg-base)', border: '2px solid var(--border-gold)' }}>
                <span className="coin-icon" style={{ width: 28, height: 28 }} />
                {me?.coins ?? 0}
              </div>
              {isMyTurn && <span className="badge badge-gold" style={{ animation: 'pulse-border 1s infinite', fontSize: '0.9rem', marginTop: 8 }}>⚡ ĐẾN LƯỢT BẠN</span>}
            </div>

            {/* My cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                🃏 BÀI CỦA BẠN
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <AnimatePresence>
                  {myCards.length > 0 ? (
                    myCards.map((card, i) => (
                      <motion.div key={`${card.type}-${i}`}
                        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        whileHover={(!needToLoseCard || card.revealed) ? { scale: 1.05 } : { y: -10, rotate: -2 }}
                        className={`coup-card ${CARD_CLASS[card.type] || ''} ${card.revealed ? 'revealed' : ''}`}
                        style={{ 
                          cursor: (needToLoseCard && !card.revealed) ? 'pointer' : 'default',
                          width: 110, height: 160,
                          outline: needToLoseCard && !card.revealed ? '5px solid var(--accent-red)' : 'none',
                          boxShadow: card.revealed ? 'none' : '0 10px 20px rgba(0,0,0,0.1)',
                        }}
                        onClick={() => needToLoseCard && !card.revealed && handleChooseCard(card.type)}
                      >
                        <span style={{ fontSize: '2.5rem' }}>{CARD_EMOJIS[card.type]}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 900, textAlign: 'center' }}>{card.type}</span>
                        {card.revealed && <span className="badge badge-red" style={{ fontSize: '0.6rem', position: 'absolute', bottom: 10 }}>ĐÃ LẬT</span>}
                        {needToLoseCard && !card.revealed && (
                          <div style={{ position: 'absolute', top: -10, right: -10, background: 'var(--accent-red)', color: 'white', padding: '4px 8px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 900, boxShadow: 'var(--shadow-sm)' }}>CHỌN</div>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>
                      Đang đợi nhận bài...
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {needToLoseCard && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ textAlign: 'center', color: 'white', background: 'var(--accent-red)', padding: '16px', borderRadius: 'var(--radius-lg)', fontWeight: 900, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
              >
                ⚠️ CHỌN 1 LÁ BÀI ĐỂ BỎ!
              </motion.div>
            )}
          </motion.div>

          {/* Center: Action log + panels */}
          <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

            {/* Pending action status */}
            {pendingAction && (
              <motion.div 
                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                style={{
                  padding: '16px 20px',
                  background: '#fff8e1',
                  border: '4px solid #ffca28',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#f57f17'
                }}>
                <span style={{ color: 'var(--text-primary)' }}>{gameState.players?.find(p => p.id === pendingAction.actorId)?.username}</span>
                {' '}{actionDescription(pendingAction, gameState, t)}
                {pendingAction.blocked && (
                  <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>
                    — Bị chặn bởi {gameState.players?.find(p => p.id === pendingAction.blockerId)?.username}!
                  </span>
                )}
              </motion.div>
            )}

            {/* ── ACTION PANELS ── */}

            {/* My turn actions */}
            <AnimatePresence mode='wait'>
              {isMyTurn && gameState.phase === 'PLAYER_TURN' && !me?.eliminated && (
                <motion.div key="action-panel" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                  <ActionPanel me={me} onAction={handleAction} t={t} />
                </motion.div>
              )}

              {/* Response panel: Challenge or Block */}
              {isResponding && pendingAction && pendingAction.actorId !== user?.id && !me?.eliminated &&
                !gameState.pendingAction?.respondedPlayerIds?.includes(user?.id) && (
                <motion.div key="response-panel" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                  <ResponsePanel
                    pendingAction={pendingAction} players={gameState.players} userId={user?.id}
                    phase={gameState.phase} onChallenge={handleChallenge} onBlock={handleBlock} onAllow={handleAllow} t={t}
                  />
                </motion.div>
              )}

              {/* Exchange panel */}
              {needExchange && pendingAction && (
                <motion.div key="exchange-panel" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                  <ExchangePanel
                    myCards={myCards.filter(c => !c.revealed).map(c => c.type)}
                    drawnCards={[pendingAction.drawnCard1, pendingAction.drawnCard2].filter(Boolean)}
                    onConfirm={handleExchange} t={t}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Target selection hint */}
            {targetAction && (
              <motion.div 
                initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                style={{
                  padding: '16px 20px', textAlign: 'center',
                  background: '#ffebee', borderRadius: 'var(--radius-lg)',
                  border: '4px solid #ffcdd2',
                  color: 'var(--accent-red)', fontWeight: 800,
                  fontSize: '1rem'
                }}>
                🎯 Chọn mục tiêu cho <span style={{ color: '#b71c1c' }}>{targetAction}</span> — click vào avatar bên trên
                <button className="btn btn-ghost" style={{ marginLeft: 16, padding: '6px 16px', fontSize: '0.8rem' }}
                  onClick={() => setTargetAction(null)}>Hủy</button>
              </motion.div>
            )}

            {/* Action log */}
            <div className="action-log" style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>📜 {t('game.actionLog')}</div>
              {gameState.actionLog?.map((log, i) => (
                <div key={i} className="action-log-entry" style={{ padding: '8px 0', borderBottom: '2px dashed var(--border)' }}>{log}</div>
              ))}
              {gameState.actionLog?.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Game bắt đầu...</div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameState.phase === 'GAME_OVER' && (
          <motion.div className="game-over-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="game-over-card"
              initial={{ scale: 0.5, y: 100 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', bounce: 0.5 }}
            >
              <div style={{ fontSize: '5rem', marginBottom: 16 }}>
                {gameState.winnerId === user?.id ? '🏆' : '💀'}
              </div>
              <h2 className="display-font" style={{
                fontSize: '3rem', marginBottom: 16, fontWeight: 900,
                color: gameState.winnerId === user?.id ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}>
                {gameState.winnerId === user?.id ? t('game.winner') : t('game.gameOver')}
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '1.2rem', fontWeight: 800 }}>
                {gameState.winnerId === user?.id
                  ? '🎉 Bạn là người sống sót cuối cùng!'
                  : `🏆 ${gameState.players?.find(p => p.id === gameState.winnerId)?.username} đã chiến thắng!`}
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button onClick={() => navigate(`/room/${roomId}`)} className="btn btn-primary" style={{ padding: '16px 32px' }}>
                  🔄 Chơi lại
                </button>
                <button onClick={() => navigate('/lobby')} className="btn btn-ghost" style={{ padding: '16px 32px' }}>
                  ← {t('game.returnLobby')}
                </button>
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
    { key: 'INCOME', label: '💰 Income', desc: t('game.actions.income'), cls: 'income', disabled: mustCoup },
    { key: 'FOREIGN_AID', label: '🏛 Foreign Aid', desc: t('game.actions.foreign_aid'), cls: '', disabled: mustCoup },
    { key: 'TAX', label: '👑 Tax', desc: t('game.actions.tax'), cls: 'tax', disabled: mustCoup },
    { key: 'STEAL', label: '⚓ Steal', desc: t('game.actions.steal'), cls: 'steal', disabled: mustCoup },
    { key: 'ASSASSINATE', label: '🗡 Assassinate', desc: t('game.actions.assassinate'), cls: 'assassinate', disabled: mustCoup || coins < 3 },
    { key: 'EXCHANGE', label: '🤝 Exchange', desc: t('game.actions.exchange'), cls: '', disabled: mustCoup },
    { key: 'COUP', label: '💥 Coup', desc: t('game.actions.coup'), cls: 'coup-action', disabled: coins < 7 },
  ];

  return (
    <div className="action-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: '1.2rem' }}>{t('game.actionPanel')}</h3>
        {mustCoup && <span className="badge badge-red">Phải Đảo chính!</span>}
      </div>
      <div className="action-grid">
        {actions.map(a => (
          <button key={a.key}
            className={`action-btn ${a.cls}`}
            disabled={a.disabled}
            onClick={() => !a.disabled && onAction(a.key)}
          >
            <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{a.label}</div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.8rem' }}>{a.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResponsePanel({ pendingAction, players, userId, phase, onChallenge, onBlock, onAllow, t }) {
  const actor = players?.find(p => p.id === pendingAction.actorId);
  const isBlockPhase = phase === 'AWAITING_BLOCK_RESPONSE';
  const isTarget = pendingAction.targetId === userId;

  const blockCards = {
    FOREIGN_AID: ['DUKE'],
    ASSASSINATE: ['CONTESSA'],
    STEAL: ['CAPTAIN', 'AMBASSADOR']
  };
  const canBlock = !isBlockPhase && isTarget && blockCards[pendingAction.actionType];

  return (
    <div className={`response-panel ${isBlockPhase ? 'block-challenge' : ''}`}>
      <p style={{ fontWeight: 800, marginBottom: 20, fontSize: '1.1rem', color: isBlockPhase ? '#1976d2' : '#e65100' }}>
        {isBlockPhase
          ? `🛡 ${players?.find(p => p.id === pendingAction.blockerId)?.username} chặn — thách thức không?`
          : `🎭 ${actor?.username} ${actionDescription(pendingAction, { players }, t)}`}
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {!isBlockPhase && isChallengeableAction(pendingAction.actionType) && (
          <button className="btn btn-danger" onClick={onChallenge}>
            {t('game.challengeBtn')}
          </button>
        )}

        {canBlock && blockCards[pendingAction.actionType].map(card => (
          <button key={card} className="btn btn-blue" onClick={() => onBlock(card)}>
            {t('game.blockBtn', { card })}
          </button>
        ))}

        <button className="btn btn-ghost" onClick={onAllow}>
          {t('game.allowBtn')}
        </button>
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
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleConfirm = () => {
    if (selected.length !== keepCount) {
      toast.error(`Chọn ${keepCount} lá để giữ`);
      return;
    }
    const keepCardTypes = selected.map(k => k.split('_')[0]);
    onConfirm(keepCardTypes);
  };

  return (
    <div className="action-panel">
      <h3 style={{ fontSize: '1.2rem', marginBottom: 12 }}>{t('game.exchangeTitle')}</h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20, fontWeight: 700 }}>
        {t('game.exchangeDesc', { count: keepCount })}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {allCards.map((card, idx) => {
          const key = `${card}_${idx}`;
          const isSelected = selected.includes(key);
          return (
            <div key={key}
              className={`coup-card ${CARD_CLASS[card] || ''}`}
              style={{
                cursor: 'pointer',
                outline: isSelected ? '4px solid var(--accent-primary)' : '4px solid transparent',
                transform: isSelected ? 'translateY(-10px) rotate(2deg)' : undefined,
                opacity: drawnCards.includes(card) && idx >= myCards.length ? undefined : undefined
              }}
              onClick={() => toggle(card, idx)}
            >
              <span style={{ fontSize: '1.6rem' }}>{CARD_EMOJIS[card]}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>{card}</span>
              {idx >= myCards.length && <span className="badge badge-green" style={{ fontSize: '0.6rem', marginTop: 4 }}>NEW</span>}
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary"
        disabled={selected.length !== keepCount}
        onClick={handleConfirm}>
        {t('game.confirm')} ({selected.length}/{keepCount})
      </button>
    </div>
  );
}

// Helpers
function actionDescription(pa, state, t) {
  const target = state?.players?.find(p => p.id === pa.targetId);
  const targetName = target?.username ? ` → ${target.username}` : '';
  const map = {
    INCOME: '💰 Income (+1)', FOREIGN_AID: '🏛 Foreign Aid (+2)',
    TAX: '👑 claim Duke (+3)', STEAL: `⚓ claim Captain${targetName}`,
    ASSASSINATE: `🗡 claim Assassin${targetName}`, EXCHANGE: '🤝 claim Ambassador',
    COUP: `💥 Coup${targetName}`
  };
  return map[pa.actionType] || pa.actionType;
}

function isChallengeableAction(action) {
  return ['TAX', 'ASSASSINATE', 'STEAL', 'EXCHANGE'].includes(action);
}
