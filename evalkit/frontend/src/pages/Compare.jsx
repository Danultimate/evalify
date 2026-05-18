import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { runs, results as resultsApi } from '../api/client'
import { scoreBadge, scoreColor } from '../components/ScoreBar'
import { modelLabel } from '../components/ModelCard'

const REGRESSION_THRESHOLD = 0.1

function ScoreCell({ score, baseline, isBaseline }) {
  if (score == null) {
    return <td className="px-3 py-2 font-mono text-xs text-text-muted/40 text-center">—</td>
  }

  const delta = baseline != null && !isBaseline ? score - baseline : null
  const isRegression = delta != null && delta < -REGRESSION_THRESHOLD
  const isImprovement = delta != null && delta > REGRESSION_THRESHOLD

  const pct = Math.round(score * 100)

  return (
    <td className="px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className={`font-mono text-xs px-1.5 py-0.5 rounded border tabular ${scoreBadge(score)}`}>
          {pct}%
        </span>
        {isRegression && (
          <span className="font-mono text-xs text-fail" title={`−${Math.round(Math.abs(delta) * 100)}%`}>
            ▼{Math.round(Math.abs(delta) * 100)}
          </span>
        )}
        {isImprovement && (
          <span className="font-mono text-xs text-pass" title={`+${Math.round(delta * 100)}%`}>
            ▲{Math.round(delta * 100)}
          </span>
        )}
      </div>
    </td>
  )
}

function RunSelector({ runList, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {runList.map(r => (
        <label key={r.id} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(r.id)}
            onChange={() => onChange(r.id)}
            className="accent-accent"
          />
          <span className="font-mono text-xs text-text-primary">{r.name || r.id.slice(0, 8)}</span>
          <span className="font-mono text-xs text-text-muted">
            ({new Date(r.started_at).toLocaleDateString()})
          </span>
        </label>
      ))}
    </div>
  )
}

