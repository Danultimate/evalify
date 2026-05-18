import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { runs } from '../api/client'
import { useRunStream } from '../hooks/useRunStream'
import ScoreBar from '../components/ScoreBar'
import DiffView from '../components/DiffView'
import { modelLabel } from '../components/ModelCard'

function StatusBadge({ status }) {
  const cls = {
    complete: 'text-pass border-pass/40 bg-pass/10',
    running: 'text-info border-info/40 bg-info/10 animate-pulse',
    failed: 'text-fail border-fail/40 bg-fail/10',
  }[status] || 'text-text-muted border-border'
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded border ${cls}`}>
      {status}
    </span>
  )
}

function HallucinationBadge({ detected, explanation }) {
  if (!detected) return null
  return (
    <span
      title={explanation || 'Hallucination detected'}
      className="inline-flex items-center font-mono text-xs px-1.5 py-0.5 rounded border border-fail/40 bg-fail/10 text-fail cursor-help"
    >
      ⚠ hallucination
    </span>
  )
}

function ResultCell({ result, expected }) {
  const [expanded, setExpanded] = useState(false)

  if (!result) {
    return <td className="px-3 py-2.5 font-mono text-xs text-text-muted/40 text-center">—</td>
  }

  if (result.error) {
    return (
      <td className="px-3 py-2.5">
        <span className="font-mono text-xs text-fail" title={result.error}>error</span>
      </td>
    )
  }

  return (
    <td className="px-3 py-2.5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ScoreBar score={result.score} />
          <HallucinationBadge
            detected={result.hallucination_detected}
            explanation={result.hallucination_explanation}
          />
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-text-muted">
          <span>{result.latency_ms ? `${result.latency_ms}ms` : '—'}</span>
          <span>{result.cost_usd != null ? `$${result.cost_usd.toFixed(6)}` : '—'}</span>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="font-mono text-xs text-info hover:underline"
        >
          {expanded ? 'hide' : 'details'}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {result.output && (
            <div>
              <div className="font-mono text-xs text-text-muted mb-1">output</div>
              <pre className="font-mono text-xs bg-bg border border-border rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap text-text-primary">
                {result.output}
              </pre>
            </div>
          )}
          {expected && (
            <div>
              <div className="font-mono text-xs text-text-muted mb-1">diff</div>
              <DiffView expected={expected} actual={result.output} />
            </div>
          )}
          {result.judge_reasoning && (
            <div>
              <div className="font-mono text-xs text-text-muted mb-1">judge reasoning</div>
              <p className="font-mono text-xs text-text-muted bg-bg border border-border rounded p-2">
                {result.judge_reasoning}
              </p>
            </div>
          )}
          {result.hallucination_explanation && (
            <div>
              <div className="font-mono text-xs text-fail mb-1">hallucination detail</div>
              <p className="font-mono text-xs text-fail/80 bg-fail/5 border border-fail/20 rounded p-2">
                {result.hallucination_explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </td>
  )
}

export default function RunDetail() {
  const { runId } = useParams()
  const qc = useQueryClient()

  const { data: run } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => runs.get(runId),
    refetchInterval: d => (d?.status === 'running' ? 3000 : false),
  })

  const { data: resultList = [] } = useQuery({
    queryKey: ['results', runId],
    queryFn: () => runs.results(runId),
    enabled: !!runId,
  })

  useRunStream(runId, run?.status === 'running')

  const modelColumns = run?.models || []

  const resultsByCase = resultList.reduce((acc, r) => {
    if (!acc[r.test_case_id]) acc[r.test_case_id] = {}
    acc[r.test_case_id][r.model] = r
    return acc
  }, {})

  const testCaseIds = [...new Set(resultList.map(r => r.test_case_id))]

  const testCaseNames = resultList.reduce((acc, r) => {
    if (!acc[r.test_case_id]) acc[r.test_case_id] = r.test_case_name || r.test_case_id.slice(0, 8)
    return acc
  }, {})

  const testCaseExpected = resultList.reduce((acc, r) => {
    if (!acc[r.test_case_id] && r.expected_output) acc[r.test_case_id] = r.expected_output
    return acc
  }, {})

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-lg text-text-primary">{run?.name || 'run detail'}</h1>
        {run && <StatusBadge status={run.status} />}
      </div>

      {run && (
        <div className="flex gap-6 font-mono text-xs text-text-muted">
          <span>models: {modelColumns.map(m => modelLabel(m)).join(', ')}</span>
          {run.started_at && <span>started: {new Date(run.started_at).toLocaleString()}</span>}
          {run.completed_at && <span>completed: {new Date(run.completed_at).toLocaleString()}</span>}
        </div>
      )}

      {run?.status === 'running' && (
        <div className="font-mono text-xs text-info flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
          live — results streaming in
        </div>
      )}

      {testCaseIds.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg px-4 py-12 text-center font-mono text-xs text-text-muted">
          {run?.status === 'running' ? 'waiting for first result…' : 'no results'}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-mono text-xs text-text-muted font-normal sticky left-0 bg-surface min-w-[160px]">
                  test case
                </th>
                {modelColumns.map(m => (
                  <th key={m} className="px-3 py-2 text-left font-mono text-xs text-text-muted font-normal min-w-[200px]">
                    {modelLabel(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {testCaseIds.map(caseId => (
                <tr key={caseId} className="border-b border-border/50">
                  <td className="px-3 py-2.5 sticky left-0 bg-surface">
                    <div className="font-mono text-xs text-text-primary">{testCaseNames[caseId]}</div>
                  </td>
                  {modelColumns.map(m => (
                    <ResultCell
                      key={m}
                      result={resultsByCase[caseId]?.[m]}
                      expected={testCaseExpected[caseId]}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
