const formatTime = (value) => {
  if (!value) {
    return ''
  }
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return ''
  }
  return new Date(timestamp).toLocaleString('vi-VN')
}

const parseTime = (value) => {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export default function WishList({ wishes, wishLoading, wishError }) {
  const sortedWishes = [...wishes].sort((a, b) => {
    const timeA = parseTime(a?.createdAt)
    const timeB = parseTime(b?.createdAt)
    return timeB - timeA
  })

  return (
    <section className="page">
      <div className="page-header">
        <h2>Danh sách lời chúc</h2>
        <p>Hiển thị đầy đủ tên khách và lời chúc đã gửi.</p>
      </div>
      <div className="card">
        {wishLoading ? (
          <p className="muted">Đang tải dữ liệu...</p>
        ) : wishError ? (
          <p className="notice">{wishError}</p>
        ) : sortedWishes.length === 0 ? (
          <p className="muted">Chưa có lời chúc nào.</p>
        ) : (
          <div className="wish-log">
            {sortedWishes.map((wish) => (
              <div key={wish.id} className="wish-log-item">
                <div className="wish-log-main">
                  <span className="wish-log-name">{wish.name}</span>
                  <p className="wish-log-message">{wish.message}</p>
                </div>
                <span className="wish-log-time">{formatTime(wish.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
