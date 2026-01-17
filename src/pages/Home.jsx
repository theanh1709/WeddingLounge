export default function Home() {
  return (
    <section className="page">
      <div className="home-mobile card">
        <p className="eyebrow">Tiệc đám cưới</p>
        <h2>Thế Anh ❤️ Thùy Trang</h2>
        <p className="home-mobile-note">
          Mọi người hãy cùng tham dự và trải nghiệm bữa tiệc này cùng Thế Anh và Thùy Trang nhé.
        </p>
        <div className="home-mobile-actions">
          <a className="btn" href="#wishes">
            Gửi lời chúc
          </a>
          <a className="btn btn-outline" href="#loto-player">
            Lô tô khách
          </a>
          <a className="btn btn-outline" href="#drink-cam/camera">
            Drink Cam
          </a>
        </div>
      </div>
      <div className="hero">
        <div className="hero-text">
          <p className="eyebrow">Chào mừng</p>
          <h1>Kỷ niệm ngọt ngào cho cô dâu &amp; chú rể</h1>
          <p className="lead">
            Gửi lời chúc, quay quà may mắn, chơi lô tô truyền thống và random
            drink cùng camera cho đêm tiệc đáng nhớ.
          </p>
          <div className="cta-row">
            <a className="btn" href="#wishes">
              Gửi lời chúc
            </a>
            <a className="btn btn-outline" href="#wall">
              Xem tường lời chúc
            </a>
          </div>
        </div>
        <div className="hero-card card">
          <p className="tag">Hôm nay</p>
          <h3>4 trải nghiệm chính</h3>
          <ul className="hero-list">
            <li>Lời chúc trái tim trên nền video</li>
            <li>Vòng quay chọn khách may mắn</li>
            <li>Trò chơi lô tô Việt Nam</li>
            <li>Random drink với camera</li>
          </ul>
          <div className="hero-actions">
            <a className="btn btn-ghost" href="#wheel">
              Chơi vòng quay
            </a>
            <a className="btn btn-ghost" href="#loto-host">
              Lô tô MC
            </a>
          </div>
        </div>
      </div>
      <div className="section">
        <div className="section-header">
          <h2>Hướng dẫn nhanh</h2>
          <p>
            Mỗi màn hình có thể mở trên thiết bị khác nhau để trình chiếu và
            tương tác.
          </p>
        </div>
        <div className="grid">
          <div className="feature-card">
            <h4>Gửi lời chúc</h4>
            <p>
              Khách nhập tên và lời chúc. Sau khi gửi có thể tham gia vòng quay
              may mắn.
            </p>
            <a className="link" href="#wishes">
              Mở form lời chúc
            </a>
          </div>
          <div className="feature-card">
            <h4>Tường lời chúc</h4>
            <p>
              Hiển thị lời chúc dạng trái tim trên nền video cô dâu chú rể. Phù
              hợp màn hình lớn.
            </p>
            <a className="link" href="#wall">
              Mở tường lời chúc
            </a>
          </div>
          <div className="feature-card">
            <h4>Vòng quay may mắn</h4>
            <p>
              Chọn ngẫu nhiên khách đã gửi lời chúc để trao quà. Kết quả hiển thị
              rõ ràng sau khi dừng.
            </p>
            <a className="link" href="#wheel">
              Mở vòng quay
            </a>
          </div>
          <div className="feature-card">
            <h4>Lô tô + Random drink</h4>
            <p>
              MC quay số, khách dùng màn hình riêng đánh dấu. Random drink dùng
              camera tạo khoảnh khắc vui.
            </p>
            <a className="link" href="#loto-host">
              Mở trò chơi
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
