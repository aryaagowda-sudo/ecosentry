import { useState, useRef, useEffect } from 'react'
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Key,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { supabase } from './supabaseClient'
import { verifyRoleWithBackend } from './services/authService'
import './Login.css'

export default function Login({ onRangerSuccess, onGuestLogin }) {
  // Pure unpopulated credential state - never prefilled
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Transition state: 'idle' | 'success' | 'exiting'
  const [transitionState, setTransitionState] = useState('idle')
  const [successPayload, setSuccessPayload] = useState(null)
  const timeoutRef = useRef([])

  // Ensure inputs are completely empty on mount & clean up timers
  useEffect(() => {
    setEmail('')
    setPassword('')
    return () => {
      timeoutRef.current.forEach(clearTimeout)
    }
  }, [])

  const handleRangerLogin = async (e) => {
    e.preventDefault()
    if (loading || transitionState !== 'idle') return

    const sanitizedEmail = email.trim()
    const enteredPassword = password

    if (!sanitizedEmail || !enteredPassword) {
      setErrorMsg('Please enter both your authorized email and security key.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Authenticate with Supabase Auth (TLS encrypted)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: enteredPassword
      })

      if (error) {
        // Generic security error prevents credential harvesting and hides internal schema
        setErrorMsg('Invalid credentials. Access denied.')
        setPassword('')
        setLoading(false)
        return
      }

      if (!data?.session) {
        setErrorMsg('Authentication failed. Please verify credentials.')
        setPassword('')
        setLoading(false)
        return
      }

      // 2. Secure Backend Database Authorization Check:
      // Verify RANGER role directly in PostgreSQL using database RPC get_current_user_role
      const { isRanger } = await verifyRoleWithBackend()

      if (!isRanger) {
        // Unauthorized non-ranger user: revoke session immediately
        await supabase.auth.signOut().catch(() => {})
        setErrorMsg('Access denied. Account lacks Ranger administrative clearance.')
        setPassword('')
        setLoading(false)
        return
      }

      // 3. Clear sensitive state and begin smooth dashboard transition
      setPassword('')
      setLoading(false)
      setSuccessPayload({
        role: 'RANGER',
        title: 'AUTHENTICATION VERIFIED',
        badge: 'CLEARANCE: RANGER LEAD',
        message: 'Initializing Forest Intelligence Grid...'
      })
      setTransitionState('success')

      // Step 1: Display verification animation for ~520ms
      const t1 = setTimeout(() => {
        setTransitionState('exiting')
      }, 520)

      // Step 2: Smooth transition into dashboard at ~750ms
      const t2 = setTimeout(() => {
        onRangerSuccess?.(data.session)
      }, 750)

      timeoutRef.current.push(t1, t2)
    } catch (err) {
      setErrorMsg('Authentication service unavailable. Please try again.')
      setPassword('')
      setLoading(false)
    }
  }

  const handleGuestAccess = (e) => {
    e?.preventDefault()
    if (loading || transitionState !== 'idle') return

    setEmail('')
    setPassword('')
    setErrorMsg('')

    setSuccessPayload({
      role: 'GUEST',
      title: 'OBSERVER ACCESS GRANTED',
      badge: 'CLEARANCE: RESTRICTED GUEST',
      message: 'Entering Restricted Guest Workspace...'
    })
    setTransitionState('success')

    // Step 1: Display brief observer verification animation
    const t1 = setTimeout(() => {
      setTransitionState('exiting')
    }, 520)

    // Step 2: Transition into dashboard
    const t2 = setTimeout(() => {
      onGuestLogin?.()
    }, 750)

    timeoutRef.current.push(t1, t2)
  }

  return (
    <div className="ecosentry-login-viewport" role="region" aria-label="EcoSentry Access Portal">
      {/* Background Ambience & Cyber Grid */}
      <div className="login-backdrop-grid" aria-hidden="true" />
      <div className="login-backdrop-glow" aria-hidden="true" />
      <div className="login-backdrop-trees" aria-hidden="true" />

      {/* Decorative Subtle Corner HUD markings */}
      <div className="login-hud-corner hud-corner-top-left" aria-hidden="true">
        <span className="hud-corner-dot" />
        <span>ECOSENTRY // GRID AUTH</span>
      </div>
      <div className="login-hud-corner hud-corner-top-right" aria-hidden="true">
        <span>SECURITY PROTOCOL: AES-256</span>
      </div>
      <div className="login-hud-corner hud-corner-bottom-left" aria-hidden="true">
        <span>RESERVE SECTOR: 12.450°N, 76.240°E</span>
      </div>
      <div className="login-hud-corner hud-corner-bottom-right" aria-hidden="true">
        <span className="hud-corner-dot-green" />
        <span>NETWORK: 28 NODES ACTIVE</span>
      </div>

      {/* Portal Container */}
      <div className={`ecosentry-login-card ${transitionState === 'exiting' ? 'card-exit-transition' : ''}`}>
        {/* Subtle Cyber Corner Brackets */}
        <div className="card-corner card-corner-tl" aria-hidden="true" />
        <div className="card-corner card-corner-tr" aria-hidden="true" />
        <div className="card-corner card-corner-bl" aria-hidden="true" />
        <div className="card-corner card-corner-br" aria-hidden="true" />

        {/* Portal Header */}
        <div className="login-brand-header">
          <div className="login-shield-badge">
            <Shield size={26} style={{ color: '#00f0ff' }} />
          </div>
          <span className="login-portal-eyebrow">Biosphere Defense Network</span>
          <h1 className="login-portal-title">ECOSENTRY PORTAL</h1>
          <p className="login-portal-subtitle">
            Autonomous Biosphere Surveillance &amp; Acoustic Mesh Grid
          </p>
        </div>

        {/* VIEW 1: Success Verification Animation */}
        {transitionState !== 'idle' && successPayload ? (
          <div className="login-success-container" role="status" aria-live="polite">
            <div className="login-success-radar">
              <div className={`login-success-ring ${successPayload.role.toLowerCase()}`} />
              <div className={`login-success-icon-core ${successPayload.role.toLowerCase()}`}>
                <CheckCircle2 size={28} />
              </div>
            </div>

            <h2 className="login-success-title">{successPayload.title}</h2>
            <span className={`login-success-badge ${successPayload.role.toLowerCase()}`}>
              {successPayload.badge}
            </span>
            <p className="login-success-status-msg">{successPayload.message}</p>

            <div className="login-progress-track">
              <div className={`login-progress-fill ${successPayload.role.toLowerCase()}`} />
            </div>
          </div>
        ) : (
          /* VIEW 2: Interactive Access Form */
          <>
            {/* Inline Error Box */}
            {errorMsg && (
              <div className="login-error-alert" role="alert">
                <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Ranger Login Form */}
            <form onSubmit={handleRangerLogin} className="login-form-main" autoComplete="off" noValidate>
              <div className="login-section-header">
                <span className="login-section-label">Ranger Authentication</span>
                <span className="login-clearance-badge">ADMIN</span>
              </div>

              {/* Email Input */}
              <div className="login-input-group">
                <label htmlFor="ranger-email-input" className="login-input-label">
                  <span>Ranger Email</span>
                </label>
                <div className="login-input-wrapper">
                  <Mail size={14} className="login-input-icon" />
                  <input
                    id="ranger-email-input"
                    name="ranger_auth_email"
                    type="email"
                    required
                    disabled={loading}
                    placeholder="Enter authorized email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-text-input"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="login-input-group">
                <label htmlFor="ranger-password-input" className="login-input-label">
                  <span>Security Key / Password</span>
                </label>
                <div className="login-input-wrapper">
                  <Lock size={14} className="login-input-icon" />
                  <input
                    id="ranger-password-input"
                    name="ranger_auth_key"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={loading}
                    placeholder="Enter security key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-text-input"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="login-password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide security key' : 'Show security key'}
                    aria-label={showPassword ? 'Hide security key' : 'Show security key'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="login-btn-primary"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="login-spin" />
                    <span>Authenticating Credentials...</span>
                  </>
                ) : (
                  <>
                    <Key size={15} />
                    <span>Sign In as Ranger</span>
                  </>
                )}
              </button>
            </form>

            {/* Tactical Divider */}
            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">OR EXPLORE GRID</span>
              <div className="login-divider-line" />
            </div>

            {/* Guest Login Option */}
            <div className="login-guest-section">
              <button
                type="button"
                onClick={handleGuestAccess}
                disabled={loading}
                className="login-btn-guest"
              >
                <User size={14} />
                <span>Guest Login (Restricted Access)</span>
              </button>
              <p className="login-guest-caption">
                🔒 Observer Access • View 3D forest map, sensor telemetry &amp; routing simulations. Email alerts permanently disabled.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
