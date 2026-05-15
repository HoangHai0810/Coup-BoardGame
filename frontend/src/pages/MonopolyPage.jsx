import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function MonopolyPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { send, subscribe, connected } = useSocket();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (!connected) return;
    const unsub = subscribe(`/topic/game/${roomId}`, state => {
      setGameState(state);
    });
    send(`/app/game/${roomId}/connect`, {});
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

  return (
    <div className="page" style={{ 
      display: 'flex', height: '100vh', overflow: 'hidden', 
      background: 'linear-gradient(135deg, #1a1c2c 0%, #4a192c 100%)',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* LEFT PANEL: Game Board */}
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ 
          width: 720, height: 720, 
          background: 'white', 
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          borderRadius: 12,
          position: 'relative',
          padding: 10,
          border: '4px solid #333'
        }}>
          <div style={{
            width: '100%', height: '100%',
            backgroundImage: 'url(/assets/monopoly_board.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative'
          }}>
            {/* Clickable Overlay for properties */}
            {Array.from({length: 40}).map((_, i) => {
                let x, y;
                if (i <= 10) { x = 10 - i; y = 10; }
                else if (i <= 20) { x = 0; y = 20 - i; }
                else if (i <= 30) { x = i - 20; y = 0; }
                else { x = 10; y = i - 30; }
                const unit = 100 / 11;
                return (
                    <div 
                        key={i} 
                        onClick={() => handlePropClick(i)}
                        style={{
                            position: 'absolute',
                            left: `${x * unit}%`, top: `${y * unit}%`,
                            width: `${unit}%`, height: `${unit}%`,
                            cursor: gameState.board[i] ? 'pointer' : 'default',
                            zIndex: 10
                        }}
                    />
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
                <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333', background: 'rgba(255,255,255,0.8)', padding: '8px 24px', borderRadius: 30, border: '2px solid #333' }}>
                  {isMyTurn ? '🔥 ĐẾN LƯỢT BẠN!' : `⌛ Đợi ${gameState.players[gameState.currentTurnIndex]?.username}...`}
                </motion.div>
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
        </div>

        {/* Controls */}
        <div style={{ 
          marginTop: 40, padding: '24px 48px', 
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
          borderRadius: 100, display: 'flex', gap: 24,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
            <button 
              className={`btn ${isMyTurn && gameState.phase === 'ROLL' ? 'btn-primary' : 'btn-secondary'}`} 
              disabled={!isMyTurn || gameState.phase !== 'ROLL'} 
              onClick={handleRoll}
              style={{ padding: '16px 40px', borderRadius: 50, fontSize: '1.1rem', fontWeight: 800 }}
            >
                🎲 Đổ Xúc Xắc
            </button>
            <button 
              className={`btn ${isMyTurn && gameState.phase === 'BUY' ? 'btn-primary' : 'btn-secondary'}`} 
              disabled={!isMyTurn || gameState.phase !== 'BUY'} 
              onClick={handleBuy}
              style={{ padding: '16px 40px', borderRadius: 50, fontSize: '1.1rem', fontWeight: 800, background: isMyTurn && gameState.phase === 'BUY' ? '#4CAF50' : undefined }}
            >
                💰 Mua Đất
            </button>
            <button 
              className={`btn ${isMyTurn && (gameState.phase === 'END_TURN' || gameState.phase === 'BUY') ? 'btn-primary' : 'btn-secondary'}`} 
              disabled={!isMyTurn || (gameState.phase !== 'END_TURN' && gameState.phase !== 'BUY')} 
              onClick={handleEndTurn}
              style={{ padding: '16px 40px', borderRadius: 50, fontSize: '1.1rem', fontWeight: 800, background: isMyTurn && (gameState.phase === 'END_TURN' || gameState.phase === 'BUY') ? '#FF9800' : undefined }}
            >
                ⏭ Kết Thúc Lượt
            </button>
        </div>
      </div>

      {/* Property Modal */}
      <AnimatePresence>
        {selectedProp && (
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
                <div style={{ height: 80, background: selectedProp.colorGroup === 'DARK_BLUE' ? '#0d47a1' : selectedProp.colorGroup === 'GREEN' ? '#1b5e20' : selectedProp.colorGroup === 'RED' ? '#b71c1c' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <h2 style={{ margin: 0 }}>THẺ TÀI SẢN</h2>
                </div>
                <div style={{ padding: 24, textAlign: 'center' }}>
                    <h1 style={{ marginBottom: 8 }}>{selectedProp.name}</h1>
                    <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: 20 }}>GIÁ: {selectedProp.price}K</div>
                    <div style={{ textAlign: 'left', background: '#f5f5f5', padding: 16, borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span>Thuê cơ bản:</span> <strong>{selectedProp.rentPrices[0]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span>Với 1 Nhà:</span> <strong>{selectedProp.rentPrices[1]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span>Với 2 Nhà:</span> <strong>{selectedProp.rentPrices[2]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span>Với 3 Nhà:</span> <strong>{selectedProp.rentPrices[3]}K</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span>Với Khách Sạn:</span> <strong>{selectedProp.rentPrices[5]}K</strong>
                        </div>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 24, borderRadius: 12 }} onClick={() => setSelectedProp(null)}>ĐÓNG</button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT PANEL: Players & Logs */}
      <div style={{ width: 400, background: 'white', borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Players List */}
        <div style={{ padding: 20, borderBottom: '2px solid var(--border)' }}>
            <h3 style={{ marginBottom: 16 }}>👥 Người Chơi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {gameState.players.map(p => (
                    <div key={p.id} style={{ 
                        padding: 12, borderRadius: 8, 
                        background: p.id === gameState.players[gameState.currentTurnIndex].id ? '#fff3cd' : '#f8f9fa',
                        border: p.id === gameState.players[gameState.currentTurnIndex].id ? '2px solid #ffe082' : '2px solid transparent'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800 }}>{p.username} {p.id === user.id && '(Bạn)'}</div>
                            <div style={{ color: '#4CAF50', fontWeight: 800 }}>${p.money}k</div>
                        </div>
                        {p.inJail && <span className="badge" style={{ background: 'red', color: 'white', marginTop: 8 }}>Ngồi Tù</span>}
                    </div>
                ))}
            </div>
        </div>

        {/* Logs */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', background: '#f8f9fa' }}>
            <h3 style={{ marginBottom: 16 }}>📝 Lịch Sử</h3>
            {gameState.logs.map((log, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'white', borderRadius: 8, marginBottom: 8, fontSize: '0.9rem' }}>
                    {log}
                </div>
            ))}
            <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
