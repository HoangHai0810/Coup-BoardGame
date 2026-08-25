import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import TurnTimer from '../components/TurnTimer';
import { playGameSound } from '../services/gameAudio';

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

function formatKittensLog(log, t) {
  if (typeof log === 'string') return log;
  const key = log.key.startsWith('game.logs.') ? log.key : `game.kittens.logs.${log.key.replace('kittens.logs.', '')}`;
  const params = {
    player: 'Người chơi',
    target: 'người chơi tiếp theo',
    card: 'lá đã chọn',
    ...log.params
  };
  if (log.params?.card) params.card = t(`game.kittens.cards.${log.params.card}`, log.params.card);
  return t(key, params).replace(/\{\{[^}]+\}\}/g, '');
}

const CARD_COLORS = {
  EXPLODING_KITTEN: '#ef4444',
  DEFUSE: '#10b981',
  ATTACK: '#f97316',
  SKIP: '#3b82f6',
  FAVOR: '#a855f7',
  SHUFFLE: '#eab308',
  SEE_THE_FUTURE: '#06b6d4',
  NOPE: '#dc2626',
  CAT_BEARD: '#64748b',
  CAT_TACO: '#d97706',
  CAT_RAINBOW: '#ec4899',
  CAT_MELON: '#22c55e'
};

const CARD_GLOWS = {
  EXPLODING_KITTEN: 'rgba(239,68,68,0.5)',
  DEFUSE: 'rgba(16,185,129,0.5)',
  ATTACK: 'rgba(249,115,22,0.4)',
  SKIP: 'rgba(59,130,246,0.4)',
  FAVOR: 'rgba(168,85,247,0.4)',
  SHUFFLE: 'rgba(234,179,8,0.4)',
  SEE_THE_FUTURE: 'rgba(6,182,212,0.4)',
  NOPE: 'rgba(220,38,38,0.4)',
  CAT_BEARD: 'rgba(100,116,139,0.2)',
  CAT_TACO: 'rgba(217,119,6,0.2)',
  CAT_RAINBOW: 'rgba(236,72,153,0.3)',
  CAT_MELON: 'rgba(34,197,94,0.2)'
};

const PREVIEW_USER = { id: 'preview-me', username: 'Bạn', avatarUrl: '' };
const PREVIEW_STATE = {
  gameType: 'KITTENS', phase: 'PLAYER_TURN', currentPlayerId: 'preview-me', turnsLeft: 1,
  drawPileCount: 19, discardTop: 'ATTACK', futureCards: [],
  players: [
    { id: 'preview-me', username: 'Bạn', avatarUrl: '', handCount: 6, exploded: false },
    { id: 'p2', username: 'Roberta', avatarUrl: '', handCount: 6, exploded: false },
    { id: 'p3', username: 'Magnus', avatarUrl: '', handCount: 6, exploded: false },
    { id: 'p4', username: 'Isabella', avatarUrl: '', handCount: 5, exploded: false },
    { id: 'p5', username: 'Viktor', avatarUrl: '', handCount: 7, exploded: false }
  ],
  actionLog: [
    { key: 'kittens.logs.draw', params: { player: 'Isabella' } },
    { key: 'kittens.logs.attack', params: { player: 'Viktor' } },
    { key: 'kittens.logs.shuffle', params: { player: 'Roberta' } }
  ]
};
const PREVIEW_HAND = ['DEFUSE', 'NOPE', 'ATTACK', 'SEE_THE_FUTURE', 'CAT_MELON', 'SHUFFLE'];