export default function Compare() {
  const [selectedRunIds, setSelectedRunIds] = useState([])
  const [baselineId, setBaselineId] = useState(null)

  const { data: runList = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: runs.list,
  })

  const completedRuns = runList.filter(r => r.status === 'complete')

  const { data: compareData = [], isLoading } = useQuery({
    queryKey: ['compare', selectedRunIds],
    queryFn: () => resultsApi.compare(selectedRunIds),
    enabled: selectedRunIds.length > 1,
  })

  const toggleRun = id => {
    setSelectedRunIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(r => r !== id)
        if (baselineId === id) setBaselineId(next[0] || null)
        return next
      }
      const next = [...prev, id]
      if (!baselineId) setBaselineId(id)
      return next
    })
  }

  const selectedRuns = useMemo(
    () => completedRuns.filter(r => selectedRunIds.includes(r.id)),
    [completedRuns, selectedRunIds]
  )

  const tableData = useMemo(() => {
    if (!compareData.length) return { caseIds: [], caseNames: {}, runModels: {}, cells: {} }

    const caseIds = [...new Set(compareData.map(r => r.test_case_id))]
    const caseNames = {}
    const runModels = {}
    const cells = {}

    compareData.forEach(r => {
      caseNames[r.test_case_id] = r.test_case_name || r.test_case_id.slice(0, 8)
      const key = `${r.test_case_id}||${r.run_id}||${r.model}`
      cells[key] = r

      if (!runModels[r.run_id]) runModels[r.run_id] = new Set()
      runModels[r.run_id].add(r.model)
    })

    return { caseIds, caseNames, runModels, cells }
  }, [compareData])

  const columns = useMemo(() => {
    return selectedRuns.flatMap(run =>
      (run.models || []).map(m => ({ runId: run.id, model: m, runName: run.name || run.id.slice(0, 8) }))
    )
  }, [selectedRuns])

  const baselineScores = useMemo(() => {
    if (!baselineId) return {}
    const baseline = {}
    tableData.caseIds.forEach(caseId => {
      const run = selectedRuns.find(r => r.id === baselineId)
      if (!run) return
      run.models?.forEach(m => {
        const cell = tableData.cells[`${caseId}||${baselineId}||${m}`]
        if (cell?.score != null) {
          if (!baseline[caseId]) baseline[caseId] = {}
          baseline[caseId][m] = cell.score
        }
      })
    })
    return baseline
  }, [baselineId, tableData, selectedRuns])

  const summaryStats = useMemo(() => {
    return columns.map(col => {
      const colResults = tableData.caseIds
        .map(caseId => tableData.cells[`${caseId}||${col.runId}||${col.model}`])
        .filter(Boolean)
      const total = colResults.length
      const passed = colResults.filter(r => r.passed).length
      const avgScore = total ? colResults.reduce((a, r) => a + (r.score ?? 0), 0) / total : null
      const totalCost = colResults.reduce((a, r) => a + (r.cost_usd ?? 0), 0)
      return { ...col, total, passed, avgScore, totalCost }
    })
  }, [columns, tableData])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="font-mono text-lg text-text-primary">compare runs</h1>

      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <div className="font-mono text-xs text-text-muted">select runs to compare</div>
        {completedRuns.length === 0 ? (
          <div className="font-mono text-xs text-text-muted italic">no completed runs yet</div>
        ) : (
          <RunSelector runList={completedRuns} selected={selectedRunIds} onChange={toggleRun} />
        )}
        {selectedRunIds.length > 1 && (
          <div className="flex items-center gap-2 pt-1">
            <span className="font-mono text-xs text-text-muted">baseline:</span>
            <select
              className="bg-bg border border-border rounded px-2 py-1 font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
              value={baselineId || ''}
              onChange={e => setBaselineId(e.target.value)}
            >
              {selectedRuns.map(r => (
                <option key={r.id} value={r.id}>{r.name || r.id.slice(0, 8)}</option>
              ))}
            </select>
            <span className="font-mono text-xs text-text-muted">
              — regressions &gt;{Math.round(REGRESSION_THRESHOLD * 100)}% shown as <span className="text-fail">▼red</span>
            </span>
          </div>
        )}
      </div>

      {selectedRunIds.length > 1 && summaryStats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryStats.map(s => (
            <div key={`${s.runId}-${s.model}`} className="bg-surface border border-border rounded-lg p-3 space-y-1">
              <div className="font-mono text-xs text-text-muted truncate">{s.runName}</div>
              <div className="font-mono text-xs text-text-primary">{modelLabel(s.model)}</div>
              <div className="font-mono text-xs tabular" style={{ color: scoreColor(s.avgScore) }}>
                {s.avgScore != null ? `${Math.round(s.avgScore * 100)}%` : '—'} avg
              </div>
              <div className="font-mono text-xs text-text-muted">
                {s.passed}/{s.total} passed · ${s.totalCost.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRunIds.length < 2 ? (
        <div className="bg-surface border border-border rounded-lg px-4 py-12 text-center font-mono text-xs text-text-muted">
          select 2 or more completed runs to compare
        </div>
      ) : isLoading ? (
        <div className="font-mono text-xs text-text-muted py-4">loading…</div>
      ) : tableData.caseIds.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg px-4 py-12 text-center font-mono text-xs text-text-muted">
          no shared test cases found
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-mono text-xs text-text-muted font-normal sticky left-0 bg-surface min-w-[180px]">
                  test case
                </th>
                {columns.map(col => (
                  <th key={`${col.runId}-${col.model}`} className="px-3 py-2 text-left font-mono text-xs font-normal min-w-[140px]">
                    <div className={`text-text-muted ${col.runId === baselineId ? 'border-b border-accent/40 pb-0.5' : ''}`}>
                      {col.runName}
                    </div>
                    <div className="text-text-muted/60">{modelLabel(col.model)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.caseIds.map(caseId => (
                <tr key={caseId} className="border-b border-border/50 hover:bg-border/10 transition-colors">
                  <td className="px-3 py-2.5 sticky left-0 bg-surface font-mono text-xs text-text-primary">
                    {tableData.caseNames[caseId]}
                  </td>
                  {columns.map(col => {
                    const cell = tableData.cells[`${caseId}||${col.runId}||${col.model}`]
                    const baselineScore = baselineId !== col.runId
                      ? baselineScores[caseId]?.[col.model]
                      : null
                    return (
                      <ScoreCell
                        key={`${col.runId}-${col.model}`}
                        score={cell?.score ?? null}
                        baseline={baselineScore}
                        isBaseline={col.runId === baselineId}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
