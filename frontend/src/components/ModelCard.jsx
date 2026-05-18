import ScoreBar from './ScoreBar'

const PROVIDER_COLORS = {
  anthropic: '#cc785c',
  openai: '#10a37f',
  google: '#4285f4',
}

const MODEL_LABELS = {
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-haiku-4-20250514': 'Claude Haiku 4',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
}

export function modelLabel(model) {
  return MODEL_LABELS[model] || model
}

export default function ModelCard({ model, stats }) {
  const { avgScore, passRate, totalCost, avgLatency, totalRuns } = stats
  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-text-primary">{modelLabel(model)}</span>
        <span className="font-mono text-xs text-text-muted">{totalRuns} runs</span>
      </div>
      <ScoreBar score={avgScore} />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="font-mono text-xs text-text-muted">pass rate</div>
          <div className="font-mono text-sm tabular">{Math.round(passRate * 100)}%</div>
        </div>
        <div>
          <div className="font-mono text-xs text-text-muted">avg latency</div>
          <div className="font-mono text-sm tabular">{avgLatency}ms</div>
        </div>
        <div>
          <div className="font-mono text-xs text-text-muted">total cost</div>
          <div className="font-mono text-sm tabular">${totalCost.toFixed(4)}</div>
        </div>
      </div>
    </div>
  )
}
