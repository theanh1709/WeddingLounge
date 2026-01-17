import {
  supabase,
  supabaseConfigError,
  supabaseConfigured,
} from './supabaseClient'

const normalizeWish = (row) => {
  if (!row) {
    return null
  }
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  }
}

export async function fetchWishes() {
  if (!supabaseConfigured || !supabase) {
    return { data: [], error: supabaseConfigError }
  }
  const { data, error } = await supabase
    .from('wishes')
    .select('id, name, message, created_at')
    .order('created_at', { ascending: true })
  return {
    data: data ? data.map(normalizeWish).filter(Boolean) : [],
    error,
  }
}

export async function addWish({ name, message }) {
  if (!supabaseConfigured || !supabase) {
    return { data: null, error: supabaseConfigError }
  }
  const { data, error } = await supabase
    .from('wishes')
    .insert({ name, message })
    .select('id, name, message, created_at')
    .single()
  return {
    data: normalizeWish(data),
    error,
  }
}

export function subscribeToWishes(onInsert) {
  if (!supabaseConfigured || !supabase) {
    return () => {}
  }
  const channel = supabase
    .channel('wishes-inserts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'wishes' },
      (payload) => {
        if (!payload?.new) {
          return
        }
        const wish = normalizeWish(payload.new)
        if (wish) {
          onInsert(wish)
        }
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
