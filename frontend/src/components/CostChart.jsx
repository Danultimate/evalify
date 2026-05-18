import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const COLORS = {
  'claude-sonnet-4-20250514': '#cc785c',
  'gpt-4o': '#10a37f',
  'gemini-1.5-pro': '#4285f4',
  default: '#58a6ff',
}

function modelColor(model) {
  return COLORS[model] || COLORS.default
}

const tooltipStyle = {
  backgroundColor: '#161b22',
  border: '1px solid #30363d',
  borderRadius: '4px',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '11px',
  color: '#e6edf3',
}

export function CostLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(3)}`} width={56} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v.toFixed(6)}`, 'cost']} />
        <Line type="monotone" dataKey="cost" stroke="#00ff88" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PassRateBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis dataKey="model" tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}%`, 'pass rate']} />
        <Bar dataKey="passRate" radius={[2, 2, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={modelColor(entry.modelId)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
