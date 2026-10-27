import React, { useState } from 'react'
import {
  Sliders,
  Bell,
  Cpu,
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  Info,
  Mail,
  Send,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import {
  getEmailConfig,
  isEmailConfigured,
  sendIncidentEmailNotification
} from '../services/emailService'

export default function SettingsView() {
  const [acousticThreshold, setAcousticThreshold] = useState(80)
  const [cameraThreshold, setCameraThreshold] = useState(85)
  const [watchdogInterval, setWatchdogInterval] = useState('30')
  const [autoAlertAudio, setAutoAlertAudio] = useState(true)
  const [autoAcknowledgeLow, setAutoAcknowledgeLow] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  // EmailJS Testing State
  const [testEmailStatus, setTestEmailStatus] = useState(null)
  const emailConfig = getEmailConfig()
  const isConfigured = isEmailConfigured()

  const handleTestEmail = async () => {
    setTestEmailStatus({ status: 'sending', message: 'Sending test alert email...' })
    const testIncident = {
      id: `EVT-TEST-${Date.now().toString().slice(-4)}`,
      type: 'test_notification',
      category: 'threat',
      title: 'Manual Test Notification',
      icon: '🧪',
      priority: 'high',
      status: 'active',
      source: 'EcoSentry Settings Console',
      zoneName: 'Zone 1: North Canopy Reserve',
      zoneId: 'zone-1',
      coordinates: { x: 50.0, y: 50.0, simulatedLat: 12.4588, simulatedLng: 76.1339 },
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      timeAgo: 'Just now',
      description: 'This is a test notification generated from EcoSentry Settings to verify EmailJS browser integration.'
    }

    const result = await sendIncidentEmailNotification(testIncident)
    if (result.success) {
      setTestEmailStatus({
        status: 'success',
        message: `Test email sent successfully! Status: ${result.status} (${result.text})`
      })
    } else {
      setTestEmailStatus({
        status: 'error',
        message: result.reason === 'unconfigured'
          ? 'Environment variables are missing. Add VITE_EMAILJS_* to .env or Vercel.'
          : `Failed to deliver email: ${typeof result.error === 'object' ? JSON.stringify(result.error) : result.error}`
      })
    }
  }

  const handleSave = (e) => {
    e.preventDefault()
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2400)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="data-panel-card">
        <div className="data-panel-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={16} style={{ color: 'var(--accent-teal)' }} />
            <h3 className="data-panel-title">Surveillance Grid Parameters & Model Calibration</h3>
          </div>

          {savedFeedback && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--accent-green)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600
              }}
            >
              <CheckCircle2 size={13} />
              Parameters Saved to Runtime Cache
            </span>
          )}
        </div>

        <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Group 1: Model Calibration */}
          <div className="settings-section-card">
            <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
              AI Model Classification Thresholds
            </h4>

            <div className="settings-two-col">
              <div className="settings-form-group">
                <label>
                  Bio-Acoustic Confidence Threshold ({acousticThreshold}%)
                </label>
                <input
                  type="range"
                  min="50"
                  max="98"
                  value={acousticThreshold}
                  onChange={(e) => setAcousticThreshold(Number(e.target.value))}
                  style={{ accentColor: 'var(--accent-green)' }}
                />
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Acoustic triggers below this confidence are filtered as environmental ambient noise.
                </span>
              </div>

              <div className="settings-form-group">
                <label>
                  Optical Trap Object Detection Threshold ({cameraThreshold}%)
                </label>
                <input
                  type="range"
                  min="50"
                  max="98"
                  value={cameraThreshold}
                  onChange={(e) => setCameraThreshold(Number(e.target.value))}
                  style={{ accentColor: 'var(--accent-teal)' }}
                />
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  PIR + vision model certainty required to trigger a human intrusion alert.
                </span>
              </div>
            </div>
          </div>

          {/* Group 2: Telemetry Watchdog */}
          <div className="settings-section-card">
            <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
              Hardware Telemetry & Heartbeat Watchdog
            </h4>

            <div className="settings-form-group">
              <label>Watchdog Packet Timeout</label>
              <select
                className="settings-input"
                value={watchdogInterval}
                onChange={(e) => setWatchdogInterval(e.target.value)}
              >
                <option value="15">15 Seconds (Rapid Detection)</option>
                <option value="30">30 Seconds (Recommended Standard)</option>
                <option value="60">60 Seconds (Low Power Mesh)</option>
              </select>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Interval of missed keepalive beacons before marking sensor node OFFLINE.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <label className="settings-checkbox-row">
                <input
                  type="checkbox"
                  checked={autoAlertAudio}
                  onChange={(e) => setAutoAlertAudio(e.target.checked)}
                  style={{ accentColor: 'var(--accent-green)' }}
                />
                <span>Play audible tone on Critical priority threats</span>
              </label>

              <label className="settings-checkbox-row">
                <input
                  type="checkbox"
                  checked={autoAcknowledgeLow}
                  onChange={(e) => setAutoAcknowledgeLow(e.target.checked)}
                  style={{ accentColor: 'var(--accent-green)' }}
                />
                <span>Auto-acknowledge Low priority sensor telemetry fluctuations</span>
              </label>
            </div>
          </div>

          {/* Group 3: EmailJS Automated Notifications */}
          <div className="settings-section-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} style={{ color: 'var(--accent-green)' }} />
                <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
                  Automated Incident Email Dispatch (EmailJS)
                </h4>
              </div>
              <span
                className={`kpi-status-badge ${isConfigured ? 'success' : 'warning'}`}
                style={{ fontSize: '10px' }}
              >
                {isConfigured ? 'Active & Ready' : 'Awaiting Environment Variables'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '10px' }}>
              <div className="settings-form-group">
                <label>Service ID (VITE_EMAILJS_SERVICE_ID)</label>
                <input
                  type="text"
                  readOnly
                  value={emailConfig.serviceId || 'Not configured'}
                  className="settings-input"
                  style={{ backgroundColor: '#F8FAFC', color: emailConfig.serviceId ? 'var(--text-primary)' : 'var(--text-muted)' }}
                />
              </div>

              <div className="settings-form-group">
                <label>Template ID (VITE_EMAILJS_TEMPLATE_ID)</label>
                <input
                  type="text"
                  readOnly
                  value={emailConfig.templateId || 'Not configured'}
                  className="settings-input"
                  style={{ backgroundColor: '#F8FAFC', color: emailConfig.templateId ? 'var(--text-primary)' : 'var(--text-muted)' }}
                />
              </div>

              <div className="settings-form-group">
                <label>Public Key (VITE_EMAILJS_PUBLIC_KEY)</label>
                <input
                  type="text"
                  readOnly
                  value={emailConfig.publicKey ? `${emailConfig.publicKey.slice(0, 4)}••••••••` : 'Not configured'}
                  className="settings-input"
                  style={{ backgroundColor: '#F8FAFC', color: emailConfig.publicKey ? 'var(--text-primary)' : 'var(--text-muted)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Every successful drag-and-drop incident creation on the 3D map automatically sends an alert email.
              </span>

              <button
                type="button"
                className="btn-action-sm"
                onClick={handleTestEmail}
                disabled={testEmailStatus?.status === 'sending'}
                style={{ gap: '6px' }}
              >
                <Send size={11} />
                <span>{testEmailStatus?.status === 'sending' ? 'Sending...' : 'Send Test Alert'}</span>
              </button>
            </div>

            {testEmailStatus && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: testEmailStatus.status === 'success' ? '#ECFDF5' : testEmailStatus.status === 'error' ? '#FEF2F2' : '#EFF6FF',
                  color: testEmailStatus.status === 'success' ? '#065F46' : testEmailStatus.status === 'error' ? '#991B1B' : '#1E40AF',
                  border: `1px solid ${testEmailStatus.status === 'success' ? '#A7F3D0' : testEmailStatus.status === 'error' ? '#FECACA' : '#BFDBFE'}`
                }}
              >
                {testEmailStatus.status === 'success' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                <span>{testEmailStatus.message}</span>
              </div>
            )}
          </div>

          {/* Group 4: Coordinate Reference System */}
          <div className="settings-section-card">
            <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
              Spatial Coordinate Reference
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              <Info size={14} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} />
              <span>
                EcoSentry operates in a <strong>Simulated Cartesian Model (100x100 Grid)</strong> with synthetic WGS84 GPS offsets (+11.892°N, +76.541°E) for academic safety and wildlife sanctuary privacy.
              </span>
            </div>
          </div>

          {/* Save Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => {
                setAcousticThreshold(80)
                setCameraThreshold(85)
                setWatchdogInterval('30')
                setAutoAlertAudio(true)
                setAutoAcknowledgeLow(false)
              }}
            >
              <RotateCcw size={12} />
              <span>Reset Defaults</span>
            </button>

            <button
              type="submit"
              className="btn-action-sm primary-resolve"
              style={{ padding: '6px 14px', fontSize: '11.5px' }}
            >
              <Save size={12} />
              <span>Save Parameters</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
