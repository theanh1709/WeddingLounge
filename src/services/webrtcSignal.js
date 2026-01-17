import {
  supabase,
  supabaseConfigError,
  supabaseConfigured,
} from './supabaseClient'

const SIGNAL_EVENT = 'signal'
const CHANNEL_READY_STATUSES = new Set(['SUBSCRIBED'])
const CHANNEL_ERROR_STATUSES = new Set(['CHANNEL_ERROR', 'TIMED_OUT'])

export function createSignalChannel(code, onSignal, onStatus) {
  if (!supabaseConfigured || !supabase) {
    return {
      channel: null,
      error: supabaseConfigError,
      ready: Promise.reject(supabaseConfigError),
    }
  }
  let readyResolve
  let readyReject
  let settled = false
  const ready = new Promise((resolve, reject) => {
    readyResolve = resolve
    readyReject = reject
  })
  const channel = supabase.channel(`webrtc:${code}`)
  channel.on('broadcast', { event: SIGNAL_EVENT }, (payload) => {
    if (onSignal) {
      onSignal(payload?.payload)
    }
  })
  channel.subscribe((status) => {
    if (onStatus) {
      onStatus(status)
    }
    if (!settled && CHANNEL_READY_STATUSES.has(status)) {
      settled = true
      readyResolve()
    } else if (!settled && CHANNEL_ERROR_STATUSES.has(status)) {
      settled = true
      readyReject(new Error(status))
    }
  })
  return { channel, error: null, ready }
}

export async function sendSignal(channel, payload) {
  if (!channel) {
    return
  }
  await channel.send({
    type: 'broadcast',
    event: SIGNAL_EVENT,
    payload,
  })
}

export function removeSignalChannel(channel) {
  if (!channel || !supabase) {
    return
  }
  supabase.removeChannel(channel)
}
