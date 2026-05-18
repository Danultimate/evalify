import { useConfig } from '../hooks/useConfig'

export default function RunButton({ onClick, label = 'Run Suite', disabled = false }) {
  const { isDemo } = useConfig()
  const isDisabled = disabled || isDemo

  const btn = (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={`font-mono text-xs px-4 py-2 rounded border transition-colors ${
        isDisabled
          ? 'border-border text-text-muted cursor-not-allowed opacity-50'
          : 'border-accent text-accent hover:bg-accent/10 cursor-pointer'
      }`}
    >
      {label}
    </button>
  )

  if (isDemo) {
    return (
      <div className="relative group inline-block">
        {btn}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
          <div className="bg-surface border border-border rounded px-3 py-2 text-xs font-mono text-text-muted whitespace-nowrap shadow-lg">
            Live runs disabled in demo mode
          </div>
        </div>
      </div>
    )
  }

  return btn
}
