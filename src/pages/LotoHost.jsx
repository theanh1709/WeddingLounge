import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createLotoSession,
  fetchLatestLotoSession,
  fetchSessionPlayers,
  fetchSessionDraws,
  insertLotoDraw,
  subscribeToLotoDraws,
  subscribeToLotoPlayers,
  updateLotoSessionStatus,
} from '../services/loto'
import { SUPABASE_CONFIG_ERROR } from '../services/supabaseClient'

const DEFAULT_TARGET_COUNT = 30
const WINNER_CAP = 3

const buildCardRows = (card) => {
  if (!Array.isArray(card)) {
    return null
  }
  if (Array.isArray(card[0])) {
    if (card.length !== 9) {
      return null
    }
    return card.map((row) => row.slice(0, 5).map((value) => Number(value)))
  }
  if (card.length < 45) {
    return null
  }
  const rows = []
  for (let i = 0; i < 9; i += 1) {
    rows.push(card.slice(i * 5, i * 5 + 5).map((value) => Number(value)))
  }
  return rows
}

const buildWinningLines = (rows) => {
  if (!rows) {
    return []
  }
  const lines = []
  rows.forEach((row) => {
    if (Array.isArray(row) && row.length === 5) {
      lines.push(row)
    }
  })
  for (let col = 0; col < 5; col += 1) {
    for (let start = 0; start <= 4; start += 1) {
      const segment = []
      for (let offset = 0; offset < 5; offset += 1) {
        const row = rows[start + offset]
        if (!row || row[col] == null) {
          segment.length = 0
          break
        }
        segment.push(Number(row[col]))
      }
      if (segment.length === 5) {
        lines.push(segment)
      }
    }
  }
  return lines
}

const buildPlayerMeta = (player) => {
  const rawNumbers = Array.isArray(player.card)
    ? player.card.map((value) => Number(value))
    : []
  const numbers = rawNumbers.filter(
    (value) => Number.isFinite(value) && value >= 1 && value <= 90,
  )
  const uniqueNumbers = Array.from(new Set(numbers))
  const rows = buildCardRows(rawNumbers)
  const lines = buildWinningLines(rows)
  return {
    ...player,
    numbers: uniqueNumbers,
    lines,
  }
}

const hasWinningLine = (player, drawnNumbers) => {
  return player.lines.some((line) =>
    line.every((value) => drawnNumbers.has(value)),
  )
}

const wouldWinWithNumber = (player, drawnNumbers, number) => {
  return player.lines.some((line) => {
    if (!line.includes(number)) {
      return false
    }
    for (const value of line) {
      if (value === number) {
        continue
      }
      if (!drawnNumbers.has(value)) {
        return false
      }
    }
    return true
  })
}

const getBestMissingLine = (player, drawnNumbers) => {
  let bestMissing = null
  player.lines.forEach((line) => {
    const missing = line.filter((value) => !drawnNumbers.has(value))
    if (!bestMissing || missing.length < bestMissing.length) {
      bestMissing = missing
    }
  })
  return bestMissing || []
}

const pickNextNumber = (players, drawnNumbers, minWinners) => {
  const winners = players.filter((player) =>
    hasWinningLine(player, drawnNumbers),
  )
  const targetWinners = Math.max(1, minWinners)
  const winnersSet = new Set(winners.map((player) => player.id))
  const countNewWinners = (number) => {
    let count = 0
    players.forEach((player) => {
      if (winnersSet.has(player.id)) {
        return
      }
      if (wouldWinWithNumber(player, drawnNumbers, number)) {
        count += 1
      }
    })
    return count
  }
  const available = new Set()
  players.forEach((player) => {
    player.numbers.forEach((value) => {
      if (!drawnNumbers.has(value)) {
        available.add(value)
      }
    })
  })
  const availablePool = Array.from(available)
  let pool = []

  if (winners.length >= targetWinners) {
    const safePool = availablePool.filter(
      (value) => countNewWinners(value) === 0,
    )
    if (safePool.length) {
      return safePool[Math.floor(Math.random() * safePool.length)]
    }
    return null
  }

  if (winners.length < targetWinners) {
    const candidates = players
      .filter((player) => !hasWinningLine(player, drawnNumbers))
      .map((player) => {
        const missing = getBestMissingLine(player, drawnNumbers)
        return {
          ...player,
          missing,
          missingCount: missing.length,
        }
      })
      .filter((player) => player.missingCount > 0)
      .sort((a, b) => a.missingCount - b.missingCount)

    if (candidates.length) {
      const needed = Math.max(1, targetWinners - winners.length)
      const targets = candidates.slice(0, needed)
      const scores = new Map()
      targets.forEach((player) => {
        player.missing.forEach((value) => {
          if (!drawnNumbers.has(value)) {
            scores.set(value, (scores.get(value) || 0) + 1)
          }
        })
      })

      if (scores.size) {
        let maxScore = 0
        scores.forEach((score) => {
          if (score > maxScore) {
            maxScore = score
          }
        })
        pool = Array.from(scores.entries())
          .filter(([, score]) => score === maxScore)
          .map(([value]) => value)
      }
    }
  }

  const remainingToCap = targetWinners - winners.length
  if (pool.length) {
    pool = pool.filter(
      (value) => countNewWinners(value) <= remainingToCap,
    )
  }

  if (!pool.length) {
    const progressPool = availablePool.filter(
      (value) => {
        const nextWins = countNewWinners(value)
        return nextWins > 0 && nextWins <= remainingToCap
      },
    )
    if (progressPool.length) {
      pool = progressPool
    } else {
      const safePool = availablePool.filter(
        (value) => countNewWinners(value) === 0,
      )
      if (safePool.length) {
        pool = safePool
      }
    }
  }

  if (!pool.length) {
    return null
  }

  return pool[Math.floor(Math.random() * pool.length)]
}

