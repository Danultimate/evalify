import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { suites, cases, runs, models } from '../api/client'
import RunButton from '../components/RunButton'
import ScoreBar from '../components/ScoreBar'

const SCORING_METHODS = ['exact', 'semantic', 'llm_judge', 'rubric']

function ScoringBadge({ method }) {
  const colors = {
    exact: 'text-info border-info/40',
    semantic: 'text-warn border-warn/40',
    llm_judge: 'text-pass border-pass/40',
    rubric: 'text-text-muted border-border',
  }
  return (
    <span className={`font-mono text-xs px-1.5 py-0.5 rounded border ${colors[method] || 'text-text-muted border-border'}`}>
      {method}
    </span>
  )
}

function CreateSuiteModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md space-y-4">
        <h2 className="font-mono text-sm text-text-primary">new test suite</h2>
        <input
          className="w-full bg-bg border border-border rounded px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
          placeholder="suite name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="w-full bg-bg border border-border rounded px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
          placeholder="description (optional)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="font-mono text-xs px-4 py-2 rounded border border-border text-text-muted hover:bg-border/20 transition-colors"
          >
            cancel
          </button>
          <button
            onClick={() => name && onCreate({ name, description: desc || undefined })}
            disabled={!name}
            className="font-mono text-xs px-4 py-2 rounded border border-accent text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            create
          </button>
        </div>
      </div>
    </div>
  )
}

