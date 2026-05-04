import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo">♟ BoardRealm</Link>

        <div className="navbar-actions">
          {user ? (
            <>
              <Link to="/lobby" className="btn btn-ghost" style={{ padding: '8px 16px' }}>
                🎮 Lobby
              </Link>
              <div className="navbar-user">
                <img src={user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
                     alt={user.username} className="avatar-sm" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.username}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '8px 14px' }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Log In</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
