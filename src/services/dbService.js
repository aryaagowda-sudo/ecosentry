import { supabase } from '../supabaseClient'

export async function recordThreatAlert({ sensorId, threatType, confidence, location }) {
  try {
    const payload = {
      sensor_id: sensorId || 'NODE-01',
      threat_type: threatType || 'Chainsaw',
      confidence_score: Number(confidence) || 0.95,
      location: location || 'Grid Alpha',
      status: 'UNRESOLVED',
      detected_at: new Date().toISOString()
    }

    console.log('Sending payload to Supabase threat_alerts:', payload)

    const { data, error } = await supabase
      .from('threat_alerts')
      .insert([payload])
      .select()

    if (error) {
      console.error('❌ Supabase Insertion Error Details:', error.message, error.details, error.hint)
      return null
    }

    console.log('✅ Successfully recorded threat alert in database:', data)
    return data
  } catch (err) {
    console.error('❌ Unexpected exception in recordThreatAlert:', err)
    return null
  }
}