export default function LotoHost() {
  const [sessionId, setSessionId] = useState(null)
  const [targetCount] = useState(DEFAULT_TARGET_COUNT)
  const [sessionStatus, setSessionStatus] = useState('')
  const [players, setPlayers] = useState([])
  const [drawn, setDrawn] = useState([])
  const [autoPlay, setAutoPlay] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLatestSession = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: session, error: sessionError } =
      await fetchLatestLotoSession()
    if (sessionError) {
      setError(
        sessionError.code === SUPABASE_CONFIG_ERROR
          ? 'Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env.'
          : 'Không thể tải dữ liệu lô tô từ Supabase.',
      )
      setLoading(false)
      return
    }
    if (session) {
      setSessionId(session.id)
      setSessionStatus(session.status || 'waiting')
      const { data: draws, error: drawError } = await fetchSessionDraws(
        session.id,
      )
      if (drawError) {
        setError(
          drawError.code === SUPABASE_CONFIG_ERROR
            ? 'Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env.'
            : 'Không thể tải danh sách số đã quay.',
        )
      }
      setDrawn(draws || [])
      const { data: playerData, error: playerError } =
        await fetchSessionPlayers(session.id)
      if (playerError) {
        setError(
          playerError.code === SUPABASE_CONFIG_ERROR
            ? 'Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env.'
            : 'Không thể tải danh sách khách tham gia.',
        )
      } else {
        setPlayers(playerData || [])
      }
    } else {
      setSessionId(null)
      setSessionStatus('')
      setPlayers([])
      setDrawn([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLatestSession()
  }, [loadLatestSession])

  useEffect(() => {
    if (!sessionId) {
      return undefined
    }
    const unsubscribe = subscribeToLotoDraws(sessionId, (draw) => {
      setDrawn((prev) => {
        if (prev.some((item) => item.id === draw.id)) {
          return prev
        }
        const next = [...prev, draw]
        next.sort((a, b) => a.drawOrder - b.drawOrder)
        return next
      })
    })
    return unsubscribe
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      return undefined
    }
    const unsubscribe = subscribeToLotoPlayers(sessionId, (player) => {
      setPlayers((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === player.id)
        if (existingIndex === -1) {
          return [...prev, player]
        }
        const next = [...prev]
        next[existingIndex] = player
        return next
      })
    })
    return unsubscribe
  }, [sessionId])

  useEffect(() => {
    if (!sessionId || sessionStatus === 'completed') {
      return undefined
    }
    let active = true
    const pollPlayers = async () => {
      const { data, error: pollError } = await fetchSessionPlayers(sessionId)
      if (!active || pollError || !data) {
        return
      }
      setPlayers(data)
    }
    pollPlayers()
    const intervalId = window.setInterval(pollPlayers, 4000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [sessionId, sessionStatus])

  const drawnNumbers = useMemo(() => {
    return new Set(drawn.map((item) => Number(item.number)))
  }, [drawn])

  const playersMeta = useMemo(() => {
    return players.map(buildPlayerMeta)
  }, [players])

  const winners = useMemo(() => {
    return playersMeta.filter((player) =>
      hasWinningLine(player, drawnNumbers),
    )
  }, [playersMeta, drawnNumbers])

  const availableNumbers = useMemo(() => {
    const pool = new Set()
    playersMeta.forEach((player) => {
      player.numbers.forEach((value) => {
        if (!drawnNumbers.has(value)) {
          pool.add(value)
        }
      })
    })
    return Array.from(pool)
  }, [playersMeta, drawnNumbers])

  const winnerCap = WINNER_CAP

  const startSession = async () => {
    setError('')
    setAutoPlay(false)
    if (sessionId) {
      await updateLotoSessionStatus(sessionId, 'completed')
    }
    const { data: session, error: sessionError } = await createLotoSession(
      targetCount,
      [],
      'waiting',
      WINNER_CAP,
    )
    if (sessionError || !session) {
      setError(
        sessionError?.code === SUPABASE_CONFIG_ERROR
          ? 'Thieu cau hinh Supabase. Vui long kiem tra file .env.'
          : 'Khong the tao phien lo to moi.',
      )
      return
    }
    setSessionId(session.id)
    setSessionStatus(session.status || 'waiting')
    setDrawn([])
    setPlayers([])
  }

  const startDrawing = async () => {
    if (!sessionId) {
      return
    }
    setError('')
    const { error: updateError } = await updateLotoSessionStatus(
      sessionId,
      'active',
    )
    if (updateError) {
      setError(
        updateError?.code === SUPABASE_CONFIG_ERROR
          ? 'Thieu cau hinh Supabase. Vui long kiem tra file .env.'
          : 'Khong the bat dau quay.',
      )
      return
    }
    setSessionStatus('active')
  }

  const drawNext = useCallback(async () => {
    if (!sessionId || sessionStatus !== 'active') {
      return
    }
    const nextNumber = pickNextNumber(
      playersMeta,
      drawnNumbers,
      winnerCap,
    )
    if (!nextNumber) {
      setError('Khong co so an toan de quay tiep.')
      return
    }
    const drawOrder = drawn.length + 1
    const { data: draw, error: drawError } = await insertLotoDraw(
      sessionId,
      nextNumber,
      drawOrder,
    )
    if (drawError || !draw) {
      setError(
        drawError?.code === SUPABASE_CONFIG_ERROR
          ? 'Thieu cau hinh Supabase. Vui long kiem tra file .env.'
          : 'Khong the luu so vua quay.',
      )
      return
    }
    setDrawn((prev) => {
      if (prev.some((item) => item.id === draw.id)) {
        return prev
      }
      const next = [...prev, draw]
      next.sort((a, b) => a.drawOrder - b.drawOrder)
      return next
    })
  }, [
    sessionId,
    sessionStatus,
    playersMeta,
    drawnNumbers,
    winnerCap,
    drawn.length,
  ])

  const lastNumber = drawn[drawn.length - 1]?.number
  const remaining = availableNumbers.length
  const canDraw = Boolean(
    sessionId &&
      sessionStatus === 'active' &&
      playersMeta.length &&
      availableNumbers.length,
  )
  const canStart = Boolean(
    sessionId &&
      sessionStatus === 'waiting' &&
      playersMeta.length,
  )
  useEffect(() => {
    if (!autoPlay) {
      return
    }
    if (!canDraw) {
      setAutoPlay(false)
      return
    }
    const intervalId = window.setInterval(() => {
      drawNext()
    }, 2500)
    return () => window.clearInterval(intervalId)
  }, [autoPlay, canDraw, drawNext])

  return (
    <section className="page">
      <div className="page-header">
        <h2>Lô tô - màn hình MC</h2>
        <p>
          Chọn số lượng (20-30), bấm bắt đầu và quay từng số.
        </p>
        {error && <p className="notice">{error}</p>}
      </div>
      <div className="loto-layout">
        <div className="card loto-display">
          <div className="loto-ball">{lastNumber || '--'}</div>
          <div className="drawn-list">
            {drawn.map((draw) => (
              <span key={draw.id} className="pill">
                {draw.number}
              </span>
            ))}
          </div>
        </div>
        <div className="card loto-controls">
          <div className="status-line">
            <span className="status-pill">Trạng thái: {sessionStatus || "waiting"}</span>
            <span className="status-pill">Khách tham gia: {players.length}</span>
          </div>
          <div className="form-actions">
            <button className="btn" onClick={startSession} disabled={loading}>
              Mở phiên quay mới
            </button>
            <button
              className="btn btn-outline"
              onClick={startDrawing}
              disabled={!canStart}
            >
              Bắt đầu quay
            </button>
          </div>
          <div className="form-actions">
            <button
              className="btn btn-outline"
              onClick={drawNext}
              disabled={!canDraw}
            >
              Quay số tiếp
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setAutoPlay((prev) => !prev)}
              disabled={!canDraw}
            >
              {autoPlay ? "Dừng auto" : "Tự động quay"}
            </button>
            <span className="muted">Số con còn lại: {remaining > 0 ? remaining : 0}</span>
          </div>
          {winners.length ? (
            <>
              <p className="notice">
                Đã có {Math.min(winners.length, winnerCap)}/{winnerCap} người thắng.
              </p>
              <div className="participant-list">
                {winners.slice(0, winnerCap).map((player) => (
                  <span key={player.id} className="participant-pill">
                    {player.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Chưa có người thắng.</p>
          )}
          {players.length ? (
            <div className="participant-list">
              {players.map((player) => (
                <span key={player.id} className="participant-pill">
                  {player.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">Chưa có khách tham gia.</p>
          )}
          {loading && <p className="muted">Đang tải phiên lô tô...</p>}
        </div>
      </div>
    </section>
  )
}
