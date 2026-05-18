import { diffWords } from 'diff'

export default function DiffView({ expected, actual }) {
  if (!expected || !actual) {
    return (
      <p className="text-text-muted text-xs font-mono italic">
        {!expected ? 'No expected output set.' : 'No actual output.'}
      </p>
    )
  }

  const parts = diffWords(expected, actual)

  return (
    <div className="font-mono text-xs leading-relaxed bg-bg rounded p-3 border border-border overflow-auto max-h-48">
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <span key={i} className="bg-pass/20 text-pass">
              {part.value}
            </span>
          )
        }
        if (part.removed) {
          return (
            <span key={i} className="bg-fail/20 text-fail line-through">
              {part.value}
            </span>
          )
        }
        return <span key={i} className="text-text-muted">{part.value}</span>
      })}
    </div>
  )
}
