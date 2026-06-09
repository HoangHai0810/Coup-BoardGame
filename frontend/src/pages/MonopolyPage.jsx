import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

export default function MonopolyPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { send, subscribe, connected } = useSocket();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [gameState, setGameState] = useState(null);
  const [selectedProp, setSelectedProp] = useState(null);
  const [activeTab, setActiveTab] = useState('board'); // 'board', 'players', 'history'
  const logEndRef = useRef(null);

  useEffect(() => {
    const unsub = subscribe(`/topic/game/${roomId}`, state => {
      setGameState(state);
    });
    if (connected) {
      send(`/app/game/${roomId}/connect`, {});
    }
    return () => unsub();
  }, [roomId, subscribe, connected, send]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.logs]);

  if (!gameState) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width: 50, height: 50, border: '4px solid rgba(109,40,217,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}
      />
    </div>
  );

  const isMyTurn = gameState.players[gameState.currentTurnIndex]?.id === user.id;

  const handleRoll = () => send(`/app/game/${roomId}/monopoly/roll`, {});
  const handleBuy = () => send(`/app/game/${roomId}/monopoly/buy`, {});
  const handleEndTurn = () => send(`/app/game/${roomId}/monopoly/end`, {});
  const handleBuild = (propertyId) => send(`/app/game/${roomId}/monopoly/build`, { propertyId });

  const handlePropClick = (pos) => {
    const prop = gameState.board[pos];
    if (prop) setSelectedProp(prop);
  };

  const getPositionCoordinates = (pos) => {
    let c, r;
    if (pos <= 10) { c = 10 - pos; r = 10; }
    else if (pos <= 20) { c = 0; r = 20 - pos; }
    else if (pos <= 30) { c = pos - 20; r = 0; }
    else { c = 10; r = pos - 30; }

    const getCenterPercent = (idx) => {
      if (idx === 0) return (1 / 13) * 100;
      if (idx === 10) return (12 / 13) * 100;
      return ((2.5 + (idx - 1)) / 13) * 100;
    };

    return {
      x: getCenterPercent(c),
      y: getCenterPercent(r),
    };
  };

  const getPlayerOffset = (playerIndex, totalPlayers) => {
    if (totalPlayers <= 1) return { x: 0, y: 0 };
    if (totalPlayers === 2) {
      return {
        x: playerIndex === 0 ? -8 : 8,
        y: 0
      };
    }
    const offsets = [
      { x: -9, y: -9 },
      { x: 9, y: -9 },
      { x: -9, y: 9 },
      { x: 9, y: 9 },
    ];
    return offsets[playerIndex % 4];
  };

  const getPlayerTileIndex = (playerId, position) => {
    const playersOnTile = gameState.players.filter(p => !p.bankrupt && p.position === position);
    return playersOnTile.findIndex(p => p.id === playerId);
  };

  const ownsAllOfGroup = (player, property) => {
    if (!player || !property.colorGroup) return false;
    const groupProps = Object.values(gameState.board).filter(p => p.colorGroup === property.colorGroup);
    return groupProps.every(p => p.ownerId === player.id);
  };

  const currentSelectedProp = selectedProp ? gameState.board[selectedProp.id] : null;
  const me = gameState.players.find(p => p.id === user.id);

  const getColorGroupColor = (colorGroup) => {
    switch (colorGroup) {
      case 'BROWN': return '#8B5A2B';
      case 'LIGHT_BLUE': return '#06b6d4';
      case 'PINK': return '#ec4899';
      case 'ORANGE': return '#f97316';
      case 'RED': return '#ef4444';
      case 'YELLOW': return '#eab308';
      case 'GREEN': return '#10b981';
      case 'DARK_BLUE': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getSpecialTile = (index) => {
    switch (index) {
      case 0: return { name: t('game.monopoly.special.go', 'BẮT ĐẦU'), type: "GO", icon: "🚩", price: t('game.monopoly.special.goPrice', '+2000K') };
      case 2: return { name: t('game.monopoly.special.chance', 'CƠ HỘI'), type: "CHANCE", icon: "❓" };
      case 4: return { name: t('game.monopoly.special.tax', 'THUẾ THU NHẬP'), type: "TAX", price: "2000K", icon: "💸" };
      case 7: return { name: t('game.monopoly.special.chest', 'KHÍ VẬN'), type: "CHEST", icon: "📦" };
      case 10: return { name: t('game.monopoly.special.jail', 'TÙ GIAM'), type: "JAIL", icon: "👮" };
      case 17: return { name: t('game.monopoly.special.chance', 'CƠ HỘI'), type: "CHANCE", icon: "❓" };
      case 20: return { name: t('game.monopoly.special.freeParking', 'BÃI ĐỖ XE'), type: "FREE_PARKING", icon: "🚗" };
      case 22: return { name: t('game.monopoly.special.chest', 'KHÍ VẬN'), type: "CHEST", icon: "📦" };
      case 30: return { name: t('game.monopoly.special.goToJail', 'VÀO TÙ'), type: "GO_TO_JAIL", icon: "🚨" };
      case 33: return { name: t('game.monopoly.special.chance', 'CƠ HỘI'), type: "CHANCE", icon: "❓" };
      case 36: return { name: t('game.monopoly.special.chest', 'KHÍ VẬN'), type: "CHEST", icon: "📦" };
      case 38: return { name: t('game.monopoly.special.specialTax', 'THUẾ XA XỈ'), type: "TAX", price: "1000K", icon: "💎" };
      default: return null;
    }
  };

  const getGridPosition = (index) => {
    if (index <= 10) return { gridColumn: 11 - index, gridRow: 11, orientation: 'bottom' };
    if (index <= 20) return { gridColumn: 1, gridRow: 21 - index, orientation: 'left' };
    if (index <= 30) return { gridColumn: index - 19, gridRow: 1, orientation: 'top' };
    return { gridColumn: 11, gridRow: index - 29, orientation: 'right' };
  };

  return (
    <div className="monopoly-page" style={{ position: 'relative' }}>
      {/* Mobile Tab Bar */}
      <div className="monopoly-tabs">
        <div className={`monopoly-tab-btn ${activeTab === 'board' ? 'active' : ''}`} onClick={() => setActiveTab('board')}>
          🎩 {t('game.monopoly.tabBoard', 'Bàn Cờ')}
        </div>
        <div className={`monopoly-tab-btn ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>
          👥 {t('game.monopoly.players', 'Người chơi')}
        </div>
        <div className={`monopoly-tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📝 {t('game.monopoly.history', 'Lịch sử')}
        </div>
      </div>

      {/* LEFT PANEL: Game Board */}
      <div className={`monopoly-main ${activeTab === 'board' ? '' : 'tab-inactive'}`}>
        <div className="monopoly-board">
            {/* 40 Tiles Rendering */}
            {Array.from({length: 40}).map((_, i) => {
                const prop = gameState.board[i];
                const special = getSpecialTile(i);
                const { gridColumn, gridRow, orientation } = getGridPosition(i);
                
                const isCorner = i === 0 || i === 10 || i === 20 || i === 30;
                
                let tileName = prop ? prop.name : (special ? special.name : "");
                let tilePrice = prop ? `${prop.price}K` : (special && special.price ? special.price : "");
                let colorBar = prop ? getColorGroupColor(prop.colorGroup) : "transparent";
                
                return (
                    <motion.div 
                        key={i} 
                        onClick={() => handlePropClick(i)}
                        whileHover={prop ? { scale: 1.02, zIndex: 10, boxShadow: 'inset 0 0 15px rgba(255,255,255,0.05)' } : {}}
                        className={`monopoly-tile ${orientation} ${isCorner ? 'monopoly-tile-corner' : ''}`}
                        style={{
                            gridColumn, gridRow,
                            cursor: prop ? 'pointer' : 'default',
                            border: '1px solid rgba(255,255,255,0.06)'
                        }}
                    >
                        {!isCorner && prop && prop.colorGroup !== 'STATION' && prop.colorGroup !== 'UTILITY' && (
                            <div className="tile-color-bar" style={{ backgroundColor: colorBar }}></div>
                        )}
                        
                        <div className="tile-content">
                            {isCorner ? (
                                <>
                                    <div style={{ fontSize: '1.8rem', marginBottom: 2 }}>{special?.icon}</div>
                                    <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 900, textAlign: 'center' }}>{tileName}</div>
                                </>
                            ) : (
                                <>
                                    <div className="tile-name" style={{ fontWeight: 800, fontSize: '0.75rem' }}>{tileName}</div>
                                    {(prop?.colorGroup === 'STATION' || prop?.colorGroup === 'UTILITY') && (
                                        <div className="tile-icon" style={{ fontSize: '1.2rem' }}>{prop.colorGroup === 'STATION' ? '🚆' : '💡'}</div>
                                    )}
                                    {special?.icon && <div className="tile-icon" style={{ fontSize: '1.2rem' }}>{special.icon}</div>}
                                    <div className="tile-price" style={{ fontWeight: 800, fontSize: '0.7rem', color: 'var(--accent-gold)' }}>{tilePrice}</div>
                                </>
                            )}
                        </div>

                        {/* Houses/Hotel badge */}
                        {prop?.housesBuilt > 0 && (
                            <div className={`tile-house-badge ${orientation}`} style={{ zIndex: 8 }}>
                                {prop.housesBuilt === 5 ? '🏨' : `🏠x${prop.housesBuilt}`}
                            </div>
                        )}

                        {/* Owner overlay */}
                        {prop?.ownerId && (
                            <div 
                                className={`owner-overlay owner-player-${gameState.players.findIndex(p => p.id === prop.ownerId)}`}
                                style={{ opacity: 0.7 }}
                            />
                        )}

                    </motion.div>
                );
            })}

            {/* Smoothly animated player tokens */}
            <AnimatePresence>
                {gameState.players.map((p, pIdx) => {
                    if (p.bankrupt) return null;
                    
                    const coords = getPositionCoordinates(p.position);
                    const playersOnTile = gameState.players.filter(pl => !pl.bankrupt && pl.position === p.position);
                    const tilePlayerIndex = playersOnTile.findIndex(pl => pl.id === p.id);
                    const offset = getPlayerOffset(tilePlayerIndex, playersOnTile.length);
                    const isActive = gameState.currentTurnIndex === pIdx;
                    
                    return (
                        <motion.div
                            key={p.id}
                            layout
                            initial={false}
                            animate={{
                                left: `calc(${coords.x}% + ${offset.x}px)`,
                                top: `calc(${coords.y}% + ${offset.y}px)`
                            }}
                            transition={{ type: 'spring', damping: 18, stiffness: 120 }}
                            className={`player-token player-color-${pIdx} ${isActive ? 'active-turn' : ''}`}
                            title={p.username}
                            style={{
                                position: 'absolute',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 50,
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                border: isActive ? '3px solid var(--accent-gold)' : '2px solid white',
                                boxShadow: isActive ? '0 0 15px var(--accent-gold)' : '0 4px 8px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                            }}
                        >
                            <img src={p.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.username}`} alt={p.username} style={{ width: '100%', height: '100%' }} />
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Center Area */}
            <div className="board-center-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div className="board-watermark" style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div className="board-watermark-icon" style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>🎩</div>
                    <div className="board-watermark-title display-font" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: 2, textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>BOARDREALM</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 3, marginTop: 4 }}>MONOPOLY</div>
                </div>

                {gameState.hasRolled && (
                    <div className="dice-container" style={{ display: 'flex', gap: 16, pointerEvents: 'auto', marginBottom: 16 }}>
                        {[0, 1].map(i => (
                          <motion.div 
                            key={`${i}-${gameState.lastDice[i]}`}
                            initial={{ rotate: -180, scale: 0, y: -40 }}
                            animate={{ rotate: 360, scale: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 10 }}
                            className="die"
                            style={{
                              width: 52,
                              height: 52,
                              background: 'var(--bg-glass)',
                              border: '2px solid var(--border)',
                              borderRadius: 14,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.8rem',
                              fontWeight: 900,
                              color: 'var(--text-primary)',
                              boxShadow: 'var(--shadow-md)'
                            }}
                          >
                            {gameState.lastDice[i]}
                          </motion.div>
                        ))}
                    </div>
                )}

                {gameState.phase === 'GAME_OVER' ? (
                  <motion.div 
                      className="turn-status-badge game-over"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{
                        background: 'linear-gradient(135deg, var(--accent-red), var(--accent-gold))',
                        color: 'black',
                        padding: '8px 24px',
                        borderRadius: 20,
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        boxShadow: '0 4px 12px rgba(239,68,68,0.2)'
                      }}
                  >
                    🏆 {t('game.gameOver', 'GAME OVER').toUpperCase()}!
                  </motion.div>
                ) : (
                  <motion.div 
                      className="turn-status-badge"
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{
                        background: isMyTurn ? 'linear-gradient(135deg, var(--accent-primary-light), var(--accent-primary))' : 'var(--bg-glass)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        padding: '8px 20px',
                        borderRadius: 20,
                        fontWeight: 950,
                        fontSize: '0.8rem',
                        boxShadow: isMyTurn ? 'var(--shadow-glow)' : 'var(--shadow-sm)'
                      }}
                  >
                    {isMyTurn ? `🔥 ${t('game.yourTurn', 'LƯỢT CỦA BẠN').toUpperCase()}!` : t('game.monopoly.waitingForPlayer', { username: gameState.players[gameState.currentTurnIndex]?.username })}
                  </motion.div>
                )}
            </div>
        </div>

        {/* Controls */}
        <div className="monopoly-controls" style={{ display: 'flex', gap: 12, padding: 16 }}>
            <motion.button 
              whileHover={isMyTurn && gameState.phase === 'ROLL' ? { scale: 1.03 } : {}}
              whileActive={isMyTurn && gameState.phase === 'ROLL' ? { scale: 0.98 } : {}}
              className={`btn ${isMyTurn && gameState.phase === 'ROLL' ? 'btn-roll-active' : 'btn-secondary'}`} 
              disabled={!isMyTurn || gameState.phase !== 'ROLL' || me?.bankrupt} 
              onClick={handleRoll}
              style={{
                borderRadius: 16,
                padding: '14px 28px',
                fontWeight: 900,
                flex: 1
              }}
            >
                🎲 {t('game.monopoly.rollDice', 'Đổ Xúc Xắc')}
            </motion.button>
            
            <motion.button 
              whileHover={isMyTurn && gameState.phase === 'BUY' ? { scale: 1.03 } : {}}
              whileActive={isMyTurn && gameState.phase === 'BUY' ? { scale: 0.98 } : {}}
              className={`btn ${isMyTurn && gameState.phase === 'BUY' ? 'btn-buy-active' : 'btn-secondary'}`} 
              disabled={!isMyTurn || gameState.phase !== 'BUY' || me?.bankrupt} 
              onClick={handleBuy}
              style={{
                borderRadius: 16,
                padding: '14px 28px',
                fontWeight: 900,
                flex: 1
              }}
            >
                💰 {t('game.monopoly.buyProperty', 'Mua Đất')}
            </motion.button>
            
            <motion.button 
              whileHover={isMyTurn && (gameState.phase === 'END_TURN' || gameState.phase === 'BUY') ? { scale: 1.03 } : {}}
              whileActive={isMyTurn && (gameState.phase === 'END_TURN' || gameState.phase === 'BUY') ? { scale: 0.98 } : {}}
              className={`btn ${isMyTurn && (gameState.phase === 'END_TURN' || gameState.phase === 'BUY') ? 'btn-end-active' : 'btn-secondary'}`} 
              disabled={!isMyTurn || (gameState.phase !== 'END_TURN' && gameState.phase !== 'BUY') || me?.bankrupt} 
              onClick={handleEndTurn}
              style={{
                borderRadius: 16,
                padding: '14px 28px',
                fontWeight: 900,
                flex: 1
              }}
            >
                ⏭ {t('game.monopoly.endTurn', 'Lượt Kế')}
            </motion.button>
        </div>
      </div>

      {/* Property Modal */}
      <AnimatePresence>
        {currentSelectedProp && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProp(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(6,8,16,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div 
                initial={{ scale: 0.9, y: 30 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.9, y: 30 }}
                onClick={e => e.stopPropagation()}
                style={{ width: 350, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 28, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}
            >
                <div style={{ height: 90, background: getColorGroupColor(currentSelectedProp.colorGroup), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', position: 'relative' }}>
                    <h3 style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.8 }}>{t('game.monopoly.propertyCard', 'THẺ SỞ HỮU ĐẤT')}</h3>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, marginTop: 4 }}>{currentSelectedProp.name}</h2>
                </div>
                <div style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', color: 'var(--accent-gold)', marginBottom: 16, fontWeight: 900 }}>{t('game.monopoly.buyPrice', { price: currentSelectedProp.price })}K</div>
                    
                    {/* Ownership & Status */}
                    <div style={{ textAlign: 'left', background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '12px 18px', borderRadius: 18, marginBottom: 16, fontSize: '0.88rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{t('game.monopoly.status', 'Trạng thái')}</span> 
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {currentSelectedProp.ownerId ? 
                              t('game.monopoly.ownedBy', { username: gameState.players.find(p => p.id === currentSelectedProp.ownerId)?.username || 'Người chơi khác' }) : 
                              t('game.monopoly.unowned', 'Chưa sở hữu')
                            }
                          </strong>
                      </div>
                      {currentSelectedProp.ownerId && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{t('game.monopoly.level', 'Cấp độ')}</span> 
                            <strong style={{ color: 'var(--text-primary)' }}>
                              {currentSelectedProp.housesBuilt === 5 ? 
                                t('game.monopoly.hotel', 'Khách sạn') : 
                                currentSelectedProp.housesBuilt > 0 ? 
                                  t('game.monopoly.houses', { count: currentSelectedProp.housesBuilt }) : 
                                  t('game.monopoly.emptyLand', 'Đất trống')
                              }
                            </strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{t('game.monopoly.currentRent', 'Tiền thuê hiện tại')}</span> 
                          <strong style={{ color: 'var(--accent-red)', fontWeight: 900 }}>
                            {currentSelectedProp.ownerId ? `${currentSelectedProp.rentPrices[currentSelectedProp.housesBuilt]}K` : '0K'}
                          </strong>
                      </div>
                    </div>

                    {/* Rent card details */}
                    <div style={{ textAlign: 'left', background: 'var(--bg-input)', border: '1px solid var(--border)', padding: 16, borderRadius: 18, marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <span>{t('game.monopoly.baseRent', 'Thuê đất trống')}</span> <strong style={{ color: 'var(--text-primary)' }}>{currentSelectedProp.rentPrices[0]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <span>{t('game.monopoly.with1House', 'Có 1 Nhà')}</span> <strong style={{ color: 'var(--text-primary)' }}>{currentSelectedProp.rentPrices[1]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <span>{t('game.monopoly.with2Houses', 'Có 2 Nhà')}</span> <strong style={{ color: 'var(--text-primary)' }}>{currentSelectedProp.rentPrices[2]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <span>{t('game.monopoly.with3Houses', 'Có 3 Nhà')}</span> <strong style={{ color: 'var(--text-primary)' }}>{currentSelectedProp.rentPrices[3]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <span>{t('game.monopoly.withHotel', 'Có Khách Sạn')}</span> <strong style={{ color: 'var(--text-primary)' }}>{currentSelectedProp.rentPrices[5]}K</strong>
                        </div>
                    </div>

                    {/* Build Button if owner owns color monopoly */}
                    {currentSelectedProp.housePrice > 0 && currentSelectedProp.ownerId === user.id && currentSelectedProp.housesBuilt < 5 && (
                      ownsAllOfGroup(me, currentSelectedProp) ? (
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileActive={{ scale: 0.98 }}
                            className="btn" 
                            style={{ 
                                width: '100%', 
                                padding: 14,
                                borderRadius: 16, 
                                background: '#10b981',
                                border: 'none',
                                color: 'white',
                                fontWeight: 900,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                            }} 
                            disabled={!isMyTurn || (me?.money || 0) < currentSelectedProp.housePrice}
                            onClick={() => handleBuild(currentSelectedProp.id)}
                        >
                            🔨 {t('game.monopoly.build', { 
                              type: currentSelectedProp.housesBuilt === 4 ? t('game.monopoly.hotelNoun', 'Khách sạn') : t('game.monopoly.houseNoun', 'Nhà'), 
                              price: currentSelectedProp.housePrice 
                            })}
                        </motion.button>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', marginTop: 12, fontStyle: 'italic', fontWeight: '800', textAlign: 'center' }}>
                            ⚠️ {t('game.monopoly.needMonopolyToBuild', 'Cần sở hữu trọn bộ màu để xây dựng')}
                        </div>
                      )
                    )}

                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileActive={{ scale: 0.98 }}
                      className="btn btn-ghost" 
                      style={{ width: '100%', marginTop: 12, borderRadius: 16, border: '1px solid var(--border)', fontWeight: 800, color: 'var(--text-secondary)' }} 
                      onClick={() => setSelectedProp(null)}
                    >
                      {t('game.monopoly.close', 'Đóng')}
                    </motion.button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT PANEL: Players & Logs */}
      <div className={`monopoly-sidebar ${activeTab === 'players' || activeTab === 'history' ? '' : 'tab-inactive'} ${activeTab === 'players' ? 'tab-players' : 'tab-history'}`}>
        
        {/* Players List */}
        <div className="monopoly-players-section" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: '1.05rem', fontWeight: 800 }}>👥 {t('game.monopoly.players', 'NGƯỜI CHƠI')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {gameState.players.map((p, idx) => (
                    <div key={p.id} className={`monopoly-player-card glass ${p.id === gameState.players[gameState.currentTurnIndex]?.id ? 'active-turn' : ''} ${p.bankrupt ? 'bankrupt' : ''}`} style={{ padding: 14, borderRadius: 20, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: getColorGroupColor(`player-${idx}`), display: 'inline-block' }} />
                              {p.username} {p.id === user.id && <span style={{ color: 'var(--accent-cyan)' }}>({t('game.you', 'Bạn')})</span>}
                              {p.isAI && <span className="badge" style={{ fontSize: '0.55rem', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>AI</span>}
                            </div>
                            <div style={{ color: p.bankrupt ? 'var(--text-muted)' : 'var(--accent-green)', fontWeight: 900, fontSize: '1.1rem' }}>
                              {p.bankrupt ? t('game.monopoly.bankrupt', 'Phá sản') : `$${p.money}K`}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {p.inJail && <span style={{ background: 'var(--accent-red)', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 'bold' }}>👮 {t('game.monopoly.inJail', 'TRONG TÙ')}</span>}
                          {p.bankrupt && <span style={{ background: '#757575', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 'bold' }}>💀 BANKRUPT</span>}
                        </div>

                        {/* List of properties owned by this player */}
                        {p.propertiesOwned && p.propertiesOwned.length > 0 && (
                          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {p.propertiesOwned.map(propId => {
                                  const prop = gameState.board[propId];
                                  if (!prop) return null;
                                  return (
                                      <motion.span 
                                          key={propId} 
                                          whileHover={{ scale: 1.05 }}
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedProp(prop);
                                          }}
                                          style={{
                                              fontSize: '0.65rem',
                                              padding: '2px 8px',
                                              borderRadius: '6px',
                                              background: getColorGroupColor(prop.colorGroup),
                                              color: prop.colorGroup === 'YELLOW' ? '#000' : '#fff',
                                              cursor: 'pointer',
                                              fontWeight: '900',
                                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                                          }}
                                      >
                                          {prop.name} {prop.housesBuilt > 0 && (prop.housesBuilt === 5 ? '🏨' : `🏠${prop.housesBuilt}`)}
                                      </motion.span>
                                  );
                              })}
                          </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Logs */}
        <div className="monopoly-logs-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: '1.05rem', fontWeight: 800 }}>📝 {t('game.monopoly.history', 'LỊCH SỬ')}</h3>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gameState.logs.map((log, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="monopoly-log-item"
                    style={{
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)'
                    }}
                  >
                      {log}
                  </motion.div>
              ))}
              <div ref={logEndRef} />
            </div>
        </div>
      </div>
    </div>
  );
}
