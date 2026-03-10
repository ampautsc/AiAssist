import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'
import LobbyPage from './pages/LobbyPage'
import CharacterPage from './pages/CharacterPage'
import CombatLogPage from './pages/CombatLogPage'

// ── Inline styles (no external CSS file required) ───────────────────────────
const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '0.75rem 1.5rem',
    background: '#16213e',
    borderBottom: '2px solid #e94560',
  },
  brand: {
    color: '#e94560',
    fontWeight: 700,
    fontSize: '1.2rem',
    textDecoration: 'none',
    letterSpacing: '0.05em',
  },
  navLink: {
    color: '#a8b2d8',
    textDecoration: 'none',
    fontSize: '0.95rem',
  },
  activeLink: {
    color: '#e94560',
    fontWeight: 600,
    textDecoration: 'none',
    fontSize: '0.95rem',
  },
  main: {
    padding: '1.5rem',
    minHeight: 'calc(100vh - 52px)',
  },
  homePage: {
    maxWidth: 720,
    margin: '3rem auto',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: '3rem',
    color: '#e94560',
    margin: 0,
    letterSpacing: '0.03em',
  },
  heroSub: {
    color: '#a8b2d8',
    fontSize: '1.1rem',
    margin: '0.75rem 0 2rem',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  card: {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: 8,
    padding: '1.25rem',
    textDecoration: 'none',
    color: '#e0e0e0',
    transition: 'border-color 0.2s, transform 0.15s',
  },
}

// ── Home / splash ────────────────────────────────────────────────────────────
function HomePage() {
  return (
    <div style={styles.homePage}>
      <h1 style={styles.heroTitle}>⚔️ MMO D&amp;D</h1>
      <p style={styles.heroSub}>
        An AI-driven Dungeons &amp; Dragons experience — adventure with friends, anywhere.
      </p>

      <div style={styles.cardGrid}>
        {[
          { to: '/lobby', emoji: '🏰', label: 'Party Lobby', desc: 'Find or create a party' },
          { to: '/character', emoji: '🧙', label: 'Characters', desc: 'Create & manage your heroes' },
          { to: '/game', emoji: '🗺️', label: 'Game Table', desc: 'Hex map & active session' },
          { to: '/combat', emoji: '⚔️', label: 'Combat Log', desc: 'Review past encounters' },
        ].map(({ to, emoji, label, desc }) => (
          <Link key={to} to={to} style={styles.card}>
            <div style={{ fontSize: '2rem' }}>{emoji}</div>
            <strong>{label}</strong>
            <p style={{ fontSize: '0.82rem', color: '#a8b2d8', margin: '0.4rem 0 0' }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Game Table page (hex map preview) ────────────────────────────────────────
// Dynamically imported to keep the main bundle lean
import { lazy, Suspense } from 'react'
const HexMap = lazy(() => import('./components/HexMap'))

const SAMPLE_TOKENS = [
  { id: 'p1', q: 2,  r: 1,  color: '#4fc3f7', label: 'A' },
  { id: 'p2', q: 3,  r: 0,  color: '#81c784', label: 'B' },
  { id: 'p3', q: 1,  r: 2,  color: '#ffb74d', label: 'C' },
  { id: 'e1', q: 7,  r: 3,  color: '#e57373', label: 'G' },
  { id: 'e2', q: 8,  r: 2,  color: '#e57373', label: 'G' },
]

function GamePage() {
  return (
    <div>
      <h2 style={{ color: '#e94560', marginTop: 0 }}>🗺️ Game Table</h2>
      <p style={{ color: '#a8b2d8', margin: '0 0 1rem' }}>
        Active session hex map. Blue/green tokens are party members; red tokens are enemies.
      </p>
      <Suspense fallback={<p>Loading map…</p>}>
        <HexMap width={900} height={520} hexSize={44} tokens={SAMPLE_TOKENS} />
      </Suspense>
    </div>
  )
}

// ── App shell with navigation ─────────────────────────────────────────────────
export default function App() {
  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    isActive ? styles.activeLink : styles.navLink

  return (
    <BrowserRouter>
      <nav style={styles.nav}>
        <Link to="/" style={styles.brand}>⚔️ MMO D&amp;D</Link>
        <NavLink to="/lobby"     style={linkStyle}>Lobby</NavLink>
        <NavLink to="/character" style={linkStyle}>Characters</NavLink>
        <NavLink to="/game"      style={linkStyle}>Game Table</NavLink>
        <NavLink to="/combat"    style={linkStyle}>Combat Log</NavLink>
      </nav>

      <main style={styles.main}>
        <Routes>
          <Route path="/"          element={<HomePage />} />
          <Route path="/lobby"     element={<LobbyPage />} />
          <Route path="/character" element={<CharacterPage />} />
          <Route path="/game"      element={<GamePage />} />
          <Route path="/combat"    element={<CombatLogPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