function AddCaseModal({ suiteId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '', system_prompt: '', user_prompt: '',
    expected_output: '', scoring_method: 'llm_judge', rubric: '', max_tokens: 1024,
  })

  const mut = useMutation({
    mutationFn: data => suites.addCase(suiteId, data),
    onSuccess: () => { qc.invalidateQueries(['suite', suiteId]); onClose() },
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-auto py-8">
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-lg space-y-3">
        <h2 className="font-mono text-sm text-text-primary">add test case</h2>
        {[
          { k: 'name', label: 'name', required: true },
          { k: 'system_prompt', label: 'system prompt' },
          { k: 'user_prompt', label: 'user prompt', required: true, rows: 3 },
          { k: 'expected_output', label: 'expected output', rows: 2 },
        ].map(({ k, label, required, rows }) => (
          <div key={k}>
            <label className="font-mono text-xs text-text-muted block mb-1">
              {label}{required && <span className="text-fail ml-0.5">*</span>}
            </label>
            {rows ? (
              <textarea
                rows={rows}
                className="w-full bg-bg border border-border rounded px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
                value={form[k]}
                onChange={e => set(k, e.target.value)}
              />
            ) : (
              <input
                className="w-full bg-bg border border-border rounded px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
                value={form[k]}
                onChange={e => set(k, e.target.value)}
              />
            )}
          </div>
        ))}
        <div>
          <label className="font-mono text-xs text-text-muted block mb-1">scoring method</label>
          <select
            className="w-full bg-bg border border-border rounded px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
            value={form.scoring_method}
            onChange={e => set('scoring_method', e.target.value)}
          >
            {SCORING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {form.scoring_method === 'rubric' && (
          <div>
            <label className="font-mono text-xs text-text-muted block mb-1">rubric criteria</label>
            <textarea
              rows={3}
              className="w-full bg-bg border border-border rounded px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-accent resize-none"
              placeholder="Describe what makes a good response..."
              value={form.rubric}
              onChange={e => set('rubric', e.target.value)}
            />
          </div>
        )}
        <div>
          <label className="font-mono text-xs text-text-muted block mb-1">max tokens</label>
          <input
            type="number"
            className="w-full bg-bg border border-border rounded px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
            value={form.max_tokens}
            onChange={e => set('max_tokens', parseInt(e.target.value) || 1024)}
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="font-mono text-xs px-4 py-2 rounded border border-border text-text-muted hover:bg-border/20 transition-colors"
          >
            cancel
          </button>
          <button
            onClick={() => form.name && form.user_prompt && mut.mutate(form)}
            disabled={!form.name || !form.user_prompt || mut.isPending}
            className="font-mono text-xs px-4 py-2 rounded border border-accent text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mut.isPending ? 'adding…' : 'add case'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RunModal({ suiteId, onClose }) {
  const navigate = useNavigate()
  const [runName, setRunName] = useState('')
  const [selectedModels, setSelectedModels] = useState([])

  const { data: modelList = [] } = useQuery({ queryKey: ['models'], queryFn: models.list })

  const mut = useMutation({
    mutationFn: data => runs.create(data),
    onSuccess: run => { onClose(); navigate(`/runs/${run.id}`) },
  })

  const toggleModel = id => setSelectedModels(prev =>
    prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
  )

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md space-y-4">
        <h2 className="font-mono text-sm text-text-primary">run suite</h2>
        <input
          className="w-full bg-bg border border-border rounded px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-accent"
          placeholder="run name (optional)"
          value={runName}
          onChange={e => setRunName(e.target.value)}
        />
        <div>
          <div className="font-mono text-xs text-text-muted mb-2">select models</div>
          <div className="space-y-1">
            {modelList.map(m => (
              <label key={m.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedModels.includes(m.id)}
                  onChange={() => toggleModel(m.id)}
                  className="accent-accent"
                />
                <span className="font-mono text-xs text-text-primary">{m.label}</span>
                <span className="font-mono text-xs text-text-muted">
                  ${m.input_cost_per_1k?.toFixed(4)}/1k in
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="font-mono text-xs px-4 py-2 rounded border border-border text-text-muted hover:bg-border/20 transition-colors"
          >
            cancel
          </button>
          <button
            onClick={() => selectedModels.length && mut.mutate({
              suite_id: suiteId,
              name: runName || undefined,
              models: selectedModels,
            })}
            disabled={selectedModels.length === 0 || mut.isPending}
            className="font-mono text-xs px-4 py-2 rounded border border-accent text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mut.isPending ? 'starting…' : 'run →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SuiteDetail({ suiteId }) {
  const qc = useQueryClient()
  const [showAddCase, setShowAddCase] = useState(false)
  const [showRun, setShowRun] = useState(false)

  const { data: suite, isLoading } = useQuery({
    queryKey: ['suite', suiteId],
    queryFn: () => suites.get(suiteId),
  })

  const deleteCase = useMutation({
    mutationFn: cases.delete,
    onSuccess: () => qc.invalidateQueries(['suite', suiteId]),
  })

  if (isLoading) return <div className="font-mono text-xs text-text-muted p-4">loading…</div>
  if (!suite) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm text-text-primary">{suite.name}</h2>
          {suite.description && (
            <p className="font-mono text-xs text-text-muted mt-0.5">{suite.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCase(true)}
            className="font-mono text-xs px-3 py-1.5 rounded border border-border text-text-muted hover:bg-border/20 transition-colors"
          >
            + case
          </button>
          <RunButton onClick={() => setShowRun(true)} label="Run Suite" />
        </div>
      </div>

      {suite.cases?.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg px-4 py-8 text-center font-mono text-xs text-text-muted">
          no test cases yet — add one to get started
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['name', 'scoring', 'expected', ''].map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left font-mono text-xs text-text-muted font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suite.cases?.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-border/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-text-primary">{c.name}</div>
                    <div className="font-mono text-xs text-text-muted mt-0.5 truncate max-w-xs">{c.user_prompt}</div>
                  </td>
                  <td className="px-4 py-3">
                    <ScoringBadge method={c.scoring_method} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted max-w-xs">
                    <span className="truncate block">{c.expected_output || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteCase.mutate(c.id)}
                      className="font-mono text-xs text-fail/60 hover:text-fail transition-colors"
                    >
                      remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddCase && <AddCaseModal suiteId={suiteId} onClose={() => setShowAddCase(false)} />}
      {showRun && <RunModal suiteId={suiteId} onClose={() => setShowRun(false)} />}
    </div>
  )
}

export default function TestSuites() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { suiteId } = useParams()
  const [showCreate, setShowCreate] = useState(false)

  const { data: suiteList = [], isLoading } = useQuery({
    queryKey: ['suites'],
    queryFn: suites.list,
  })

  const createSuite = useMutation({
    mutationFn: suites.create,
    onSuccess: suite => {
      qc.invalidateQueries(['suites'])
      setShowCreate(false)
      navigate(`/suites/${suite.id}`)
    },
  })

  const deleteSuite = useMutation({
    mutationFn: suites.delete,
    onSuccess: () => { qc.invalidateQueries(['suites']); navigate('/suites') },
  })

  const activeSuiteId = suiteId

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-lg text-text-primary">test suites</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="font-mono text-xs px-4 py-2 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
        >
          + new suite
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          {isLoading ? (
            <div className="font-mono text-xs text-text-muted py-2">loading…</div>
          ) : suiteList.length === 0 ? (
            <div className="font-mono text-xs text-text-muted py-2">no suites yet</div>
          ) : (
            suiteList.map(s => (
              <button
                key={s.id}
                onClick={() => navigate(`/suites/${s.id}`)}
                className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                  activeSuiteId === s.id
                    ? 'border-accent bg-accent/5 text-text-primary'
                    : 'border-transparent text-text-muted hover:bg-border/20 hover:text-text-primary'
                }`}
              >
                <div className="font-mono text-xs">{s.name}</div>
                <div className="font-mono text-xs text-text-muted/60 mt-0.5">
                  {s.case_count} case{s.case_count !== 1 ? 's' : ''}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="md:col-span-3">
          {activeSuiteId ? (
            <SuiteDetail suiteId={activeSuiteId} />
          ) : (
            <div className="bg-surface border border-border rounded-lg px-4 py-12 text-center">
              <div className="font-mono text-xs text-text-muted">select a suite or create one</div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateSuiteModal
          onClose={() => setShowCreate(false)}
          onCreate={data => createSuite.mutate(data)}
        />
      )}
    </div>
  )
}
