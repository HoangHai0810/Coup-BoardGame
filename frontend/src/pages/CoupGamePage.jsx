import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

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

  const [gameState, setGameState] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [targetAction, setTargetAction] = useState(null); // action needing a target

  // Subscribe to game state broadcasts
  useEffect(() => {
    const unsub1 = subscribe(`/topic/game/${roomId}`, state => {
      setGameState(state);
      // Clear target selection when phase changes
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
  }, [roomId, user?.id]);

  const sendAction = useCallback((action, targetId = null) => {
    send(`/app/game/${roomId}/action`, { action, targetId });
  }, [roomId, send]);

  const handleAction = (action) => {
    if (['STEAL', 'ASSASSINATE', 'COUP'].includes(action)) {
      // Need target first
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

  const handleChooseCard = (cardType) => {
    send(`/app/game/${roomId}/choose-card`, { card: cardType });
  };

  const handleExchange = (keepCards) => {
    send(`/app/game/${roomId}/exchange`, { keepCards });
  };

  if (!gameState) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải game...</p>
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)',
      position: 'relative'
    }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(10,11,20,0.95)',
        backdropFilter: 'blur(20px)'
      }}>
        <span className="display-font" style={{ color: 'var(--accent-gold)', fontSize: '1.2rem' }}>
          ♟ Coup
        </span>
        <span className="badge badge-gold" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          {roomId}
        </span>
        <button onClick={() => navigate('/lobby')} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
          ← Rời game
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: 16, maxWidth: 1100, margin: '0 auto', width: '100%' }}>

        {/* Other players */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {others.map(p => (
            <div key={p.id}
              className={`player-seat ${gameState.currentPlayerId === p.id ? 'active-turn' : ''} ${p.eliminated ? 'eliminated' : ''}`}
              style={{
                cursor: targetAction && !p.eliminated ? 'pointer' : 'default',
                border: targetAction && !p.eliminated ? '2px solid var(--accent-red)' : undefined,
                animation: targetAction && !p.eliminated ? 'pulse-gold 1s infinite' : undefined
              }}
              onClick={() => !p.eliminated && targetAction && handleTargetSelect(p.id)}
            >
              <img src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`}
                   alt={p.username} className="player-avatar" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', maxWidth: 100, wordBreak: 'break-word' }}>
                {p.username}
                {p.isAI && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}> 🤖</span>}
              </span>
              <div className="coin-display" style={{ padding: '2px 10px', fontSize: '0.82rem' }}>
                <span className="coin-icon" style={{ width: 12, height: 12 }} />
                {p.coins}
              </div>
              {/* Card count */}
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: p.influenceCount }).map((_, i) => (
                  <div key={i} className="coup-card face-down"
                    style={{ width: 30, height: 42, borderRadius: 4, flexShrink: 0 }} />
                ))}
                {p.revealedCards?.map((c, i) => (
                  <div key={`rev-${i}`} className={`coup-card ${CARD_CLASS[c]} revealed`}
                    style={{ width: 30, height: 42, borderRadius: 4, fontSize: '0.6rem', flexShrink: 0 }}>
                    {CARD_EMOJIS[c]}
                  </div>
                ))}
              </div>
              {p.eliminated && <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)' }}>Loại</span>}
              {gameState.currentPlayerId === p.id && (
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)' }}>▶ Lượt</span>
              )}
            </div>
          ))}
        </div>

        {/* Main content row */}
        <div style={{ display: 'flex', gap: 16, flex: 1 }}>

          {/* Left: My seat + cards */}
          <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className={`player-seat ${isMyTurn ? 'active-turn' : ''}`} style={{ width: '100%' }}>
              <img src={me?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username}`}
                   alt={user?.username} className="player-avatar" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                {user?.username} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Bạn)</span>
              </span>
              <div className="coin-display">
                <span className="coin-icon" />
                {me?.coins ?? 0} xu
              </div>
              {isMyTurn && <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', animation: 'pulse-gold 1s infinite' }}>⚡ Lượt của bạn!</span>}
            </div>

            {/* My cards */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {myCards.map((card, i) => (
                <div key={i}
                  className={`coup-card ${CARD_CLASS[card.type] || ''} ${card.revealed ? 'revealed' : ''}`}
                  style={{ cursor: (needToLoseCard && !card.revealed) ? 'pointer' : 'default' }}
                  onClick={() => needToLoseCard && !card.revealed && handleChooseCard(card.type)}
                  title={card.revealed ? 'Lá bài đã mất' : card.type}
                >
                  <span style={{ fontSize: '1.6rem' }}>{CARD_EMOJIS[card.type]}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, textAlign: 'center' }}>{card.type}</span>
                  {card.revealed && <span style={{ fontSize: '0.6rem', color: 'var(--accent-red)' }}>REVEALED</span>}
                  {needToLoseCard && !card.revealed && (
                    <span style={{ fontSize: '0.6rem', color: 'var(--accent-red)', animation: 'pulse-gold 1s infinite' }}>CHỌN</span>
                  )}
                </div>
              ))}
            </div>

            {needToLoseCard && (
              <p style={{ textAlign: 'center', color: 'var(--accent-red)', fontSize: '0.85rem', fontWeight: 600 }}>
                ⚠️ Click vào lá bài bạn muốn mất!
              </p>
            )}
          </div>

          {/* Center: Action log + panels */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

            {/* Action log */}
            <div className="action-log">
              {gameState.actionLog?.map((log, i) => (
                <div key={i} className="action-log-entry">{log}</div>
              ))}
              {gameState.actionLog?.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Game bắt đầu...</div>
              )}
            </div>

            {/* Pending action status */}
            {pendingAction && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(245,200,66,0.06)',
                border: '1px solid var(--border-gold)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem'
              }}>
                <strong>{gameState.players?.find(p => p.id === pendingAction.actorId)?.username}</strong>
                {' '}{actionDescription(pendingAction, gameState)}
                {pendingAction.blocked && (
                  <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>
                    — Bị chặn bởi {gameState.players?.find(p => p.id === pendingAction.blockerId)?.username}!
                  </span>
                )}
              </div>
            )}

            {/* ── ACTION PANELS ── */}

            {/* My turn actions */}
            {isMyTurn && gameState.phase === 'PLAYER_TURN' && !me?.eliminated && (
              <ActionPanel
                me={me}
                players={gameState.players}
                userId={user?.id}
                targetAction={targetAction}
                onAction={handleAction}
              />
            )}

            {/* Response panel: Challenge or Block */}
            {isResponding && pendingAction && pendingAction.actorId !== user?.id && !me?.eliminated &&
              !gameState.pendingAction?.respondedPlayerIds?.includes(user?.id) && (
              <ResponsePanel
                pendingAction={pendingAction}
                players={gameState.players}
                userId={user?.id}
                phase={gameState.phase}
                onChallenge={handleChallenge}
                onBlock={handleBlock}
                onAllow={handleAllow}
              />
            )}

            {/* Exchange panel */}
            {needExchange && pendingAction && (
              <ExchangePanel
                myCards={myCards.filter(c => !c.revealed).map(c => c.type)}
                drawnCards={[pendingAction.drawnCard1, pendingAction.drawnCard2].filter(Boolean)}
                onConfirm={handleExchange}
              />
            )}

            {/* Target selection hint */}
            {targetAction && (
              <div style={{
                padding: '12px 16px', textAlign: 'center',
                background: 'rgba(232,64,64,0.08)', borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(232,64,64,0.3)',
                animation: 'pulse-gold 1s infinite',
                fontSize: '0.9rem'
              }}>
                🎯 Chọn mục tiêu cho <strong>{targetAction}</strong> — click vào người chơi bên trên
                <button className="btn btn-ghost" style={{ marginLeft: 12, padding: '4px 12px', fontSize: '0.8rem' }}
                  onClick={() => setTargetAction(null)}>Hủy</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Over Overlay */}
      {gameState.phase === 'GAME_OVER' && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>
              {gameState.winnerId === user?.id ? '🏆' : '💀'}
            </div>
            <h2 className="display-font" style={{
              fontSize: '2.5rem', marginBottom: 12,
              color: gameState.winnerId === user?.id ? 'var(--accent-gold)' : 'var(--text-secondary)'
            }}>
              {gameState.winnerId === user?.id ? 'Bạn Thắng!' : 'Game Over'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '1.1rem' }}>
              {gameState.winnerId === user?.id
                ? '🎉 Xuất sắc! Bạn là người sống sót cuối cùng!'
                : `🏆 ${gameState.players?.find(p => p.id === gameState.winnerId)?.username} đã chiến thắng!`}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => navigate(`/room/${roomId}`)} className="btn btn-primary" style={{ fontSize: '1rem', padding: '12px 24px' }}>
                🔄 Chơi lại
              </button>
              <button onClick={() => navigate('/lobby')} className="btn btn-ghost" style={{ fontSize: '1rem', padding: '12px 24px' }}>
                ← Về Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function ActionPanel({ me, players, userId, targetAction, onAction }) {
  const coins = me?.coins ?? 0;
  const mustCoup = coins >= 10;

  const actions = [
    { key: 'INCOME', label: '💰 Thu nhập', desc: '+1 xu', cls: 'income', disabled: mustCoup },
    { key: 'FOREIGN_AID', label: '🏛 Viện trợ', desc: '+2 xu (blockable)', cls: '', disabled: mustCoup },
    { key: 'TAX', label: '👑 Thu thuế', desc: '+3 xu (Duke)', cls: 'tax', disabled: mustCoup },
    { key: 'STEAL', label: '⚓ Ăn cắp', desc: '+2 xu từ người khác', cls: 'steal', disabled: mustCoup },
    { key: 'ASSASSINATE', label: '🗡 Ám sát', desc: '-3 xu, loại 1 lá', cls: 'assassinate', disabled: mustCoup || coins < 3 },
    { key: 'EXCHANGE', label: '🤝 Đổi bài', desc: 'Đổi bài với bộ bài', cls: '', disabled: mustCoup },
    { key: 'COUP', label: '💥 Đảo chính', desc: '-7 xu, loại 1 lá', cls: 'coup-action', disabled: coins < 7 },
  ];

  return (
    <div className="action-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: '0.95rem' }}>⚡ Lượt của bạn — chọn hành động</h3>
        {mustCoup && <span className="badge badge-red">Phải Đảo chính!</span>}
      </div>
      <div className="action-grid">
        {actions.map(a => (
          <button key={a.key}
            className={`action-btn ${a.cls}`}
            disabled={a.disabled}
            onClick={() => !a.disabled && onAction(a.key)}
          >
            <div>{a.label}</div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.75rem', marginTop: 2 }}>{a.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResponsePanel({ pendingAction, players, userId, phase, onChallenge, onBlock, onAllow }) {
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
      <p style={{ fontWeight: 600, marginBottom: 14, fontSize: '0.95rem' }}>
        {isBlockPhase
          ? `🛡 ${players?.find(p => p.id === pendingAction.blockerId)?.username} đang chặn — bạn có muốn thách thức không?`
          : `🎭 ${actor?.username} ${actionDescription(pendingAction, { players })} — phản ứng của bạn?`}
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {!isBlockPhase && isChallengeableAction(pendingAction.actionType) && (
          <button className="btn btn-danger" onClick={onChallenge} style={{ fontSize: '0.85rem' }}>
            ⚡ Thách thức! (Tôi không tin)
          </button>
        )}

        {canBlock && blockCards[pendingAction.actionType].map(card => (
          <button key={card} className="btn btn-blue" onClick={() => onBlock(card)} style={{ fontSize: '0.85rem' }}>
            🛡 Chặn bằng {card}
          </button>
        ))}

        <button className="btn btn-ghost" onClick={onAllow} style={{ fontSize: '0.85rem' }}>
          ✓ Cho phép
        </button>
      </div>
    </div>
  );
}

function ExchangePanel({ myCards, drawnCards, onConfirm }) {
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
      toast.error(`Chọn đúng ${keepCount} lá bài để giữ`);
      return;
    }
    const keepCardTypes = selected.map(k => k.split('_')[0]);
    onConfirm(keepCardTypes);
  };

  return (
    <div className="action-panel">
      <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>🤝 Chọn {keepCount} lá bài để giữ lại</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
        Bài hiện tại + 2 lá rút thêm: chọn {keepCount} lá muốn giữ
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {allCards.map((card, idx) => {
          const key = `${card}_${idx}`;
          const isSelected = selected.includes(key);
          return (
            <div key={key}
              className={`coup-card ${CARD_CLASS[card] || ''}`}
              style={{
                cursor: 'pointer',
                outline: isSelected ? '3px solid var(--accent-gold)' : '3px solid transparent',
                transform: isSelected ? 'translateY(-6px)' : undefined,
                opacity: drawnCards.includes(card) && idx >= myCards.length ? undefined : undefined
              }}
              onClick={() => toggle(card, idx)}
            >
              <span style={{ fontSize: '1.4rem' }}>{CARD_EMOJIS[card]}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>{card}</span>
              {idx >= myCards.length && <span style={{ fontSize: '0.55rem', color: 'var(--accent-green)' }}>MỚI</span>}
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary"
        disabled={selected.length !== keepCount}
        onClick={handleConfirm}
        style={{ fontSize: '0.9rem' }}>
        Xác nhận ({selected.length}/{keepCount} đã chọn)
      </button>
    </div>
  );
}

// Helpers
function actionDescription(pa, state) {
  const target = state?.players?.find(p => p.id === pa.targetId);
  const targetName = target?.username ? ` → ${target.username}` : '';
  const map = {
    INCOME: 'lấy Thu nhập (+1)', FOREIGN_AID: 'lấy Viện trợ (+2)',
    TAX: 'claim Duke — Thu thuế (+3)', STEAL: `claim Captain — Ăn cắp${targetName}`,
    ASSASSINATE: `claim Assassin — Ám sát${targetName}`, EXCHANGE: 'claim Ambassador — Đổi bài',
    COUP: `Đảo chính${targetName}`
  };
  return map[pa.actionType] || pa.actionType;
}

function isChallengeableAction(action) {
  return ['TAX', 'ASSASSINATE', 'STEAL', 'EXCHANGE'].includes(action);
}
