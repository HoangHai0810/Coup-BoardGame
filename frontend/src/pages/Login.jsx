import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.usernameOrEmail, form.password);
      toast.success('Chào mừng trở lại!');
      navigate('/lobby');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎭</div>
            <h1 className="display-font" style={{ fontSize: '1.8rem', marginBottom: 8 }}>
              Đăng nhập
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Chào mừng trở lại, chiến binh!
            </p>
          </div>

          {/* Form */}
          <div className="glass" style={{ padding: 32, borderRadius: 'var(--radius-xl)' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên đăng nhập hoặc Email</label>
                <input className="input"
                  type="text"
                  placeholder="username hoặc email@example.com"
                  value={form.usernameOrEmail}
                  onChange={e => setForm(f => ({ ...f, usernameOrEmail: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu</label>
                <input className="input"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '1rem', marginTop: 8 }}
                disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập →'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: 'var(--accent-gold)', fontWeight: 600, textDecoration: 'none' }}>
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
