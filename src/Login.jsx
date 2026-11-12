import { useState, useRef, useEffect } from 'react'
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info
} from 'lucide-react'
import { supabase } from './supabaseClient'
import { verifyRoleWithBackend } from './services/authService'
import './Login.css'

export default function Login({ onRangerSuccess, onGuestLogin }) {
  // Pure unpopulated credential state - never prefilled
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoNotice, setInfoNotice] = useState('')

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
      setErrorMsg('Please enter both your authorized email and password.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setInfoNotice('')

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
      // Verify RANGER role using multi-tier database authorization
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
    setInfoNotice('')

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

  const handleForgotPassword = (e) => {
    e.preventDefault()
    setInfoNotice('For security, ranger credentials must be reset via your reserve operations lead.')
  }

  return (
    <div className={`ecosentry-split-auth ${transitionState === 'exiting' ? 'auth-exit-transition' : ''}`}>
      {/* =========================================================================
          LEFT PANEL: Misty Rainforest Branding (55% desktop width)
          ========================================================================= */}
      <section className="auth-forest-panel" aria-label="EcoSentry Forest Network">
        <div 
          className="auth-forest-bg" 
          style={{ backgroundImage: `url('/assets/forest-login-bg.jpg')` }}
          aria-hidden="true" 
        />
        <div className="auth-forest-overlay" aria-hidden="true" />

        <div className="auth-forest-inner">
          {/* Top Branding Lockup & Live Status Badge */}
          <div className="auth-forest-topbar">
            <div className="auth-brand-lockup">
              <div className="auth-brand-icon-box">
                <Shield size={24} className="auth-brand-shield" />
              </div>
              <div className="auth-brand-headings">
                <span className="auth-brand-title">EcoSentry</span>
                <span className="auth-brand-sub">WILDLIFE INTELLIGENCE</span>
              </div>
            </div>

            <div className="auth-live-badge" title="Real-time acoustic sensor telemetry active">
              <span className="auth-live-pulse-dot" />
              <span>LIVE FOREST NETWORK</span>
            </div>
          </div>

          {/* Centerpiece Mission Statement */}
          <div className="auth-forest-hero">
            <h1 className="auth-forest-headline">
              Protecting Wildlife Through Intelligent Surveillance
            </h1>
            <p className="auth-forest-narrative">
              One connected view of field sensors, ranger teams, and critical habitats—built for faster, safer decisions.
            </p>
          </div>

          {/* Bottom Live Metrics */}
          <div className="auth-forest-stats">
            <div className="auth-stat-item">
              <div className="auth-stat-num">248</div>
              <div className="auth-stat-caption">Sensors Deployed</div>
            </div>

            <div className="auth-stat-divider" aria-hidden="true" />

            <div className="auth-stat-item">
              <div className="auth-stat-num">18</div>
              <div className="auth-stat-caption">Ranger Teams</div>
            </div>

            <div className="auth-stat-divider" aria-hidden="true" />

            <div className="auth-stat-item">
              <div className="auth-stat-num">99.8%</div>
              <div className="auth-stat-caption">Network Reliability</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          RIGHT PANEL: Clean Enterprise Login Form (45% desktop width)
          ========================================================================= */}
      <section className="auth-form-panel" aria-label="Operations Authentication">
        <div className="auth-form-scroll-body">
          <div className="auth-form-card">
            {/* Mobile Branding (appears when forest panel is hidden on mobile) */}
            <div className="auth-mobile-header" aria-hidden="true">
              <div className="auth-mobile-icon-box">
                <Shield size={22} className="auth-brand-shield" />
              </div>
              <div className="auth-brand-headings dark">
                <span className="auth-brand-title dark">EcoSentry</span>
                <span className="auth-brand-sub dark">WILDLIFE INTELLIGENCE</span>
              </div>
            </div>

            {/* VIEW 1: Verification Animation Overlay */}
            {transitionState !== 'idle' && successPayload ? (
              <div className="auth-success-card" role="status" aria-live="polite">
                <div className={`auth-success-radar-icon ${successPayload.role.toLowerCase()}`}>
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="auth-success-title">{successPayload.title}</h2>
                <span className={`auth-success-clearance ${successPayload.role.toLowerCase()}`}>
                  {successPayload.badge}
                </span>
                <p className="auth-success-msg">{successPayload.message}</p>
                <div className="auth-success-progress-track">
                  <div className={`auth-success-progress-bar ${successPayload.role.toLowerCase()}`} />
                </div>
              </div>
            ) : (
              /* VIEW 2: Interactive Access Form */
              <>
                {/* Form Heading Section */}
                <div className="auth-form-intro">
                  <div className="auth-ops-badge">
                    <Lock size={12} className="auth-ops-lock" />
                    <span>SECURE OPERATIONS ACCESS</span>
                  </div>
                  <h2 className="auth-heading-main">Welcome Back, Ranger</h2>
                  <p className="auth-sub-instructions">
                    Sign in to access the EcoSentry forest intelligence network.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="auth-alert-box error" role="alert">
                    <AlertCircle size={16} className="auth-alert-icon error" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Info Notice (e.g. Forgot Password) */}
                {infoNotice && (
                  <div className="auth-alert-box info" role="status">
                    <Info size={16} className="auth-alert-icon info" />
                    <span>{infoNotice}</span>
                  </div>
                )}

                {/* Main Ranger Login Form */}
                <form onSubmit={handleRangerLogin} className="auth-inputs-form" autoComplete="off" noValidate>
                  {/* Ranger Email Field */}
                  <div className="auth-input-group">
                    <label htmlFor="ranger-email-field" className="auth-input-label">
                      Ranger Email
                    </label>
                    <div className="auth-input-field-wrap">
                      <Mail size={16} className="auth-field-lead-icon" />
                      <input
                        id="ranger-email-field"
                        name="ranger_auth_email"
                        type="email"
                        required
                        disabled={loading}
                        placeholder="name@ecosentry.org"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="auth-text-field"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  {/* Password Field with Forgot Link */}
                  <div className="auth-input-group">
                    <div className="auth-label-flex">
                      <label htmlFor="ranger-password-field" className="auth-input-label">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="auth-forgot-password-link"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="auth-input-field-wrap">
                      <Lock size={16} className="auth-field-lead-icon" />
                      <input
                        id="ranger-password-field"
                        name="ranger_auth_key"
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={loading}
                        placeholder="Enter your secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-text-field"
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-form-type="other"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="auth-toggle-visibility-btn"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="auth-remember-row">
                    <label className="auth-checkbox-container">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="auth-native-checkbox"
                      />
                      <span className="auth-checkbox-text">Remember me on this device</span>
                    </label>
                  </div>

                  {/* Submit CTA: Sign In as Ranger */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="auth-btn-ranger-submit"
                    aria-busy={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="auth-spin-icon" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In as Ranger</span>
                        <ArrowRight size={17} className="auth-arrow-icon" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="auth-horizontal-divider">
                  <span className="auth-divider-line" />
                  <span className="auth-divider-text">OR</span>
                  <span className="auth-divider-line" />
                </div>

                {/* Guest Login Option */}
                <div className="auth-guest-option-block">
                  <button
                    type="button"
                    onClick={handleGuestAccess}
                    disabled={loading}
                    className="auth-btn-guest-outline"
                  >
                    <span className="auth-guest-main-title">Guest Login</span>
                    <span className="auth-guest-sub-badge">Restricted Access</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