export default function ExplodingKittensPage({ preview = false }) {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { subscribe, send, connected } = useSocket();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const currentUser = preview ? PREVIEW_USER : user;
  const [gameState, setGameState] = useState(preview ? PREVIEW_STATE : null);
  const [myHand, setMyHand] = useState(preview ? PREVIEW_HAND : []);
  const [targetAction, setTargetAction] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [requestedCard] = useState(null);
  const [logOpen, setLogOpen] = useState(true);
  const [explosionEvent, setExplosionEvent] = useState(null);
  const logEndRef = useRef(null);
  const soundLogRef = useRef(0);
  const explodedPlayersRef = useRef(new Set((preview ? PREVIEW_STATE.players : []).filter(player => player.exploded).map(player => player.id)));

  useEffect(() => {
    if (preview) return;
    const unsub1 = subscribe(`/topic/game/${roomId}`, data => {
      if (data.gameType === 'KITTENS') {
        setGameState(data);
      }
    });
    const unsub2 = subscribe(`/topic/game/${roomId}/private/${currentUser?.id}`, data => {
      setMyHand(data.hand || []);
    });
    if (connected) {
      send(`/app/game/${roomId}/connect`, {});
    }
    return () => { unsub1(); unsub2(); };
  }, [roomId, currentUser?.id, subscribe, send, connected, preview]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const length = gameState?.actionLog?.length || 0;
    if (soundLogRef.current && length > soundLogRef.current) playGameSound('card');
    soundLogRef.current = length;
  }, [gameState?.actionLog]);

  useEffect(() => {
    const newlyExploded = gameState?.players?.find(player => player.exploded && !explodedPlayersRef.current.has(player.id));
    explodedPlayersRef.current = new Set((gameState?.players || []).filter(player => player.exploded).map(player => player.id));
    if (!newlyExploded) return undefined;
    setExplosionEvent(newlyExploded);
    playGameSound('alert');
    const timer = window.setTimeout(() => setExplosionEvent(null), 4200);
    return () => window.clearTimeout(timer);
  }, [gameState?.players]);

  if (!gameState) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: 'var(--bg-base)' }}>
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width: 50, height: 50, border: '4px solid rgba(139,92,246,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}
      />
      <p style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>{t('game.loadingKittens', 'Đang tải mèo nổ...')}</p>
    </div>
  );

  const isMyTurn = gameState.currentPlayerId === currentUser?.id;
  const others = gameState.players?.filter(p => p.id !== currentUser?.id) || [];

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
    if (preview) {
      setGameState(current => ({
        ...current,
        currentPlayerId: 'p2',
        players: current.players.map(player => player.id === currentUser.id ? { ...player, exploded: true, handCount: 0 } : player),
        actionLog: [...current.actionLog, { key: 'game.kittens.logs.exploded', params: { player: currentUser.username } }]
      }));
      setMyHand([]);
      return;
    }
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
    <div className="page kittens-table-page" style={{
      height: '100vh', display: 'flex', flexDirection: 'column', 
      background: 'linear-gradient(135deg, #150808 0%, #060810 100%)',
      overflow: 'hidden', position: 'relative'
    }}>
      <button className="game-back-btn" onClick={() => navigate('/lobby')}><span>←</span> Trở về</button>
      {/* Background glow effects */}
      <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '400px', background: isMyTurn ? 'var(--accent-red)' : 'transparent', opacity: 0.05, filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none', transition: 'all 0.5s ease' }} />

      <Navbar />

      <div className="game-board-container kittens-table-scene" style={{ position: 'relative', zIndex: 2 }}>
        
        {/* Opponents Row */}
        <div className="opponents-row" style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          {others.map(p => {
            const isCurrentTurn = gameState.currentPlayerId === p.id;
            return (
              <motion.div key={p.id} 
                initial={{ y: -30, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                whileHover={targetAction ? { scale: 1.05, boxShadow: '0 0 25px rgba(239,68,68,0.5)' } : {}}
                className={`player-seat glass ${isCurrentTurn ? 'active-turn' : ''} ${p.exploded ? 'eliminated' : ''}`}
                onClick={() => handleTarget(p.id)}
                style={{ 
                  cursor: targetAction ? 'pointer' : 'default',
                  width: 150, 
                  minHeight: 160, 
                  background: isCurrentTurn ? 'rgba(245,158,11,0.03)' : 'var(--bg-card)',
                  border: targetAction ? '3px solid var(--accent-red)' : (isCurrentTurn ? '2px solid var(--accent-gold)' : '1px solid var(--border)'),
                  boxShadow: isCurrentTurn ? 'var(--shadow-glow-gold)' : 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 16,
                  borderRadius: 24,
                  position: 'relative'
                }}
              >
                {isCurrentTurn && (
                  <div style={{ position: 'absolute', top: 6, right: 8, fontSize: '0.6rem', color: 'var(--accent-gold)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-gold)', animation: 'pulse-radar 1s infinite' }} />
                    LƯỢT
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <img 
                    src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`} 
                    alt={p.username} 
                    className="player-avatar" 
                    style={{ width: 50, height: 50, border: isCurrentTurn ? '2px solid var(--accent-gold)' : '2px solid var(--border)' }} 
                  />
                  {p.exploded && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>💥</div>
                  )}
                </div>
                <div style={{ textAlign: 'center', marginTop: 8, width: '100%' }}>
                  <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 800, marginTop: 2 }}>🎴 {p.handCount} {t('game.kittens.cardsTitle', 'lá')}</div>
                </div>
                {p.exploded && <span className="badge badge-red" style={{ marginTop: 8, padding: '2px 8px', fontSize: '0.55rem' }}>BỊ LOẠI</span>}
              </motion.div>
            );
          })}
        </div>

        {/* Board Center */}
        <div className="game-board-center">
          <TurnTimer 
            currentPlayerId={gameState.currentPlayerId} 
            currentPlayerName={gameState.players.find(p => p.id === gameState.currentPlayerId)?.username || ''}
            currentUserId={currentUser?.id}
            isActive={gameState.phase !== 'GAME_OVER'}
          />
          
          <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
            {/* Draw Pile */}
            <motion.div 
              whileHover={isMyTurn ? { scale: 1.05, y: -4, boxShadow: 'var(--shadow-glow-gold)' } : {}}
              whileActive={isMyTurn ? { scale: 0.98 } : {}}
              className={`pile ${isMyTurn ? 'pulse-gold' : ''}`} 
              onClick={handleDraw}
              style={{ 
                width: 120, 
                height: 175, 
                background: '#1a0c0c', 
                border: isMyTurn ? '4px solid var(--accent-gold)' : '4px solid white', 
                borderRadius: 20,
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: isMyTurn ? 'pointer' : 'default', 
                position: 'relative', 
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ fontWeight: 900, color: 'white', transform: 'rotate(-90deg)', fontSize: '1.25rem', letterSpacing: 4 }}>KITTENS</div>
              <div style={{ position: 'absolute', bottom: -38, width: '100%', textAlign: 'center', color: 'var(--text-primary)', fontWeight: 900, fontSize: '1.2rem' }}>
                {gameState.drawPileCount}
              </div>
              {isMyTurn && (
                <div style={{ position: 'absolute', top: -45, background: 'var(--accent-gold)', color: 'black', padding: '6px 16px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 900, boxShadow: '0 4px 10px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
                  👆 RÚT BÀI
                </div>
              )}
            </motion.div>

            {/* Discard Pile */}
            <div style={{ width: 120, height: 175, borderRadius: 20, border: '3px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <AnimatePresence mode="wait">
                {gameState.discardTop ? (
                  <motion.div 
                    key={gameState.discardTop}
                    initial={{ scale: 0.6, opacity: 0, rotate: 12 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    className="kittens-card"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      background: CARD_COLORS[gameState.discardTop] || 'var(--bg-card)', 
                      margin: 0, 
                      border: '4px solid white', 
                      position: 'absolute',
                      borderRadius: 18,
                      overflow: 'hidden',
                      boxShadow: `0 8px 24px ${CARD_GLOWS[gameState.discardTop] || 'transparent'}`
                    }}
                  >
                    <div className="card-art-container" style={{ background: 'rgba(0,0,0,0.1)' }}>
                      <div className="card-art" style={{
                        backgroundImage: `url(${KITTENS_IMAGES[gameState.discardTop] || ''})`,
                        backgroundSize: gameState.discardTop?.startsWith('CAT_') ? '400% 100%' : 'cover',
                        backgroundPosition: CAT_POSITIONS[gameState.discardTop] || 'center'
                      }} />
                    </div>
                    <div className="card-label" style={{ fontSize: '0.65rem', padding: '5px 0', fontWeight: 900, textAlign: 'center', color: '#fff', background: 'rgba(0,0,0,0.4)' }}>
                      {CARD_EMOJIS[gameState.discardTop]} {t(`game.kittens.cards.${gameState.discardTop}`)}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className={`kittens-sidebar ${logOpen ? 'is-open' : 'is-closed'}`}>
            {logOpen ? (
            <div className="card glass" style={{ 
              maxHeight: 280, 
              background: 'var(--bg-card)', 
              borderRadius: 32, 
              padding: 20,
              display: 'flex', 
              flexDirection: 'column', 
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem', fontWeight: 800 }}>📜 {t('game.actionLog', 'LỊCH SỬ')}<button className="panel-minimize" onClick={() => setLogOpen(false)} aria-label="Thu nhỏ nhật ký">—</button></h4>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                {gameState.actionLog.slice(-15).map((log, i) => {
                  const text = formatKittensLog(log, t);
                  return (
                    <div key={i} style={{ 
                      padding: '8px 12px', 
                      background: 'var(--bg-input)', 
                      borderRadius: 10, 
                      fontSize: '0.78rem', 
                      fontWeight: 700, 
                      borderLeft: '4px solid var(--accent-red)',
                      color: 'var(--text-secondary)'
                    }}>
                      {text}
                    </div>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            </div>
            ) : <button className="log-popup-button" onClick={() => setLogOpen(true)}>📜<span>Nhật ký</span></button>}
          </div>
      <ChatBox roomId={roomId || 'preview-room'} />

      <AnimatePresence>
        {explosionEvent && (
          <motion.div className="kittens-explosion-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="kittens-explosion-card" initial={{ scale: .35, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: .6, opacity: 0 }}>
              <div className="explosion-burst">💥</div>
              <div className="explosion-avatar"><img src={explosionEvent.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${explosionEvent.username}`} alt="" /></div>
              <h2>{explosionEvent.id === currentUser?.id ? 'BẠN ĐÃ BỊ NỔ!' : `${explosionEvent.username} ĐÃ BỊ NỔ!`}</h2>
              <p>{explosionEvent.id === currentUser?.id ? 'Bạn đã bị loại khỏi ván đấu.' : `${explosionEvent.username} đã bị loại khỏi ván đấu.`}</p>
              <button onClick={() => setExplosionEvent(null)}>Đã hiểu</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>

        {/* Modals for Action Responses */}
        <AnimatePresence>
          {gameState.phase === 'EXPLODING' && isMyTurn && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(239,68,68,0.3)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <motion.div className="defuse-modal glass" style={{ borderRadius: 40, padding: 40, border: '2px solid var(--accent-red)', background: 'var(--bg-surface)', textAlign: 'center', width: 480, boxShadow: 'var(--shadow-glow-cyan)' }}>
                <div style={{ fontSize: '4.5rem', animation: 'float 2s ease-in-out infinite' }}>💣</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-red)', marginTop: 12 }}>
                  {t('game.kittens.logs.exploded', { player: 'BẠN' })}
                </h2>
                <p style={{ fontWeight: 800, margin: '12px 0 32px 0', color: 'var(--text-secondary)' }}>Sử dụng Gỡ Bom (DEFUSE) để đưa bom trở lại bộ bài!</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <motion.button whileHover={{ scale: 1.05 }} whileActive={{ scale: 0.95 }} onClick={() => handleDefuse(0)} className="btn btn-primary" style={{ padding: '14px', borderRadius: 14, fontWeight: 800 }}>Đầu bộ bài</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileActive={{ scale: 0.95 }} onClick={() => handleDefuse(Math.floor(Math.random() * gameState.drawPileCount))} className="btn btn-ghost" style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: 14, fontWeight: 800 }}>Ngẫu nhiên</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileActive={{ scale: 0.95 }} onClick={() => handleDefuse(gameState.drawPileCount)} className="btn btn-ghost" style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: 14, fontWeight: 800 }}>Cuối bộ bài</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {gameState.futureCards?.length > 0 && isMyTurn && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(6,8,16,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <motion.div className="future-modal glass" style={{ borderRadius: 40, padding: 32, border: '2px solid var(--accent-cyan)', background: 'var(--bg-surface)', textAlign: 'center', width: 'auto' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 24, color: 'var(--accent-cyan)' }}>🔮 {t('game.kittens.cards.SEE_THE_FUTURE', 'Xem Trước Tương Lai')}</h3>
                <div style={{ display: 'flex', gap: 14 }}>
                  {gameState.futureCards.map((card, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ scale: 0.8, rotate: 10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: i * 0.08, type: 'spring' }}
                      className="kittens-card" 
                      style={{ background: CARD_COLORS[card], width: 95, height: 135, border: '3px solid white', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
                    >
                      <div className="card-art-container">
                        <div className="card-art" style={{
                          backgroundImage: `url(${KITTENS_IMAGES[card] || ''})`,
                          backgroundSize: card?.startsWith('CAT_') ? '400% 100%' : 'cover',
                          backgroundPosition: CAT_POSITIONS[card] || 'center'
                        }} />
                      </div>
                      <div className="card-label" style={{ fontSize: '0.6rem', fontWeight: 900, padding: '4px 0', background: 'rgba(0,0,0,0.4)', color: '#fff' }}>
                        {CARD_EMOJIS[card]} {t(`game.kittens.cards.${card}`)}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <motion.button whileHover={{ scale: 1.03 }} whileActive={{ scale: 0.97 }} className="btn btn-primary" style={{ marginTop: 28, width: '100%', padding: 14, borderRadius: 14, fontWeight: 900 }} onClick={handleCloseFuture}>Xong</motion.button>
              </motion.div>
            </motion.div>
          )}

          {gameState.phase === 'AWAITING_FAVOR' && gameState.favorTargetId === currentUser?.id && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(6,8,16,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <motion.div className="favor-modal glass" style={{ borderRadius: 40, padding: 32, border: '2px solid var(--accent-purple)', background: 'var(--bg-surface)', textAlign: 'center', width: 550 }}>
                <h3 style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.25rem' }}>🎁 {t('game.kittens.logs.favor', { player: gameState.players.find(p => p.id === gameState.favorRequesterId)?.username, target: 'bạn' })}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>Hãy chọn 1 lá bài trên tay để tặng cho họ.</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 24 }}>
                  {myHand.map((card, idx) => (
                    <motion.div 
                      key={idx} 
                      whileHover={{ scale: 1.05, y: -4 }}
                      className="kittens-card" 
                      style={{ background: CARD_COLORS[card], width: 80, height: 115, border: '3px solid white', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }} 
                      onClick={() => handleGiveCard(card)}
                    >
                      <div className="card-art-container">
                        <div className="card-art" style={{
                          backgroundImage: `url(${KITTENS_IMAGES[card] || ''})`,
                          backgroundSize: card?.startsWith('CAT_') ? '400% 100%' : 'cover',
                          backgroundPosition: CAT_POSITIONS[card] || 'center'
                        }} />
                      </div>
                      <div className="card-label" style={{ fontSize: '0.55rem', fontWeight: 900, padding: '4px 0', background: 'rgba(0,0,0,0.4)', color: '#fff' }}>
                        {CARD_EMOJIS[card]} {t(`game.kittens.cards.${card}`)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Hand Area */}
        <div className="game-hand-area" style={{ background: 'rgba(0,0,0,0.15)', borderTop: '1px solid var(--border)', borderRadius: '40px 40px 0 0', margin: '0 -40px', padding: '16px 40px' }}>
          <div style={{ flex: 1, display: 'flex', gap: -20, overflowX: 'auto', padding: '16px 0', minHeight: 180, scrollbarWidth: 'none' }}>
            <AnimatePresence>
              {myHand.map((card, idx) => {
                const isSelected = selectedCards.includes(idx);
                return (
                  <motion.div 
                    key={`${card}-${idx}`}
                    layout 
                    initial={{ scale: 0, x: 40 }} 
                    animate={{ scale: 1, x: 0 }}
                    whileHover={{ y: -40, scale: 1.15, zIndex: 10, boxShadow: isSelected ? '0 15px 30px rgba(251,191,36,0.3)' : `0 15px 30px ${CARD_GLOWS[card]}` }}
                    className="kittens-card"
                    style={{ 
                      background: CARD_COLORS[card], 
                      width: 100, 
                      height: 145, 
                      border: isSelected ? '4px solid var(--accent-gold)' : '3px solid white',
                      boxShadow: isSelected ? '0 0 15px var(--accent-gold)' : 'var(--shadow-sm)',
                      borderRadius: 18,
                      overflow: 'hidden',
                      margin: '0 -15px',
                      cursor: isMyTurn ? 'pointer' : 'default'
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
                    <div className="card-label" style={{ fontSize: '0.65rem', fontWeight: 900, padding: '4px 0', background: 'rgba(0,0,0,0.4)', color: '#fff', textAlign: 'center' }}>
                      {CARD_EMOJIS[card]} {t(`game.kittens.cards.${card}`)}
                    </div>
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--accent-gold)', color: 'black', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.65rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>✓</div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="game-control-panel">
            <div className={`turn-indicator ${isMyTurn ? 'my-turn' : ''}`} style={{ fontSize: '1rem', padding: '10px 18px', width: '100%', fontWeight: 900, borderRadius: 16, background: isMyTurn ? 'var(--accent-gold)' : 'var(--bg-glass)', color: isMyTurn ? '#000' : 'var(--text-secondary)', textAlign: 'center', border: isMyTurn ? 'none' : '1px solid var(--border)' }}>
              {isMyTurn ? t('game.yourTurn', 'LƯỢT CỦA BẠN') : `Đợi ${gameState.players.find(p => p.id === gameState.currentPlayerId)?.username}...`}
            </div>
            {selectedCards.length > 0 && (
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileActive={{ scale: 0.97 }}
                className="btn btn-primary" 
                onClick={handleComboPlay} 
                style={{ width: '100%', padding: '14px', borderRadius: 14, fontWeight: 900, background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-red))' }}
              >
                🔥 COMBO ({selectedCards.length} lá)
              </motion.button>
            )}
            {gameState.turnsLeft > 1 && (
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                style={{ background: 'var(--accent-red)', color: 'white', padding: '6px 16px', borderRadius: 20, fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                🧨 CÒN {gameState.turnsLeft} LƯỢT!
              </motion.div>
            )}
          </div>
        </div>

      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameState.phase === 'GAME_OVER' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="game-over-overlay" 
            style={{ zIndex: 10000, background: 'rgba(6,8,16,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }} 
              animate={{ scale: 1, y: 0 }} 
              className="game-over-card glass" 
              style={{ padding: 40, borderRadius: 40, border: '1px solid var(--accent-gold)', width: 450, textAlign: 'center', boxShadow: 'var(--shadow-glow-gold)' }}
            >
              <div style={{ fontSize: '5rem', marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>🏆</div>
              <h1 className="display-font" style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: 12 }}>{t('game.gameOver', 'TRÒ CHƠI KẾT THÚC')}</h1>
              
              <div style={{ padding: '24px 40px', background: 'rgba(245,158,11,0.08)', borderRadius: 24, border: '2px solid var(--accent-gold)', margin: '24px 0' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--accent-gold)', fontWeight: 800, marginBottom: 6 }}>Kẻ Sống Sót</div>
                <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 900, color: 'var(--text-primary)' }}>
                  {gameState.players?.find(p => p.id === gameState.winnerId)?.username} CHIẾN THẮNG!
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

      <style>{`
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
        .pulse-gold {
            animation: pulse-gold-glow 2s infinite;
        }
        @keyframes pulse-gold-glow {
            0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(255, 215, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
        }
        @keyframes pulse-border {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
