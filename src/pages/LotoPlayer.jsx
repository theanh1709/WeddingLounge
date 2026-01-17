import { useCallback, useEffect, useMemo, useState } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'
import { generateLotoCard } from '../utils/game'
import {
  fetchLatestLotoSession,
  fetchPlayerByToken,
  fetchSessionDraws,
  subscribeToLotoDraws,
  subscribeToLotoSessions,
  upsertLotoPlayer,
} from '../services/loto'
import { SUPABASE_CONFIG_ERROR } from '../services/supabaseClient'

const PLAYER_TOKEN_KEY = 'loto-player-token'
const PLAYER_NAME_KEY = 'loto-player-name'

const buildCardRows = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length < 45) {
    return null
  }
  const rows = []
  for (let i = 0; i < 9; i += 1) {
    rows.push(numbers.slice(i * 5, i * 5 + 5))
  }
  return rows
}

const createPlayerToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const buildWinningLines = (rows) => {
  if (!Array.isArray(rows)) {
    return []
  }
  const lines = []
  rows.forEach((row) => {
    if (Array.isArray(row) && row.length === 5) {
      lines.push(row.map((value) => Number(value)))
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

export default function LotoPlayer() {
  const [card, setCard] = useState(() => generateLotoCard())
  const [marked, setMarked] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [sessionStatus, setSessionStatus] = useState('')
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wonLines, setWonLines] = useState([])
  const [winningLine, setWinningLine] = useState(null)
  const [playerName, setPlayerName] = useLocalStorage(PLAYER_NAME_KEY, '')
  const [playerToken, setPlayerToken] = useLocalStorage(PLAYER_TOKEN_KEY, '')
  const [playerId, setPlayerId] = useState(null)
  const [hasJoined, setHasJoined] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

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
      setSessionStatus(session.status || '')
      const { data: drawData, error: drawError } = await fetchSessionDraws(
        session.id,
      )
      if (drawError) {
        setError(
          drawError.code === SUPABASE_CONFIG_ERROR
            ? 'Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env.'
            : 'Không thể tải danh sách số đã quay.',
        )
      }
      setDraws(drawData || [])
    } else {
      setSessionId(null)
      setSessionStatus('')
      setDraws([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLatestSession()
  }, [loadLatestSession])

  useEffect(() => {
    if (!playerToken) {
      setPlayerToken(createPlayerToken())
    }
  }, [playerToken, setPlayerToken])

  useEffect(() => {
    if (!sessionId) {
      return undefined
    }
    const unsubscribeDraws = subscribeToLotoDraws(sessionId, (draw) => {
      setDraws((prev) => {
        if (prev.some((item) => item.id === draw.id)) {
          return prev
        }
        const next = [...prev, draw]
        next.sort((a, b) => a.drawOrder - b.drawOrder)
        return next
      })
    })
    return unsubscribeDraws
  }, [sessionId])

  useEffect(() => {
    const unsubscribeSessions = subscribeToLotoSessions(() => {
      loadLatestSession()
    })
    return unsubscribeSessions
  }, [loadLatestSession])

  useEffect(() => {
    let active = true

    const loadPlayer = async () => {
      if (!sessionId || !playerToken) {
        setHasJoined(false)
        setPlayerId(null)
        return
      }
      setJoinError('')
      const { data, error: playerError } = await fetchPlayerByToken(
        sessionId,
        playerToken,
      )
      if (!active) {
        return
      }
      if (playerError) {
        setJoinError(
          playerError.code === SUPABASE_CONFIG_ERROR
            ? 'Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env.'
            : 'Không thể kiểm tra thông tin tham gia.',
        )
        return
      }
      if (data) {
        const storedRows = buildCardRows(data.card)
        if (storedRows) {
          setCard(storedRows)
        }
        if (data.name) {
          setPlayerName(data.name)
        }
        setMarked([])
        setPlayerId(data.id)
        setHasJoined(true)
      } else {
        setCard(generateLotoCard())
        setMarked([])
        setPlayerId(null)
        setHasJoined(false)
      }
    }

    loadPlayer()

    return () => {
      active = false
    }
  }, [sessionId, playerToken])

  useEffect(() => {
    setWonLines([])
    setWinningLine(null)
  }, [sessionId])

  const drawnNumbers = useMemo(() => {
    return new Set(draws.map((draw) => Number(draw.number)))
  }, [draws])

  const markedNumbers = useMemo(() => {
    return new Set(marked.map((number) => Number(number)))
  }, [marked])

  const cardLines = useMemo(() => buildWinningLines(card), [card])

  useEffect(() => {
    if (winningLine || !drawnNumbers.size || !markedNumbers.size) {
      return
    }
    let nextLine = null
    let nextKey = ''
    for (const line of cardLines) {
      const key = line.join('-')
      if (wonLines.includes(key)) {
        continue
      }
      const isMatch = line.every(
        (value) => drawnNumbers.has(value) && markedNumbers.has(value),
      )
      if (isMatch) {
        nextKey = key
        nextLine = line
        break
      }
    }
    if (nextLine) {
      setWonLines((prev) => [...prev, nextKey])
      setWinningLine(nextLine)
    }
  }, [cardLines, drawnNumbers, markedNumbers, wonLines, winningLine])

  const toggleMark = (number) => {
    setMarked((prev) =>
      prev.includes(number)
        ? prev.filter((item) => item !== number)
        : [...prev, number],
    )
  }

  const resetCard = () => {
    if (hasJoined) {
      return
    }
    const freshCard = generateLotoCard()
    setCard(freshCard)
    setMarked([])
    setWonLines([])
    setWinningLine(null)
  }

  const closeWinPopup = () => setWinningLine(null)

  const joinSession = async () => {
    if (!sessionId) {
      setJoinError('Chưa có phiên Lô tô để tham gia.')
      return
    }
    const trimmedName = playerName.trim()
    if (!trimmedName) {
      setJoinError('Vui lòng nhập tên trước khi tham gia.')
      return
    }
    if (!playerToken) {
      setJoinError('Không thể tạo định danh người chơi.')
      return
    }
    setJoinError('')
    setJoining(true)
    const { data, error: joinErrorResponse } = await upsertLotoPlayer({
      sessionId,
      name: trimmedName,
      playerToken,
      card: card.flat(),
    })
    if (joinErrorResponse) {
      setJoinError(
        joinErrorResponse.code === SUPABASE_CONFIG_ERROR
          ? 'Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env.'
          : 'Không thể ghi nhận thông tin tham gia.',
      )
      setJoining(false)
      return
    }
    setPlayerId(data?.id || null)
    setHasJoined(true)
    setJoining(false)
  }

  return (
    <section className="page">
      <div className="page-header">
        <h2>Lô tô - màn hình khách</h2>
        <p>
          Bấm tạo bảng mới để lấy 9 hàng số. Khi MC quay số, chạm vào ô tương ứng
          để đánh dấu.
        </p>
      </div>
      <div className="grid two-col">
        <div className="card">
          <div className="loto-player-join">
            <div className="form-grid">
              <label className="field">
                Tên khách
                <input
                  className="input"
                  type="text"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="Nhập tên để tham gia"
                  disabled={hasJoined || joining}
                />
              </label>
            </div>
            <div className="form-actions">
              <button
                className="btn"
                onClick={joinSession}
                disabled={
                  hasJoined ||
                  joining ||
                  !sessionId ||
                  !playerName.trim()
                }
              >
                {hasJoined
                  ? 'Đã tham gia'
                  : joining
                    ? 'Đang xác nhận...'
                    : 'Xác nhận tham gia'}
              </button>
              {hasJoined ? (
                <span className="status-pill">
                  Đã tham gia: {playerName.trim() || 'Khách'}
                </span>
              ) : null}
            </div>
            {sessionId ? (
              <span className="muted">
                {sessionStatus === 'waiting'
                  ? 'Đang chờ MC bắt đầu quay.'
                  : sessionStatus === 'active'
                    ? 'MC đang quay số.'
                    : 'Phiên đang chuẩn bị.'}
              </span>
            ) : (
              <span className="muted">Chưa có phiên Lô tô đang mở.</span>
            )}
            {joinError ? <p className="notice">{joinError}</p> : null}
          </div>
          <div className="loto-card">
            {card.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="loto-row">
                {row.map((number) => (
                  <button
                    key={number}
                    type="button"
                    className={`loto-number ${
                      marked.includes(number) ? 'marked' : ''
                    }`}
                    onClick={() => toggleMark(number)}
                  >
                    {number}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="loto-card-actions">
            <button className="btn" onClick={resetCard} disabled={hasJoined}>
              Tạo bảng mới
            </button>
            <span className="muted">Đã đánh dấu: {marked.length}</span>
          </div>
        </div>
        <div className="card">
          <h3>Số đã quay</h3>
          {loading ? (
            <p className="muted">Đang tải dữ liệu...</p>
          ) : error ? (
            <p className="notice">{error}</p>
          ) : draws.length ? (
            <div className="drawn-list">
              {draws.map((draw) => (
                <span key={draw.id} className="pill">
                  {draw.number}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">Chưa có số nào được quay.</p>
          )}
          <h3>Luật chơi nhanh</h3>
          <p>
            MC sẽ quay ngẫu nhiên từ 20-30 số trong dãy 1-90. Khách đánh dấu số đã
            quay và hô "Lô tô" khi đủ hàng theo luật tiệc.
          </p>
        </div>
      </div>
      {winningLine ? (
        <div className="wheel-popup">
          <div className="wheel-popup-backdrop" onClick={closeWinPopup} />
          <div className="wheel-popup-card" role="dialog" aria-modal="true">
            <p className="wheel-popup-eyebrow">Chúc mừng!</p>
            <p className="wheel-popup-name">Bạn đã có 1 hàng</p>
            <p className="wheel-popup-message">
              Dãy số: {winningLine.join(' - ')}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeWinPopup}
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
