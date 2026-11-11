import { useState } from 'react'
import { Shield, ShieldAlert, User, Key, Mail, Lock, AlertCircle, Sparkles } from 'lucide-react'
import { supabase } from './supabaseClient'
import { DEMO_RANGER_EMAIL } from './services/authService'

export default function Login({ onRangerSuccess, onGuestLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const isConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
  )

  const handleRangerLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (error) {
        setErrorMsg(error.message || 'Invalid Ranger credentials.')
        setLoading(false)
        return
      }

      if (data?.session) {
        if (onRangerSuccess) {
          onRangerSuccess(data.session)
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to connect to Supabase Auth service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Brand Header */}
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <Shield size={28} style={{ color: '#00f0ff' }} />
          </div>
          <h1 style={styles.title}>ECOSENTRY ACCESS PORTAL</h1>
          <p style={styles.subtitle}>Autonomous Biosphere Surveillance &amp; Acoustic Mesh Grid</p>
        </div>

        {/* Demo Credentials Helper Pill */}
        <div style={styles.demoPill}>
          <span style={styles.demoPillLabel}>DEMO CREDENTIALS:</span>
          <span style={styles.demoPillVal}>{DEMO_RANGER_EMAIL} • password: ecosentry</span>
        </div>

        {errorMsg && (
          <div style={styles.errorBox}>
            <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Ranger Login Form (Full Access) */}
        <form onSubmit={handleRangerLogin} style={styles.form}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>RANGER LOGIN — FULL ACCESS</span>
            <span style={styles.sectionBadge}>ADMIN</span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <Mail size={12} style={{ color: '#00f0ff' }} />
              <span>Ranger Email</span>
            </label>
            <input
              type="email"
              required
              placeholder="ranger@ecosentry.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              autoComplete="username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <Lock size={12} style={{ color: '#00f0ff' }} />
              <span>Security Key / Password</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={styles.rangerButton}
          >
            <Key size={14} />
            <span>{loading ? 'Authenticating with Supabase...' : 'Sign In as Ranger'}</span>
          </button>
        </form>

        {/* Divider */}
        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>OR EXPLORE GRID</span>
          <div style={styles.dividerLine} />
        </div>

        {/* 2. Guest Login (Restricted Access) */}
        <div style={styles.guestSection}>
          <button
            type="button"
            onClick={onGuestLogin}
            style={styles.guestButton}
          >
            <User size={14} />
            <span>Guest Login (Restricted Access)</span>
          </button>
          <p style={styles.guestNotice}>
            🔒 Guest mode: View maps, topology, &amp; routing simulations. Email alerts are permanently disabled.
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#02060b',
    backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(6, 182, 212, 0.08) 0%, rgba(2, 6, 11, 0.95) 75%)',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    padding: '1.5rem',
    boxSizing: 'border-box'
  },
  card: {
    backgroundColor: '#030a12',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    borderRadius: '8px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.1)',
    width: '100%',
    maxWidth: '430px',
    padding: '2rem',
    color: '#e2e8f0',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.25rem'
  },
  logoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    background: 'rgba(6, 182, 212, 0.12)',
    border: '1px solid rgba(6, 182, 212, 0.35)',
    marginBottom: '0.75rem'
  },
  title: {
    margin: '0 0 0.25rem 0',
    color: '#00f0ff',
    fontSize: '1.15rem',
    fontWeight: 800,
    letterSpacing: '0.12em',
    fontFamily: 'JetBrains Mono, monospace'
  },
  subtitle: {
    margin: 0,
    color: '#64748b',
    fontSize: '0.75rem',
    letterSpacing: '0.04em'
  },
  demoPill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '6px 10px',
    background: 'rgba(6, 182, 212, 0.08)',
    border: '1px dashed rgba(6, 182, 212, 0.3)',
    borderRadius: '4px',
    marginBottom: '1.25rem',
    fontSize: '0.72rem',
    fontFamily: 'JetBrains Mono, monospace'
  },
  demoPillLabel: {
    color: '#00f0ff',
    fontWeight: 700
  },
  demoPillVal: {
    color: '#cbd5e1'
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#fca5a5',
    padding: '0.75rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    marginBottom: '1rem',
    lineHeight: 1.4
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.2rem'
  },
  sectionTitle: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.08em',
    fontFamily: 'JetBrains Mono, monospace'
  },
  sectionBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    padding: '1px 6px',
    borderRadius: '3px',
    fontFamily: 'JetBrains Mono, monospace'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: '#cbd5e1',
    fontWeight: 600
  },
  input: {
    width: '100%',
    padding: '0.65rem 0.8rem',
    borderRadius: '4px',
    border: '1px solid #1e293b',
    backgroundColor: '#070f1a',
    color: '#f8fafc',
    fontSize: '0.85rem',
    fontFamily: 'JetBrains Mono, monospace',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s ease'
  },
  rangerButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #00f0ff',
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    color: '#00f0ff',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    marginTop: '0.4rem',
    fontFamily: 'JetBrains Mono, monospace',
    transition: 'all 0.15s ease'
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '1.25rem 0 1rem 0'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#1e293b'
  },
  dividerText: {
    fontSize: '0.68rem',
    color: '#64748b',
    letterSpacing: '0.08em',
    fontFamily: 'JetBrains Mono, monospace'
  },
  guestSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  guestButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '0.65rem',
    borderRadius: '4px',
    border: '1px solid #334155',
    backgroundColor: '#0c1626',
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'JetBrains Mono, monospace',
    transition: 'all 0.15s ease'
  },
  guestNotice: {
    margin: '0.2rem 0 0 0',
    fontSize: '0.68rem',
    color: '#64748b',
    lineHeight: 1.35,
    textAlign: 'center'
  }
}
