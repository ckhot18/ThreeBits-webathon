import { NavLink, Outlet, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/report', label: 'Report' },
  { to: '/track', label: 'Track' },
  { to: '/admin', label: 'Admin' },
]

function RootLayout() {
  const location = useLocation()

  return (
    <div className="app-shell" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--cyan), #0a6a5a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#ffffff',
              boxShadow: '0 8px 20px rgba(0,77,64,0.22)',
            }}>S</div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.1 }}>ShikayatTrack</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI Grievance Platform</div>
            </div>
          </NavLink>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: 4 }} className="desktop-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <span className="live-dot" style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--green)',
              display: 'inline-block',
              boxShadow: '0 0 8px var(--green)',
            }} />
            <span style={{ display: 'none' }} className="live-label">Live</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, maxWidth: 1280, margin: '0 auto', width: '100%', padding: '24px 16px 80px', boxSizing: 'border-box' }}>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
                color: isActive ? 'var(--cyan)' : 'var(--text-muted)',
                background: isActive ? 'rgba(185, 246, 202, 0.42)' : 'transparent',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                transition: 'color 0.2s, background 0.2s',
                minWidth: 52,
              }}
            >
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        textAlign: 'center',
        fontSize: 11,
        color: 'var(--text-muted)',
        background: 'rgba(255,255,255,0.8)',
        display: 'none',
      }} className="desktop-footer">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>Built by ThreeBits at Webathon 26'</span>
          <a
            href="#"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository link"
            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-secondary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.42-4.04-1.42-.55-1.4-1.34-1.78-1.34-1.78-1.1-.75.08-.74.08-.74 1.21.09 1.85 1.25 1.85 1.25 1.08 1.84 2.83 1.31 3.52 1 .11-.79.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.23a11.48 11.48 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.64.25 2.86.12 3.16.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z" />
            </svg>
          </a>
        </div>
      </footer>

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .live-label { display: inline !important; }
          .desktop-footer { display: block !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </div>
  )
}

export default RootLayout
