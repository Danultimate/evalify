export function scoreBadge(score) {
  if (score === null || score === undefined) return 'text-text-muted border-border'
  if (score >= 0.7) return 'text-pass border-pass/40 bg-pass/10'
  if (score >= 0.5) return 'text-warn border-warn/40 bg-warn/10'
  return 'text-fail border-fail/40 bg-fail/10'
}

export function scoreColor(score) {
  if (score === null || score === undefined) return '#8b949e'
  if (score >= 0.7) return '#3fb950'
  if (score >= 0.5) return '#d29922'
  return '#f85149'
}

export default function ScoreBar({ score }) {
  if (score === null || score === undefined) {
    return <span className="font-mono text-xs text-text-muted">—</span>
  }
  const pct = Math.round(score * 100)
  const color = scoreColor(score)
  const badgeCls = scoreBadge(score)

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-xs px-1.5 py-0.5 rounded border tabular ${badgeCls}`}>
        {pct}%
      </span>
      <div className="flex-1 h-1 bg-border rounded-full min-w-[40px]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
