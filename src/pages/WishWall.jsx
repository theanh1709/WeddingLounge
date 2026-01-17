import { useCallback, useEffect, useRef, useState } from 'react'

export default function WishWall({ wishes }) {
  const [floatingHearts, setFloatingHearts] = useState([])
  const timeoutsRef = useRef([])

  const addHeart = useCallback((wish) => {
    if (!wish) {
      return
    }
    const heart = {
      id: `${wish.id}-${Math.random().toString(16).slice(2)}`,
      message: wish.message,
      name: wish.name,
      left: 6 + Math.random() * 84,
      size: 70 + Math.random() * 90,
      duration: 10 + Math.random() * 6,
      delay: Math.random() * 0.6,
    }

    setFloatingHearts((prev) => [...prev.slice(-18), heart])

    const timeoutId = window.setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((item) => item.id !== heart.id))
    }, heart.duration * 1000 + 1000)
    timeoutsRef.current.push(timeoutId)
  }, [])

  useEffect(() => {
    if (!wishes.length) {
      return
    }
    addHeart(wishes[wishes.length - 1])
  }, [wishes.length, addHeart])

  useEffect(() => {
    if (!wishes.length) {
      return
    }
    const intervalId = window.setInterval(() => {
      const wish = wishes[Math.floor(Math.random() * wishes.length)]
      addHeart(wish)
    }, 2200)
    return () => window.clearInterval(intervalId)
  }, [wishes, addHeart])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      timeoutsRef.current = []
    }
  }, [])

  return (
    <section className="page full-bleed">
      <div className="wish-wall">
        <video
          className="wish-video"
          src="/media/wedding.mp4"
          poster="/media/wedding-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="wish-overlay" />
        <div className="wish-content">
          <span style={{ color: '#f68686', fontSize: '1.6rem' }}>Save the date</span>
          <h3>Thế Anh ❤️ Thùy Trang</h3>
          <p className="wish-subtitle">
            24 - 01 - 2026
          </p>
          {!wishes.length && (
            <p className="wish-subtitle">Chưa có lời chúc nào được gửi.</p>
          )}
        </div>
        <div className="wish-hearts">
          {floatingHearts.map((heart) => (
            <div
              key={heart.id}
              className="wish-heart"
              style={{
                '--size': `${heart.size}px`,
                '--left': `${heart.left}%`,
                '--duration': `${heart.duration}s`,
                '--delay': `${heart.delay}s`,
              }}
            >
              <div className="heart-shape" />
              <div className="heart-text">
                <span className="heart-message">{heart.message}</span>
                <span className="heart-name">{heart.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* <div className="wish-footer card">
        <span>Hiện có {wishes.length} lời chúc được lưu.</span>
      </div> */}
    </section>
  )
}
