import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatBox({ roomId = 'global' }) {
    const { send, subscribe, connected } = useSocket();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const scrollRef = useRef();

    useEffect(() => {
        if (!connected) return;

        const topic = roomId === 'global' ? '/topic/chat/global' : `/topic/chat/room/${roomId}`;
        const unsub = subscribe(topic, (msg) => {
            setMessages(prev => [...prev, msg].slice(-50)); // Keep last 50
        });

        return unsub;
    }, [roomId, connected, subscribe]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || !connected) return;

        const destination = roomId === 'global' ? '/app/chat/global' : `/app/chat/room/${roomId}`;
        send(destination, { content: input });
        setInput('');
    };

    return (
        <div className="chat-box card" style={{ height: '400px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    💬 {roomId === 'global' ? 'Global Chat' : 'Room Chat'}
                </h4>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ 
                        alignSelf: m.senderId === user?.id ? 'flex-end' : 'flex-start',
                        maxWidth: '80%'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4, textAlign: m.senderId === user?.id ? 'right' : 'left' }}>
                            {m.senderName}
                        </div>
                        <div style={{ 
                            padding: '8px 12px', 
                            borderRadius: 12, 
                            background: m.senderId === user?.id ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '0.9rem',
                            wordBreak: 'break-word'
                        }}>
                            {m.content}
                        </div>
                    </div>
                ))}
                <div ref={scrollRef} />
            </div>

            <form onSubmit={handleSend} style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input 
                    className="input" 
                    value={input} 
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={!input.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
}
