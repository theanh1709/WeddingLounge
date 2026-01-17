import { useState } from 'react'
import { addWish } from '../services/wishes'
import { SUPABASE_CONFIG_ERROR } from '../services/supabaseClient'

export default function Wishes({
  wishes,
  onWishAdded,
  lastGuest,
  setLastGuest,
  wishError,
  wishLoading,
}) {
  const [name, setName] = useState(lastGuest || '')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const recentWishes = [...wishes].slice(-6).reverse()

  const onSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedMessage = message.trim()
    if (!trimmedName || !trimmedMessage) {
      setStatus('Vui lòng nhập đầy đủ tên và lời chúc.')
      return
    }
    setIsSubmitting(true)
    setStatus('Đang gửi lời chúc...')
    const { data, error } = await addWish({
      name: trimmedName,
      message: trimmedMessage,
    })
    setIsSubmitting(false)
    if (error) {
      setStatus(
        error.code === SUPABASE_CONFIG_ERROR
          ? 'Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env.'
          : 'Không thể gửi lời chúc. Vui lòng thử lại.',
      )
      return
    }
    if (data && onWishAdded) {
      onWishAdded(data)
    }
    setLastGuest(trimmedName)
    setMessage('')
    setStatus('Lời chúc đã được gửi. Cảm ơn bạn!')
  }

  return (
    <section className="page">
      <div className="page-header">
        <h2>Gửi lời chúc đến cô dâu &amp; chú rể</h2>
        <p>
          Cảm ơn bạn đã tham dự tiệc cưới của Thế Anh và Thùy Trang. Hãy để lại
          lời chúc ngọt ngào dành cho chúng mình nhé!
        </p>
      </div>
      <div className="grid two-col">
        <form className="card form-card" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="field" htmlFor="guest-name">
              <span>Họ tên khách mời</span>
              <input
                id="guest-name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: Anh Tuấn"
              />
            </label>
            <label className="field" htmlFor="guest-message">
              <span>Lời chúc</span>
              <textarea
                id="guest-message"
                className="textarea"
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Gửi lời chúc thật ngọt ngào nhé!"
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi lời chúc'}
            </button>
                      </div>
          {status && <p className="notice">{status}</p>}
          {wishError && <p className="notice">{wishError}</p>}
        </form>
        <div className="card">
          <h3>Lời chúc gần đây</h3>
          {wishLoading ? (
            <p className="muted">Đang tải lời chúc...</p>
          ) : recentWishes.length === 0 ? (
            <p className="muted">Chưa có lời chúc nào.</p>
          ) : (
            <div className="wish-list">
              {recentWishes.map((wish) => (
                <div key={wish.id} className="wish-item">
                  <p className="wish-message">"{wish.message}"</p>
                  <span className="wish-name">— {wish.name}</span>
                </div>
              ))}
            </div>
          )}
          {/* <div className="hint">
            Mẹo: Hãy mở tường lời chúc trên màn hình lớn để tạo hiệu ứng sân
            khấu.
          </div> */}
        </div>
      </div>
    </section>
  )
}
