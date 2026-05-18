import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { runs, models } from '../api/client'
import { CostLineChart, PassRateBarChart } from '../components/CostChart'
import { modelLabel } from '../components/ModelCard'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="font-mono text-xs text-text-muted mb-1">{label}</div>
      <div className="font-mono text-2xl text-text-primary tabular">{value}</div>
      {sub && <div className="font-mono text-xs text-text-muted mt-1">{sub}</div>}
    </div>
  )
}

function StatusBadge({ status }) {
  const cls = {
    complete: 'text-pass border-pass/40 bg-pass/10',
    running: 'text-info border-info/40 bg-info/10',
    failed: 'text-fail border-fail/40 bg-fail/10',
  }[status] || 'text-text-muted border-border'
  return (
    <span className={`font-mono text-xs px-1.5 py-0.5 rounded border ${cls}`}>
      {status}
    </span>
  )
}

export default function Dashboard() {
  const { data: runList = [], isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: runs.list,
  })

  const { data: modelList = [] } = useQuery({
    queryKey: ['models'],
    queryFn: models.list,
  })

  const totalRuns = runList.length
  const completedRuns = runList.filter(r => r.status === 'complete')

  const totalCost = completedRuns.reduce((acc, r) => acc + (r.total_cost ?? 0), 0)
  const avgCost = completedRuns.length ? totalCost / completedRuns.length : 0

  const totalTests = completedRuns.reduce((acc, r) => acc + (r.total_results ?? 0), 0)
  const passedTests = completedRuns.reduce((acc, r) => acc + (r.passed_results ?? 0), 0)

  const costChartData = completedRuns
    .slice()
    .reverse()
    .slice(-20)
    .map((r, i) => ({
      label: `#${i + 1}`,
      cost: r.total_cost ?? 0,
    }))

  const passRateByModel = completedRuns.reduce((acc, run) => {
    const passRate = run.total_results
      ? Math.round(((run.passed_results ?? 0) / run.total_results) * 100)
      : 0;
    (run.models || []).forEach(m => {
      if (!acc[m]) acc[m] = { total: 0, count: 0 }
      acc[m].total += passRate
      acc[m].count += 1
    })
    return acc
  }, {})

  const passRateChartData = Object.entries(passRateByModel).map(([modelId, s]) => ({
    model: modelLabel(modelId),
    modelId,
    passRate: Math.round(s.total / s.count),
  }))

  const recentRuns = runList.slice(0, 10)

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="font-mono text-lg text-text-primary">dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="total runs" value={totalRuns} />
        <StatCard
          label="tests passed"
          value={totalTests ? `${Math.round((passedTests / totalTests) * 100)}%` : '—'}
          sub={`${passedTests}/${totalTests}`}
        />
        <StatCard
          label="avg cost / run"
          value={completedRuns.length ? `$${avgCost.toFixed(4)}` : '—'}
        />
        <StatCard
          label="models tracked"
          value={modelList.length}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="font-mono text-xs text-text-muted mb-3">cost over runs</div>
          {costChartData.length > 1 ? (
            <CostLineChart data={costChartData} />
          ) : (
            <div className="h-40 flex items-center justify-center font-mono text-xs text-text-muted">
              no data yet
            </div>
          )}
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="font-mono text-xs text-text-muted mb-3">pass rate by model</div>
          {passRateChartData.length > 0 ? (
            <PassRateBarChart data={passRateChartData} />
          ) : (
            <div className="h-40 flex items-center justify-center font-mono text-xs text-text-muted">
              no data yet
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="font-mono text-xs text-text-muted">recent runs</span>
          <Link to="/suites" className="font-mono text-xs text-accent hover:underline">
            run suite →
          </Link>
        </div>
        {isLoading ? (
          <div className="px-4 py-6 font-mono text-xs text-text-muted">loading…</div>
        ) : recentRuns.length === 0 ? (
          <div className="px-4 py-6 font-mono text-xs text-text-muted">no runs yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['name', 'suite', 'models', 'status', 'started'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-mono text-xs text-text-muted font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRuns.map(run => (
                <tr key={run.id} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/runs/${run.id}`}
                      className="font-mono text-xs text-info hover:underline"
                    >
                      {run.name || 'unnamed run'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-text-muted">
                    {run.suite_name || run.suite_id?.slice(0, 8) || '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-text-muted">
                    {(run.models || []).map(m => modelLabel(m)).join(', ')}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-text-muted">
                    {run.started_at ? new Date(run.started_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
