import { useEffect, useMemo, useRef, useState } from 'react'
import { wheelColors } from '../data/theme'

const SPIN_DURATION_MS = 30000
const CONFETTI_COLORS = ['#f2b59f', '#f7ddc9', '#e59c88', '#ffd6a3', '#d08c73']
const CONFETTI_COUNT = 18

export default function Wheel({ wishes }) {
  const [spinDeg, setSpinDeg] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [luckyList, setLuckyList] = useState([])
  const [activeWinner, setActiveWinner] = useState(null)
  const [celebrationKey, setCelebrationKey] = useState(0)
  const spinTimeoutRef = useRef(null)

  const { participants, wishLookup } = useMemo(() => {
    const seen = new Set()
    const uniqueNames = []
    const lookup = {}
    wishes.forEach((wish) => {
      const name = (wish?.name || '').trim()
      if (!name) {
        return
      }
      const key = name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        uniqueNames.push(name)
      }
      lookup[key] = {
        name,
        message: (wish?.message || '').trim(),
      }
    })
    return { participants: uniqueNames, wishLookup: lookup }
  }, [wishes])

  const items = participants.length ? participants : ['Chưa có khách']
  const angle = 360 / items.length

  const gradient = useMemo(() => {
    return items
      .map((_, index) => {
        const start = angle * index
        const end = angle * (index + 1)
        return `${wheelColors[index % wheelColors.length]} ${start}deg ${end}deg`
      })
      .join(', ')
  }, [items, angle, wheelColors])

  const confettiBits = useMemo(() => {
    return Array.from({ length: CONFETTI_COUNT }, (_, index) => {
      const x = Math.round(Math.random() * 260 - 130)
      const y = Math.round(Math.random() * -160 - 40)
      const size = Math.round(Math.random() * 6 + 6)
      const rotate = Math.round(Math.random() * 360)
      const delay = Number((Math.random() * 0.35).toFixed(2))
      return {
        id: `${celebrationKey}-${index}`,
        x,
        y,
        size,
        rotate,
        delay,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      }
    })
  }, [celebrationKey])

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        window.clearTimeout(spinTimeoutRef.current)
      }
    }
  }, [])

  const spinWheel = () => {
    if (isSpinning || participants.length === 0) {
      return
    }
    setIsSpinning(true)
    setActiveWinner(null)
    const spinAmount =
      360 * (9 + Math.floor(Math.random() * 6)) + Math.random() * 360
    const nextSpin = spinDeg + spinAmount
    const normalized = ((nextSpin % 360) + 360) % 360
    const index = Math.floor(((360 - normalized + angle / 2) % 360) / angle)
    const winningName = items[index]
    const wishKey = winningName.toLowerCase()
    const winningWish = {
      name: winningName,
      message: wishLookup[wishKey]?.message || '',
    }
    setSpinDeg(nextSpin)
    if (spinTimeoutRef.current) {
      window.clearTimeout(spinTimeoutRef.current)
    }
    spinTimeoutRef.current = window.setTimeout(() => {
      setIsSpinning(false)
      setLuckyList((prev) => [
        ...prev,
        { ...winningWish, id: `${Date.now()}-${Math.random()}` },
      ])
      setCelebrationKey((prev) => prev + 1)
      setActiveWinner(winningWish)
    }, SPIN_DURATION_MS + 200)
  }

  const canSpin = participants.length > 0 && !isSpinning && !activeWinner
  const closePopup = () => setActiveWinner(null)
  const resetLuckyList = () => setLuckyList([])

  return (
    <section className="page full-bleed wheel-page">
      <div className="page-header">
        <h2>Vòng quay may mắn</h2>
        <p>Quay ngẫu nhiên tên khách đã gửi lời chúc để trao quà.</p>
      </div>
      <div className="wheel-layout">
        <div className="wheel-stage">
          <div
            className={`wheel-pointer${isSpinning ? ' is-spinning' : ''}`}
          />
          <div
            className="wheel"
            style={{
              '--spin': `${spinDeg}deg`,
              '--spin-duration': `${SPIN_DURATION_MS}ms`,
              background: `conic-gradient(${gradient})`,
            }}
          >
            {items.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="wheel-label"
                style={{
                  '--label-angle': `${angle * index}deg`,
                }}
              >
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn wheel-center-button"
            onClick={spinWheel}
            disabled={!canSpin}
          >
            {isSpinning ? 'Đang quay...' : 'Bắt đầu quay'}
          </button>
        </div>
        <div className="card wheel-panel">
          <div className="wheel-panel-head">
            <div>
              <h3>Danh sách khách may mắn</h3>
              <p className="muted">
                Hiển thị khách được quay trúng sau mỗi lần xoay.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline wheel-reset"
              onClick={resetLuckyList}
              disabled={!luckyList.length}
            >
              Reset danh sách
            </button>
          </div>
          <div className="participant-meta">
            Tổng lượt trúng: <strong>{luckyList.length}</strong>
          </div>
          {luckyList.length ? (
            <div className="lucky-list">
              {luckyList.map((entry) => (
                <div key={entry.id} className="lucky-item">
                  <span className="lucky-name">{entry.name}</span>
                  {entry.message ? (
                    <span className="lucky-message">"{entry.message}"</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Chưa có khách may mắn nào.</p>
          )}
        </div>
      </div>
      {activeWinner ? (
        <div className="wheel-popup">
          <div className="wheel-popup-backdrop" onClick={closePopup} />
          <div className="wheel-popup-card" role="dialog" aria-modal="true">
            <div className="wheel-popup-celebration">
              {confettiBits.map((bit) => (
                <span
                  key={bit.id}
                  className="wheel-confetti"
                  style={{
                    '--x': `${bit.x}px`,
                    '--y': `${bit.y}px`,
                    '--size': `${bit.size}px`,
                    '--rotate': `${bit.rotate}deg`,
                    '--delay': `${bit.delay}s`,
                    '--color': bit.color,
                  }}
                />
              ))}
            </div>
            <p className="wheel-popup-eyebrow">Chúc mừng!</p>
            <p className="wheel-popup-name">{activeWinner.name}</p>
            <p className="wheel-popup-message">
              {activeWinner.message
                ? `"${activeWinner.message}"`
                : 'Chưa có lời chúc gửi kèm.'}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closePopup}
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
