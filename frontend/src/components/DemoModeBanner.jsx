import { useConfig } from '../hooks/useConfig'

export default function DemoModeBanner() {
  const { isDemo } = useConfig()
  if (!isDemo) return null

  return (
    <div className="bg-surface border-b border-warn/30 px-6 py-1.5 flex items-center justify-center gap-2">
      <span className="text-warn font-mono text-xs">● DEMO MODE</span>
      <span className="text-text-muted text-xs font-mono">
        — pre-seeded data · live runs disabled · contact{' '}
        <a href="mailto:daniel.blanco@douglassdigital.com" className="text-info hover:underline">
          daniel.blanco@douglassdigital.com
        </a>{' '}
        for a walkthrough
      </span>
    </div>
  )
}
