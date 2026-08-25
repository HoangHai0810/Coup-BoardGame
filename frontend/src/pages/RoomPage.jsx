import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';

const GAME_META = { COUP: ['Coup', '♛'], UNO: ['UNO', '◉'], KITTENS: ['Mèo Nổ', '✹'], MONOPOLY: ['Cờ Tỷ Phú', '◆'] };

function Avatar({ player, label }) {
  return player.avatarUrl ? <img className="table-avatar" src={player.avatarUrl} alt={label} /> : <div className="table-avatar table-avatar-fallback">{label.slice(0, 1).toUpperCase()}</div>;
}

export default function RoomPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { send, connected } = useSocket();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadRoom = async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}`);
        if (!active) return;
        setRoom(data);
        if (data.status === 'IN_GAME') navigate(`/game/${data.gameType.toLowerCase()}/${roomId}`, { replace: true });
      } catch (error) {
        if (!active) return;
        toast.error(error.response?.status === 404 ? t('room.dissolved', 'Phòng chơi không còn tồn tại.') : t('room.loadError', 'Không thể tải phòng chơi.'));
        navigate('/lobby', { replace: true });
      } finally { if (active) setLoading(false); }
    };
    loadRoom();
    const timer = window.setInterval(loadRoom, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, [navigate, roomId, t]);

  const handleCopyCode = async () => {
    try { await navigator.clipboard.writeText(roomId); toast.success(t('room.codeCopied', 'Đã sao chép mã phòng!')); }
    catch { toast.error(t('room.copyFailed', 'Không thể sao chép. Hãy sao chép mã thủ công.')); }
  };

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    try { await api.post(`/rooms/${roomId}/leave`); navigate('/lobby'); }
    catch { toast.error(t('room.leaveError', 'Không thể rời phòng. Vui lòng thử lại.')); setLeaving(false); }
  };

  if (loading) return <div className="game-loading"><span className="game-loading-spinner" /><p>{t('room.loading', 'Đang chuẩn bị bàn chơi...')}</p></div>;
  if (!room) return null;
  const isHost = room.hostId === user?.id;
  const maxPlayers = room.maxPlayers || 4;
  const players = [...(room.players || []).map(player => ({ ...player, kind: 'human' })), ...Array.from({ length: room.aiCount || 0 }, (_, index) => ({ id: `ai-${index}`, username: `Bot ${index + 1}`, kind: 'ai' }))];
  const seats = [...players, ...Array.from({ length: Math.max(0, maxPlayers - players.length) }, (_, index) => ({ id: `empty-${index}`, kind: 'empty' }))];
  const [gameName, gameIcon] = GAME_META[room.gameType] || GAME_META.COUP;

  return <main className="room-page">
    <Navbar />
    <section className="room-shell">
      <header className="room-topbar"><div><span className="room-eyebrow">{gameIcon} {gameName}</span><h1>{room.name}</h1></div><button className="room-code" onClick={handleCopyCode}><span>{t('room.code', 'Mã phòng')}</span><strong>{roomId}</strong><b>⧉</b></button></header>
      <div className="room-content">
        <section className="waiting-table-wrap">
          <div className="lounge-backdrop"><i /><i /><i /></div>
          <div className="waiting-table">
            <div className="table-inlay"><div className="table-center-mark"><span>{gameIcon}</span><strong>{gameName}</strong><small>{players.length}/{maxPlayers} {t('room.seated', 'đã vào bàn')}</small></div></div>
            {seats.map((player, index) => {
              const seatClass = `seat-${index % 6}`;
              if (player.kind === 'empty') return <div key={player.id} className={`table-seat empty-seat ${seatClass}`}><div className="empty-avatar">+</div><span>{t('room.waitingSlot', 'Đang chờ...')}</span></div>;
              const label = player.username || 'Player';
              return <motion.div key={player.id} className={`table-seat ${seatClass} ${player.id === user?.id ? 'is-me' : ''}`} initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }}><Avatar player={player} label={label} /><div className="seat-name"><strong>{label}</strong><span>{player.kind === 'ai' ? 'AI' : player.id === room.hostId ? `♛ ${t('room.hostBadge', 'Chủ phòng')}` : t('room.ready', 'Sẵn sàng')}</span></div></motion.div>;
            })}
          </div>
          <div className="room-actions">{isHost ? <button className="btn btn-primary room-start" disabled={players.length < 2 || !connected} onClick={() => send(`/app/game/${roomId}/start`, {})}>{connected ? `▶ ${t('room.start', 'Bắt đầu trận')}` : t('room.connecting', 'Đang kết nối...')}</button> : <div className="waiting-message"><i />{t('room.waiting', 'Đang chờ chủ phòng bắt đầu...')}</div>}<button className="btn room-leave" disabled={leaving} onClick={handleLeave}>{leaving ? '...' : `↩ ${t('room.leave', 'Rời phòng')}`}</button></div>
        </section>
        <aside className="room-chat"><ChatBox roomId={roomId} /></aside>
      </div>
    </section>
  </main>;
}
