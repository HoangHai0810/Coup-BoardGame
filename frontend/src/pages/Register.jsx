import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      toast.success(t('auth.registerTitle'));
      navigate('/lobby');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const FIELDS = [
    { key: 'username', type: 'text', placeholder: 'CoolPlayer99', icon: '🧙', label: t('auth.username') },
    { key: 'email',    type: 'email', placeholder: 'hello@example.com', icon: '📧', label: 'Email' },
    { key: 'password', type: 'password', placeholder: '••••••••', icon: '🔐', label: t('auth.password') },
  ];

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      {/* Ambient blobs */}
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '55vw', height: '55vw',
        background: 'var(--accent-purple)', filter: 'blur(160px)', opacity: 0.09,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: '45vw', height: '45vw',
        background: 'var(--accent-pink)', filter: 'blur(150px)', opacity: 0.07,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }} />

      <Navbar />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Title */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120 }}
            style={{ textAlign: 'center', marginBottom: 40 }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: '4rem', marginBottom: 16, display: 'inline-block', filter: 'drop-shadow(0 0 20px rgba(236,72,153,0.5))' }}
            >
              🚀
            </motion.div>
            <h1 className="display-font" style={{
              fontSize: '2.8rem', marginBottom: 10,
              background: 'linear-gradient(135deg, var(--accent-primary-light), var(--accent-pink))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {t('nav.register')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
              {t('auth.registerTitle')}
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
              {FIELDS.map((field, i) => (
                <motion.div
                  key={field.key}
                  className="form-group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  style={{ marginBottom: i === FIELDS.length - 1 ? 28 : 20 }}
                >
                  <label style={{ fontSize: '0.78rem', letterSpacing: '1.5px' }}>{field.label}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      onFocus={() => setFocusedField(field.key)}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={{
                        paddingLeft: 46, borderRadius: 14, fontSize: '0.95rem',
                        borderColor: focusedField === field.key ? 'var(--accent-primary-light)' : undefined,
                        boxShadow: focusedField === field.key ? '0 0 0 3px rgba(139,92,246,0.15)' : undefined,
                        transition: 'all 0.2s ease',
                      }}
                    />
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>
                      {field.icon}
                    </span>
                  </div>
                </motion.div>
              ))}

              <motion.button
                type="submit"
                className="btn btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{ width: '100%', padding: '16px', fontSize: '1.05rem', borderRadius: 16 }}
                disabled={loading}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                      <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      Creating account...
                    </motion.span>
                  ) : (
                    <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {t('auth.registerBtn')} 🚀
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: '0.95rem' }}
          >
            {t('auth.hasAccount')}{' '}
            <Link to="/login" style={{ color: 'var(--accent-primary-light)', fontWeight: 800, textDecoration: 'none' }}>
              {t('nav.login')} →
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
