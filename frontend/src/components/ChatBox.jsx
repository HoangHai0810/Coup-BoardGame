import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatBox({ roomId = 'global', mode = roomId === 'global' ? 'inline' : 'floating' }) {
    const { send, subscribe, connected } = useSocket();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isMinimized, setIsMinimized] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [wiggleState, setWiggleState] = useState('idle');
    const scrollRef = useRef();

    useEffect(() => {
        if (!connected) return;

        const topic = roomId === 'global' ? '/topic/chat/global' : `/topic/chat/room/${roomId}`;
        const unsub = subscribe(topic, (msg) => {
            setMessages(prev => [...prev, msg].slice(-50)); // Keep last 50
            
            // Check if we should alert for new message
            if (msg.senderId !== user?.id) {
                if (mode === 'floating' && isMinimized) {
                    setUnreadCount(prev => prev + 1);
                    setWiggleState('wiggle');
                    setTimeout(() => setWiggleState('idle'), 500);
                }
            }
        });

        return unsub;
    }, [roomId, connected, subscribe, mode, isMinimized, user?.id]);

    useEffect(() => {
        if (!isMinimized || mode === 'inline') {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isMinimized, mode]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || !connected) return;

        const destination = roomId === 'global' ? '/app/chat/global' : `/app/chat/room/${roomId}`;
        send(destination, { content: input });
        setInput('');
    };

    const toggleOpen = () => {
        setIsMinimized(!isMinimized);
        setUnreadCount(0);
    };

    const wiggleVariants = {
        idle: { scale: 1 },
        wiggle: {
            x: [0, -8, 8, -8, 8, -4, 4, 0],
            rotate: [0, -10, 10, -10, 10, -5, 5, 0],
            transition: { duration: 0.5, ease: 'easeInOut' }
        }
    };

    const chatContent = (
        <div className="chat-box card" style={{ 
            height: mode === 'inline' ? '400px' : '450px', 
            width: mode === 'inline' ? '100%' : '350px',
            display: 'flex', 
            flexDirection: 'column', 
            padding: 0, 
            overflow: 'hidden',
            boxShadow: mode === 'inline' ? 'none' : '0 12px 30px rgba(0,0,0,0.25)',
            border: '1px solid var(--border)',
            background: mode === 'inline' ? 'var(--card-bg)' : 'rgba(28, 28, 30, 0.95)',
            backdropFilter: mode === 'inline' ? 'none' : 'blur(20px)',
            borderRadius: '24px'
        }}>
            <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid var(--border)', 
                background: 'rgba(255,255,255,0.03)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8, color: 'white', fontWeight: 850 }}>
                    💬 {roomId === 'global' ? 'Global Chat' : 'Room Chat'}
                </h4>
                {mode === 'floating' && (
                    <button 
                        onClick={toggleOpen} 
                        style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: 'rgba(255,255,255,0.5)', 
                            fontSize: '1.2rem', 
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ 
                        alignSelf: m.senderId === user?.id ? 'flex-end' : 'flex-start',
                        maxWidth: '80%'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4, textAlign: m.senderId === user?.id ? 'right' : 'left', fontWeight: 600 }}>
                            {m.senderName}
                        </div>
                        <div style={{ 
                            padding: '10px 14px', 
                            borderRadius: '18px', 
                            background: m.senderId === user?.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '0.9rem',
                            wordBreak: 'break-word',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            fontWeight: 500,
                            lineHeight: 1.4
                        }}>
                            {m.content}
                        </div>
                    </div>
                ))}
                <div ref={scrollRef} />
            </div>

            <form onSubmit={handleSend} style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'rgba(0,0,0,0.1)' }}>
                <input 
                    className="input" 
                    value={input} 
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message..."
                    style={{ 
                        flex: 1, 
                        padding: '10px 16px', 
                        fontSize: '0.9rem', 
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white'
                    }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 18px', borderRadius: '12px' }} disabled={!input.trim()}>
                    Send
                </button>
            </form>
        </div>
    );

    if (mode === 'inline') {
        return chatContent;
    }

    return (
        <div style={{ position: 'fixed', right: '24px', bottom: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 }}>
            {/* Popover chat */}
            <AnimatePresence>
                {!isMinimized && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                        {chatContent}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Bubble */}
            <motion.div
                variants={wiggleVariants}
                animate={wiggleState}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleOpen}
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    border: '3px solid white'
                }}
            >
                <span style={{ fontSize: '1.8rem' }}>💬</span>
                
                {/* Red badge */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                background: '#e74c3c',
                                color: 'white',
                                borderRadius: '50%',
                                minWidth: '22px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px 6px',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                                border: '2px solid white',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                                justifyContent: 'center'
                            }}
                        >
                            {unreadCount}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
