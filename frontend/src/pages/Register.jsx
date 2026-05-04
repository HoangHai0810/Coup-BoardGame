import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Mật khẩu xác nhận không khớp!');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Mật khẩu cần ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      toast.success('Tạo tài khoản thành công! Chào mừng! 🎉');
      navigate('/lobby');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Đăng ký thất bại');
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
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎮</div>
            <h1 className="display-font" style={{ fontSize: '1.8rem', marginBottom: 8 }}>
              Tạo tài khoản
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Miễn phí — tham gia cộng đồng BoardRealm!
            </p>
          </div>

          <div className="glass" style={{ padding: 32, borderRadius: 'var(--radius-xl)' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên đăng nhập</label>
                <input className="input"
                  type="text" placeholder="vd: couplord2024"
                  value={form.username} minLength={3} maxLength={50}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="input"
                  type="email" placeholder="email@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                />
              </div>
              <div className="form-group">
                <label>Mật khẩu</label>
                <input className="input"
                  type="password" placeholder="ít nhất 6 ký tự"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required
                />
              </div>
              <div className="form-group">
                <label>Xác nhận mật khẩu</label>
                <input className="input"
                  type="password" placeholder="nhập lại mật khẩu"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required
                />
              </div>

              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '1rem', marginTop: 8 }}
                disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo tài khoản 🎉'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: 'var(--accent-gold)', fontWeight: 600, textDecoration: 'none' }}>
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
