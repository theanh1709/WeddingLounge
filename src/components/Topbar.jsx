export default function Topbar({ navItems, activePath, isHandheld }) {
  const brandMarkSrc = `${import.meta.env.BASE_URL}media/brand-mark.png`
  return (
    <header className="topbar">
      <a className="brand" href="#home" aria-label="Trang chu">
        <img className="brand-mark" src={brandMarkSrc} alt="L & V" />
        <div>
          <p className="brand-title">Wedding Lounge</p>
          <p className="brand-subtitle">Không gian trải nghiệm cho tiệc cưới</p>
        </div>
      </a>
      {!isHandheld && (
        <nav className="nav">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={`#${item.path}`}
              className={activePath === item.path ? 'active' : ''}
              data-path={item.path}
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
