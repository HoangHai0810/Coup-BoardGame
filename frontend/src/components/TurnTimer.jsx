import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TurnTimer({ currentPlayerId, currentPlayerName, currentUserId, isActive = true }) {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    setTimeLeft(30);
  }, [currentPlayerId]);

  useEffect(() => {
    if (!isActive || !currentPlayerId) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPlayerId, isActive]);

  const percentage = (timeLeft / 30) * 100;
  const isMyTurn = currentPlayerId === currentUserId;

  // Determine color based on time left
  let timerColor = '#2ecc71'; // Green
  let isUrgent = false;
  if (timeLeft <= 15 && timeLeft > 5) {
    timerColor = '#e67e22'; // Orange
  } else if (timeLeft <= 5) {
    timerColor = '#e74c3c'; // Red
    isUrgent = true;
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '12px auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.9rem', fontWeight: 800 }}>
        <span style={{ color: isMyTurn ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
          {isMyTurn ? '⚡ Lượt của bạn' : `👤 Lượt của ${currentPlayerName}`}
        </span>
        <motion.span 
          animate={isUrgent ? { scale: [1, 1.2, 1], color: ['#e74c3c', '#ffffff', '#e74c3c'] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
          style={{ color: timerColor }}
        >
          {timeLeft}s
        </motion.span>
      </div>

      {/* Progress Bar container */}
      <div style={{ 
        width: '100%', 
        height: '8px', 
        background: 'rgba(255,255,255,0.1)', 
        borderRadius: '4px', 
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
      }}>
        <motion.div 
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%`, backgroundColor: timerColor }}
          transition={{ duration: 1, ease: 'linear' }}
          style={{ 
            height: '100%', 
            borderRadius: '4px',
            boxShadow: isUrgent ? `0 0 8px ${timerColor}` : 'none'
          }}
        />
      </div>
    </div>
  );
}
