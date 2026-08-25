import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { playGameSound, pulseBackgroundMusic, startBackgroundMusic, stopBackgroundMusic } from '../services/gameAudio';

const effectForButton = (button) => {
  const label = `${button?.innerText || ''} ${button?.getAttribute('aria-label') || ''}`.toLowerCase();
  if (/bắt đầu|tạo phòng|tham gia|mua|xây|xác nhận/.test(label)) return 'success';
  if (/rời|đăng xuất|hủy|đóng|trở về/.test(label)) return 'alert';
  if (/xúc xắc|rút bài/.test(label)) return null;
  return 'ui';
};

export default function GameSoundscape() {
  const { pathname } = useLocation();
  const musicAwakenedRef = useRef(false);
  const isLobby = pathname === '/lobby' || pathname.startsWith('/room/');
  const isGame = pathname.startsWith('/game/') || pathname.startsWith('/preview/');

  useEffect(() => {
    const onClick = (event) => {
      const button = event.target.closest('button, [role="button"], a');
      if (!button || button.disabled || button.classList.contains('sound-toggle')) return;
      const effect = effectForButton(button);
      if (effect) playGameSound(effect);
      if ((isLobby || isGame) && !musicAwakenedRef.current) {
        musicAwakenedRef.current = true;
        pulseBackgroundMusic();
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isLobby, isGame]);

  useEffect(() => {
    musicAwakenedRef.current = false;
    if (isLobby) startBackgroundMusic('lobby');
    else if (isGame) startBackgroundMusic('game');
    else stopBackgroundMusic();
    return undefined;
  }, [isLobby, isGame]);

  return null;
}
