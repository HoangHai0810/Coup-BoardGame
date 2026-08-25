import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isSoundEnabled, setGameSoundEnabled } from '../services/gameAudio';

export default function SoundToggle() {
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState(isSoundEnabled);
  if (['/login', '/register'].includes(pathname)) return null;
  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setGameSoundEnabled(next);
  };
  return <button className="sound-toggle" onClick={toggle} aria-label={enabled ? 'Tắt âm thanh' : 'Bật âm thanh'} title={enabled ? 'Tắt âm thanh' : 'Bật âm thanh'}>{enabled ? '🔊' : '🔇'}</button>;
}
