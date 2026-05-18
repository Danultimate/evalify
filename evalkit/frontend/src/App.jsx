import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TestSuites from './pages/TestSuites'
import RunDetail from './pages/RunDetail'
import Compare from './pages/Compare'
import DemoModeBanner from './components/DemoModeBanner'

function Nav() {
  const linkClass = ({ isActive }) =>
    `font-mono text-sm px-3 py-1.5 rounded transition-colors ${
      isActive
        ? 'text-accent bg-surface border border-border'
        : 'text-text-muted hover:text-text-primary'
    }`

  return (
    <nav className="border-b border-border bg-surface/50 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-6 h-12">
        <span className="font-mono text-accent font-bold text-sm tracking-widest mr-4">
          EVALKIT
        </span>
        <NavLink to="/" end className={linkClass}>dashboard</NavLink>
        <NavLink to="/suites" className={linkClass}>test suites</NavLink>
        <NavLink to="/compare" className={linkClass}>compare</NavLink>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <DemoModeBanner />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/suites" element={<TestSuites />} />
          <Route path="/suites/:suiteId" element={<TestSuites />} />
          <Route path="/runs/:runId" element={<RunDetail />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
