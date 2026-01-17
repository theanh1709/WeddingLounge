import {
  supabase,
  supabaseConfigError,
  supabaseConfigured,
} from './supabaseClient'

const normalizeSession = (row) => {
  if (!row) {
    return null
  }
  return {
    id: row.id,
    targetCount: row.target_count,
    deck: Array.isArray(row.deck) ? row.deck : [],
    status: row.status,
    minWinners: row.min_winners,
    createdAt: row.created_at,
  }
}

const normalizeDraw = (row) => {
  if (!row) {
    return null
  }
  return {
    id: row.id,
    sessionId: row.session_id,
    number: row.number,
    drawOrder: row.draw_order,
    createdAt: row.created_at,
  }
}

export async function fetchLatestLotoSession() {
  if (!supabaseConfigured || !supabase) {
    return { data: null, error: supabaseConfigError }
  }
  const { data, error } = await supabase
    .from('loto_sessions')
    .select('id, target_count, deck, status, min_winners, created_at')
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return {
    data: normalizeSession(data),
    error,
  }
}

export async function createLotoSession(
  targetCount,
  deck,
  status = 'waiting',
  minWinners = 3,
) {
  if (!supabaseConfigured || !supabase) {
    return { data: null, error: supabaseConfigError }
  }
  const { data, error } = await supabase
    .from('loto_sessions')
    .insert({
      target_count: targetCount,
      deck,
      status,
      min_winners: minWinners,
    })
    .select('id, target_count, deck, status, min_winners, created_at')
    .single()
  return {
    data: normalizeSession(data),
    error,
  }
}

export async function updateLotoSessionStatus(sessionId, status) {
  return updateLotoSession(sessionId, { status })
}

export async function updateLotoSession(sessionId, updates) {
  if (!supabaseConfigured || !supabase) {
    return { error: supabaseConfigError }
  }
  const { error } = await supabase
    .from('loto_sessions')
    .update(updates)
    .eq('id', sessionId)
  return { error }
}

export async function fetchSessionDraws(sessionId) {
  if (!supabaseConfigured || !supabase) {
    return { data: [], error: supabaseConfigError }
  }
  const { data, error } = await supabase
    .from('loto_draws')
    .select('id, session_id, number, draw_order, created_at')
    .eq('session_id', sessionId)
    .order('draw_order', { ascending: true })
  return {
    data: data ? data.map(normalizeDraw).filter(Boolean) : [],
    error,
  }
}

export async function insertLotoDraw(sessionId, number, drawOrder) {
  if (!supabaseConfigured || !supabase) {
    return { data: null, error: supabaseConfigError }
  }
  const { data, error } = await supabase
    .from('loto_draws')
    .insert({
      session_id: sessionId,
      number,
      draw_order: drawOrder,
    })
    .select('id, session_id, number, draw_order, created_at')
    .single()
  return {
    data: normalizeDraw(data),
    error,
  }
}

export function subscribeToLotoDraws(sessionId, onInsert) {
  if (!supabaseConfigured || !supabase) {
    return () => {}
  }
  const channel = supabase
    .channel(`loto-draws-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'loto_draws',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        const draw = normalizeDraw(payload?.new)
        if (draw) {
          onInsert(draw)
        }
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToLotoSessions(onInsert) {
  if (!supabaseConfigured || !supabase) {
    return () => {}
  }
  const channel = supabase
    .channel('loto-sessions-inserts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'loto_sessions' },
      (payload) => {
        const session = normalizeSession(payload?.new)
        if (session) {
          onInsert(session)
        }
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

const normalizePlayer = (row) => {
  if (!row) {
    return null
  }
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    card: Array.isArray(row.card) ? row.card : [],
    playerToken: row.player_token,
    createdAt: row.created_at,
  }
}

export async function fetchSessionPlayers(sessionId) {
  if (!supabaseConfigured || !supabase) {
    return { data: [], error: supabaseConfigError }
  }
  const { data, error } = await supabase
    .from('loto_players')
    .select('id, session_id, name, card, player_token, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  return {
    data: data ? data.map(normalizePlayer).filter(Boolean) : [],
    error,
  }
}

export async function fetchPlayerByToken(sessionId, playerToken) {
  if (!supabaseConfigured || !supabase) {
    return { data: null, error: supabaseConfigError }
  }
  const { data, error } = await supabase
    .from('loto_players')
    .select('id, session_id, name, card, player_token, created_at')
    .eq('session_id', sessionId)
    .eq('player_token', playerToken)
    .maybeSingle()
  return {
    data: normalizePlayer(data),
    error,
  }
}

export async function upsertLotoPlayer({
  sessionId,
  name,
  playerToken,
  card,
}) {
  if (!supabaseConfigured || !supabase) {
    return { data: null, error: supabaseConfigError }
  }
  const { data, error } = await supabase
    .from('loto_players')
    .upsert(
      {
        session_id: sessionId,
        name,
        player_token: playerToken,
        card,
      },
      { onConflict: 'session_id,player_token' },
    )
    .select('id, session_id, name, card, player_token, created_at')
    .single()
  return {
    data: normalizePlayer(data),
    error,
  }
}

export function subscribeToLotoPlayers(sessionId, onChange) {
  if (!supabaseConfigured || !supabase) {
    return () => {}
  }
  const channel = supabase
    .channel(`loto-players-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'loto_players',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        const player = normalizePlayer(payload?.new)
        if (player) {
          onChange(player)
        }
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
