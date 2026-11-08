import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.card}>
        <h2 style={styles.title}>EcoSentry Ranger Access</h2>
        <p style={styles.subtitle}>Enter credentials to access the live monitoring grid</p>
        
        {errorMsg && <div style={styles.error}>{errorMsg}</div>}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Ranger Email</label>
          <input
            type="email"
            required
            placeholder="ranger@ecosentry.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#0f172a',
    fontFamily: 'sans-serif'
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    width: '100%',
    maxWidth: '400px',
    color: '#ffffff'
  },
  title: {
    margin: '0 0 0.5rem 0',
    color: '#22c55e',
    fontSize: '1.5rem',
    textAlign: 'center'
  },
  subtitle: {
    margin: '0 0 1.5rem 0',
    color: '#94a3b8',
    fontSize: '0.875rem',
    textAlign: 'center'
  },
  error: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: '1.25rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    color: '#cbd5e1'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '0.5rem'
  }
}