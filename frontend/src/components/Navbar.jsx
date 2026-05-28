import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">♟ BoardRealm</Link>

        <div className="navbar-actions">
          <LanguageSwitcher />
          {user ? (
            <>
              <Link to="/lobby" className="btn btn-ghost" style={{ padding: '8px 16px' }}>
                🎮 <span className="navbar-btn-text">{t('nav.lobby')}</span>
              </Link>
              <Link to="/leaderboard" className="btn btn-ghost" style={{ padding: '8px 16px' }}>
                🏆 <span className="navbar-btn-text">{t('nav.leaderboard')}</span>
              </Link>
              <div className="navbar-user">
                <img src={user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
                     alt={user.username} className="avatar-sm" />
                <span className="navbar-username" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.username}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '8px 14px' }}>
                🚪 <span className="navbar-btn-text">{t('nav.logout')}</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">{t('nav.login')}</Link>
              <Link to="/register" className="btn btn-primary">{t('nav.register')}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
