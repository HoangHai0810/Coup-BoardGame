import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

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
    <div className="page" style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      {/* Ambient background */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw',
        background: 'var(--accent-primary)', filter: 'blur(160px)', opacity: 0.1,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw',
        background: 'var(--accent-cyan)', filter: 'blur(140px)', opacity: 0.08,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      {/* Animated grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }} />

      <Navbar />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Title */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120 }}
            style={{ textAlign: 'center', marginBottom: 40 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: '4rem', marginBottom: 16, display: 'inline-block', filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.6))' }}
            >
              🎭
            </motion.div>
            <h1 className="display-font text-gradient" style={{ fontSize: '2.8rem', marginBottom: 10 }}>
              {t('nav.login')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
              {t('auth.loginTitle')}
            </p>
          </motion.div>

          {/* Form Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18, delay: 0.15 }}
            className="glass-premium"
            style={{ padding: 40, borderRadius: 32 }}
          >
            <form onSubmit={handleSubmit}>
              {/* Username */}
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', letterSpacing: '1.5px' }}>
                  {t('auth.username')} / Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type="text"
                    placeholder="username / email@example.com"
                    value={form.usernameOrEmail}
                    onChange={e => setForm(f => ({ ...f, usernameOrEmail: e.target.value }))}
                    onFocus={() => setFocusedField('user')}
                    onBlur={() => setFocusedField(null)}
                    required
                    style={{ paddingLeft: 44, borderRadius: 14, fontSize: '0.95rem',
                      borderColor: focusedField === 'user' ? 'var(--accent-primary-light)' : undefined }}
                  />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>👤</span>
                </div>
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: 28 }}>
                <label style={{ fontSize: '0.78rem', letterSpacing: '1.5px' }}>
                  {t('auth.password')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onFocus={() => setFocusedField('pass')}
                    onBlur={() => setFocusedField(null)}
                    required
                    style={{ paddingLeft: 44, borderRadius: 14, fontSize: '0.95rem',
                      borderColor: focusedField === 'pass' ? 'var(--accent-primary-light)' : undefined }}
                  />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>🔐</span>
                </div>
              </div>

              <motion.button
                type="submit"
                className="btn btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{ width: '100%', padding: '16px', fontSize: '1.05rem', borderRadius: 16, position: 'relative', overflow: 'hidden' }}
                disabled={loading}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                      <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      Authenticating...
                    </motion.span>
                  ) : (
                    <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {t('auth.loginBtn')} →
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: '0.95rem' }}
          >
            {t('auth.noAccount')}{' '}
            <Link to="/register" style={{ color: 'var(--accent-primary-light)', fontWeight: 800, textDecoration: 'none' }}>
              {t('nav.register')} →
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
