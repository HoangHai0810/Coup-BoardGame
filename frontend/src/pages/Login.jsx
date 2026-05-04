import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.usernameOrEmail, form.password);
      toast.success(t('auth.loginTitle'));
      navigate('/lobby');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
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
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎭</div>
            <h1 className="display-font" style={{ fontSize: '2.2rem', marginBottom: 8, color: 'var(--text-primary)' }}>
              {t('nav.login')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 700 }}>
              {t('auth.loginTitle')}
            </p>
          </motion.div>

          {/* Form */}
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }} className="card" style={{ padding: 40, borderRadius: 'var(--radius-xl)' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('auth.username')} / Email</label>
                <input className="input"
                  type="text"
                  placeholder="username / email@example.com"
                  value={form.usernameOrEmail}
                  onChange={e => setForm(f => ({ ...f, usernameOrEmail: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('auth.password')}</label>
                <input className="input"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '1.1rem', marginTop: 12 }}
                disabled={loading}>
                {loading ? '...' : `${t('auth.loginBtn')} →`}
              </button>
            </form>
          </motion.div>

          <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600 }}>
            {t('auth.noAccount')}{' '}
            <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>
              {t('nav.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
