import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function MonopolyPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { send, subscribe, connected } = useSocket();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
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

  if (!gameState) return <div className="page" style={{display:'flex',justifyContent:'center',alignItems:'center'}}><div className="spinner"/></div>;

  const [selectedProp, setSelectedProp] = useState(null);

  const isMyTurn = gameState.players[gameState.currentTurnIndex]?.id === user.id;

  const handleRoll = () => send(`/app/game/${roomId}/monopoly/roll`, {});
  const handleBuy = () => send(`/app/game/${roomId}/monopoly/buy`, {});
  const handleEndTurn = () => send(`/app/game/${roomId}/monopoly/end`, {});
  const handleBuild = (propertyId) => send(`/app/game/${roomId}/monopoly/build`, { propertyId });

  const handlePropClick = (pos) => {
    const prop = gameState.board[pos];
    if (prop) setSelectedProp(prop);
  };

  const getPositionStyles = (pos, playerIndex, totalPlayers) => {
    let x, y;
    if (pos <= 10) { x = 10 - pos; y = 10; }
    else if (pos <= 20) { x = 0; y = 20 - pos; }
    else if (pos <= 30) { x = pos - 20; y = 0; }
    else { x = 10; y = pos - 30; }

    const unit = 100 / 11;
    const offsetX = (playerIndex % 2 === 0 ? -6 : 6);
    const offsetY = (playerIndex < 2 ? -6 : 6);
    
    return {
      left: `calc(${x * unit + unit / 2}% + ${offsetX}px)`,
      top: `calc(${y * unit + unit / 2}% + ${offsetY}px)`,
    };
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
      case 'BROWN': return '#795548';
      case 'LIGHT_BLUE': return '#03a9f4';
      case 'PINK': return '#e91e63';
      case 'ORANGE': return '#ff9800';
      case 'RED': return '#f44336';
      case 'YELLOW': return '#ffd600';
      case 'GREEN': return '#4caf50';
      case 'DARK_BLUE': return '#3f51b5';
      default: return '#607d8b';
    }
  };

  const SPECIAL_TILES = {
    0: { name: "Bắt Đầu", type: "GO", icon: "🚩", price: "Nhận 2000K" },
    2: { name: "Cơ Hội", type: "CHANCE", icon: "❓" },
    4: { name: "Thuế", type: "TAX", price: "2000K", icon: "💸" },
    7: { name: "Biến Động", type: "CHEST", icon: "📦" },
    10: { name: "Thăm Tù", type: "JAIL", icon: "👮" },
    17: { name: "Cơ Hội", type: "CHANCE", icon: "❓" },
    20: { name: "Bãi Đỗ Xe", type: "FREE_PARKING", icon: "🚗" },
    22: { name: "Biến Động", type: "CHEST", icon: "📦" },
    30: { name: "Vô Tù", type: "GO_TO_JAIL", icon: "🚨" },
    33: { name: "Cơ Hội", type: "CHANCE", icon: "❓" },
    36: { name: "Biến Động", type: "CHEST", icon: "📦" },
    38: { name: "Thuế Đặc Biệt", type: "TAX", price: "1000K", icon: "💎" },
  };

  const getGridPosition = (index) => {
    if (index <= 10) return { gridColumn: 11 - index, gridRow: 11, orientation: 'bottom' };
    if (index <= 20) return { gridColumn: 1, gridRow: 21 - index, orientation: 'left' };
    if (index <= 30) return { gridColumn: index - 19, gridRow: 1, orientation: 'top' };
    return { gridColumn: 11, gridRow: index - 29, orientation: 'right' };
  };

  return (
    <div className="monopoly-page">
      {/* LEFT PANEL: Game Board */}
      <div className="monopoly-main">
        <div className="monopoly-board">
            {/* 40 Tiles Rendering */}
            {Array.from({length: 40}).map((_, i) => {
                const prop = gameState.board[i];
                const special = SPECIAL_TILES[i];
                const { gridColumn, gridRow, orientation } = getGridPosition(i);
                
                const isCorner = i === 0 || i === 10 || i === 20 || i === 30;
                
                let tileName = prop ? prop.name : (special ? special.name : "");
                let tilePrice = prop ? `${prop.price}K` : (special && special.price ? special.price : "");
                let colorBar = prop ? getColorGroupColor(prop.colorGroup) : "transparent";
                
                return (
                    <div 
                        key={i} 
                        onClick={() => handlePropClick(i)}
                        className={`monopoly-tile ${orientation} ${isCorner ? 'monopoly-tile-corner' : ''}`}
                        style={{
                            gridColumn, gridRow,
                            cursor: prop ? 'pointer' : 'default',
                        }}
                    >
                        {!isCorner && prop && prop.colorGroup !== 'STATION' && prop.colorGroup !== 'UTILITY' && (
                            <div className="tile-color-bar" style={{ backgroundColor: colorBar }}></div>
                        )}
                        
                        <div className="tile-content">
                            {isCorner ? (
                                <>
                                    <div style={{ fontSize: '2rem', marginBottom: 4 }}>{special?.icon}</div>
                                    <div style={{ textTransform: 'uppercase' }}>{tileName}</div>
                                </>
                            ) : (
                                <>
                                    <div className="tile-name">{tileName}</div>
                                    {(prop?.colorGroup === 'STATION' || prop?.colorGroup === 'UTILITY') && (
                                        <div className="tile-icon">{prop.colorGroup === 'STATION' ? '🚆' : '💡'}</div>
                                    )}
                                    {special?.icon && <div className="tile-icon">{special.icon}</div>}
                                    <div className="tile-price">{tilePrice}</div>
                                </>
                            )}
                        </div>

                        {/* Houses/Hotel badge */}
                        {prop?.housesBuilt > 0 && (
                            <div style={{
                                position: 'absolute',
                                ...(orientation === 'bottom' ? { top: 0, left: 0, right: 0 } : 
                                   orientation === 'top' ? { bottom: 0, left: 0, right: 0 } : 
                                   orientation === 'left' ? { right: 0, top: 0, bottom: 0 } : 
                                   { left: 0, top: 0, bottom: 0 }),
                                backgroundColor: prop.housesBuilt === 5 ? '#e53935' : '#4caf50',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                zIndex: 12,
                                pointerEvents: 'none'
                            }}>
                                {prop.housesBuilt === 5 ? '🏨' : `🏠x${prop.housesBuilt}`}
                            </div>
                        )}

                        {/* Owner overlay */}
                        {prop?.ownerId && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                backgroundColor: 'rgba(0,0,0,0.03)',
                                border: `3px solid ${
                                  gameState.players.findIndex(p => p.id === prop.ownerId) === 0 ? '#ff5252' :
                                  gameState.players.findIndex(p => p.id === prop.ownerId) === 1 ? '#448aff' :
                                  gameState.players.findIndex(p => p.id === prop.ownerId) === 2 ? '#4caf50' : '#ffd740'
                                }`,
                                pointerEvents: 'none',
                                zIndex: 10
                            }}></div>
                        )}
                    </div>
                );
            })}

            {/* Center Area */}
            <div style={{ 
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '60%', height: '60%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', zIndex: 5
            }}>
                {gameState.hasRolled && (
                    <div style={{ display: 'flex', gap: 32, marginBottom: 30 }}>
                        {[0, 1].map(i => (
                          <motion.div 
                            key={i}
                            initial={{ rotate: -180, scale: 0, y: -50 }}
                            animate={{ rotate: 0, scale: 1, y: 0 }}
                            style={{ 
                              width: 80, height: 80, background: 'white', borderRadius: 16, 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              fontSize: '3rem', fontWeight: 900,
                              boxShadow: '0 10px 20px rgba(0,0,0,0.2), inset 0 -6px 0 #ddd',
                              color: '#222'
                            }}
                          >
                            {gameState.lastDice[i]}
                          </motion.div>
                        ))}
                    </div>
                )}
                {gameState.phase === 'GAME_OVER' ? (
                  <motion.div 
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e53935', background: 'rgba(255,255,255,0.95)', padding: '12px 28px', borderRadius: 30, border: '3px solid #e53935' }}>
                    🏆 TRÒ CHƠI KẾT THÚC!
                  </motion.div>
                ) : (
                  <motion.div 
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333', background: 'rgba(255,255,255,0.8)', padding: '8px 24px', borderRadius: 30, border: '2px solid #333' }}>
                    {isMyTurn ? '🔥 ĐẾN LƯỢT BẠN!' : `⌛ Đợi ${gameState.players[gameState.currentTurnIndex]?.username}...`}
                  </motion.div>
                )}
            </div>

            {/* Avatars */}
            <AnimatePresence>
              {gameState.players.map((p, i) => {
                if (p.bankrupt) return null;
                const style = getPositionStyles(p.position, i, gameState.players.length);
                return (
                  <motion.div 
                    key={p.id}
                    layout
                    initial={false}
                    animate={{ ...style }}
                    transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    className={`player-token ${gameState.hasRolled && gameState.currentTurnIndex === i ? 'moving' : ''}`}
                    style={{
                      position: 'absolute',
                      width: 48, height: 48, borderRadius: '50%',
                      background: i === 0 ? '#ff5252' : i === 1 ? '#448aff' : i === 2 ? '#4caf50' : '#ffd740',
                      border: '4px solid white',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      zIndex: 100 + i,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    <img src={p.avatarUrl} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}}/>
                  </motion.div>
                );
              })}
            </AnimatePresence>
        </div>

        {/* Controls */}
        <div style={{ 
          marginTop: 20, padding: '16px 24px', 
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
          borderRadius: 100, display: 'flex', gap: 16,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
          flexWrap: 'wrap', justifyContent: 'center'
        }}>
            <button 
              className={`btn ${isMyTurn && gameState.phase === 'ROLL' ? 'btn-primary' : 'btn-secondary'}`} 
              disabled={!isMyTurn || gameState.phase !== 'ROLL' || me?.bankrupt} 
              onClick={handleRoll}
              style={{ padding: '16px 40px', borderRadius: 50, fontSize: '1.1rem', fontWeight: 800 }}
            >
                🎲 Đổ Xúc Xắc
            </button>
            <button 
              className={`btn ${isMyTurn && gameState.phase === 'BUY' ? 'btn-primary' : 'btn-secondary'}`} 
              disabled={!isMyTurn || gameState.phase !== 'BUY' || me?.bankrupt} 
              onClick={handleBuy}
              style={{ padding: '16px 40px', borderRadius: 50, fontSize: '1.1rem', fontWeight: 800, background: isMyTurn && gameState.phase === 'BUY' ? '#4CAF50' : undefined }}
            >
                💰 Mua Đất
            </button>
            <button 
              className={`btn ${isMyTurn && (gameState.phase === 'END_TURN' || gameState.phase === 'BUY') ? 'btn-primary' : 'btn-secondary'}`} 
              disabled={!isMyTurn || (gameState.phase !== 'END_TURN' && gameState.phase !== 'BUY') || me?.bankrupt} 
              onClick={handleEndTurn}
              style={{ padding: '16px 40px', borderRadius: 50, fontSize: '1.1rem', fontWeight: 800, background: isMyTurn && (gameState.phase === 'END_TURN' || gameState.phase === 'BUY') ? '#FF9800' : undefined }}
            >
                ⏭ Kết Thúc Lượt
            </button>
        </div>
      </div>

      {/* Property Modal */}
      <AnimatePresence>
        {currentSelectedProp && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedProp(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div 
                initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }}
                onClick={e => e.stopPropagation()}
                style={{ width: 340, background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            >
                <div style={{ height: 80, background: getColorGroupColor(currentSelectedProp.colorGroup), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <h2 style={{ margin: 0 }}>THẺ TÀI SẢN</h2>
                </div>
                <div style={{ padding: 24, textAlign: 'center' }}>
                    <h1 style={{ marginBottom: 8, fontSize: '1.6rem' }}>{currentSelectedProp.name}</h1>
                    <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: 12 }}>GIÁ MUA: {currentSelectedProp.price}K</div>
                    
                    {/* Ownership & Status */}
                    <div style={{ textAlign: 'left', background: '#eceff1', padding: '10px 16px', borderRadius: 12, marginBottom: 12, fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>Trạng thái:</span> 
                          <strong>
                            {currentSelectedProp.ownerId ? 
                              `Đã sở hữu bởi ${gameState.players.find(p => p.id === currentSelectedProp.ownerId)?.username || 'Người chơi khác'}` : 
                              'Chưa sở hữu'
                            }
                          </strong>
                      </div>
                      {currentSelectedProp.ownerId && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>Cấp độ:</span> 
                            <strong>
                              {currentSelectedProp.housesBuilt === 5 ? '🏨 Khách Sạn' : currentSelectedProp.housesBuilt > 0 ? `🏠 ${currentSelectedProp.housesBuilt} Nhà` : 'Đất trống'}
                            </strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Tiền thuê hiện tại:</span> 
                          <strong style={{ color: '#e53935' }}>
                            {currentSelectedProp.ownerId ? `${currentSelectedProp.rentPrices[currentSelectedProp.housesBuilt]}K` : '0K'}
                          </strong>
                      </div>
                    </div>

                    {/* Rent card details */}
                    <div style={{ textAlign: 'left', background: '#f5f5f5', padding: 16, borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                            <span>Thuê cơ bản:</span> <strong>{currentSelectedProp.rentPrices[0]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                            <span>Với 1 Nhà:</span> <strong>{currentSelectedProp.rentPrices[1]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                            <span>Với 2 Nhà:</span> <strong>{currentSelectedProp.rentPrices[2]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                            <span>Với 3 Nhà:</span> <strong>{currentSelectedProp.rentPrices[3]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                            <span>Với Khách Sạn:</span> <strong>{currentSelectedProp.rentPrices[5]}K</strong>
                        </div>
                    </div>

                    {/* Build Button if owner owns color monopoly */}
                    {currentSelectedProp.housePrice > 0 && currentSelectedProp.ownerId === user.id && currentSelectedProp.housesBuilt < 5 && (
                      ownsAllOfGroup(me, currentSelectedProp) ? (
                        <button 
                            className="btn btn-primary" 
                            style={{ 
                                width: '100%', 
                                marginTop: 16, 
                                borderRadius: 12, 
                                background: '#4CAF50',
                                borderColor: '#4CAF50',
                                fontWeight: 'bold'
                            }} 
                            disabled={!isMyTurn || (me?.money || 0) < currentSelectedProp.housePrice}
                            onClick={() => handleBuild(currentSelectedProp.id)}
                        >
                            🔨 Xây {currentSelectedProp.housesBuilt === 4 ? 'Khách Sạn' : 'Nhà'} ({currentSelectedProp.housePrice}K)
                        </button>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: '#ff9800', marginTop: 12, fontStyle: 'italic', fontWeight: '500' }}>
                            ⚠️ Cần sở hữu đầy đủ nhóm màu để bắt đầu xây dựng!
                        </div>
                      )
                    )}

                    <button className="btn btn-secondary" style={{ width: '100%', marginTop: 12, borderRadius: 12 }} onClick={() => setSelectedProp(null)}>ĐÓNG</button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT PANEL: Players & Logs */}
      <div className="monopoly-sidebar">
        
        {/* Players List */}
        <div style={{ padding: 20, borderBottom: '2px solid var(--border)' }}>
            <h3 style={{ marginBottom: 16 }}>👥 Người Chơi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {gameState.players.map(p => (
                    <div key={p.id} style={{ 
                        padding: 12, borderRadius: 8, 
                        background: p.id === gameState.players[gameState.currentTurnIndex]?.id ? '#fff3cd' : '#f8f9fa',
                        border: p.id === gameState.players[gameState.currentTurnIndex]?.id ? '2px solid #ffe082' : '2px solid transparent',
                        opacity: p.bankrupt ? 0.6 : 1
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800 }}>
                              {p.username} {p.id === user.id && '(Bạn)'}
                              {p.isAI && <span style={{ marginLeft: 6, fontSize: '0.75rem', background: '#e0e0e0', padding: '2px 6px', borderRadius: 4, color: '#666' }}>AI</span>}
                            </div>
                            <div style={{ color: p.bankrupt ? '#757575' : '#4CAF50', fontWeight: 800 }}>
                              {p.bankrupt ? 'Đã phá sản' : `$${p.money}k`}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {p.inJail && <span style={{ background: '#e53935', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold' }}>Ngồi Tù</span>}
                          {p.bankrupt && <span style={{ background: '#757575', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold' }}>Phá Sản</span>}
                        </div>

                        {/* List of properties owned by this player */}
                        {p.propertiesOwned && p.propertiesOwned.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {p.propertiesOwned.map(propId => {
                                  const prop = gameState.board[propId];
                                  if (!prop) return null;
                                  return (
                                      <span 
                                          key={propId} 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedProp(prop);
                                          }}
                                          style={{
                                              fontSize: '0.7rem',
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              background: getColorGroupColor(prop.colorGroup),
                                              color: prop.colorGroup === 'YELLOW' ? '#000' : '#fff',
                                              cursor: 'pointer',
                                              fontWeight: '600',
                                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                          }}
                                      >
                                          {prop.name} {prop.housesBuilt > 0 && (prop.housesBuilt === 5 ? '🏨' : `🏠${prop.housesBuilt}`)}
                                      </span>
                                  );
                              })}
                          </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Logs */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', background: '#f8f9fa' }}>
            <h3 style={{ marginBottom: 16 }}>📝 Lịch Sử</h3>
            {gameState.logs.map((log, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'white', borderRadius: 8, marginBottom: 8, fontSize: '0.9rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {log}
                </div>
            ))}
            <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
