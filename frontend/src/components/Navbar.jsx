import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useTheme } from '../contexts/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

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
          
          <button 
            onClick={toggleTheme} 
            className="btn btn-ghost" 
            style={{ 
              padding: 0, 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              fontSize: '1.2rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user ? (
            <>
              <Link to="/lobby" className="btn btn-ghost" style={{ padding: '8px 16px' }}>
                🎮 <span className="navbar-btn-text">{t('nav.lobby')}</span>
              </Link>
              <Link to="/leaderboard" className="btn btn-ghost" style={{ padding: '8px 16px' }}>
                🏆 <span className="navbar-btn-text">{t('nav.leaderboard')}</span>
              </Link>
              <div className="navbar-user" style={{ background: 'var(--bg-card)', border: 'var(--border-thick)', color: 'var(--text-primary)' }}>
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
