'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, ShoppingBag, BarChart2, Star,
  Loader2, AlertCircle, Printer, Calendar
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { useBoutiqueId } from '@/hooks/useBoutiqueId'

// ── Types ────────────────────────────────────────────────────────────────────

interface RevenuePoint {
  date: string
  revenue: number
  orders: number
}

interface StatsData {
  totalRevenue: number
  totalOrders: number
  averageBasket: number
  bestDay?: { date: string; revenue: number }
  topProducts?: { name: string; quantity: number; revenue: number }[]
  revenueByDay?: RevenuePoint[]
}

type Period = '7d' | '30d' | '90d'

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d',  label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '90 jours' },
]

// ── Main Component ───────────────────────────────────────────────────────────

export default function StatistiquesPage() {
  const { boutiqueId, isLoading: loadingBoutique } = useBoutiqueId()
  const [period, setPeriod] = useState<Period>('7d')

  const { data: stats, isLoading, error } = useQuery<StatsData>({
    queryKey: ['stats', 'revenue', boutiqueId, period],
    queryFn: () =>
      api.get(`/stats/revenue?boutiqueId=${boutiqueId}&period=${period}`).then(r => r.data),
    enabled: !!boutiqueId,
  })

  if (loadingBoutique) return <LoadingScreen />

  return (
    <div className="p-4 max-w-4xl mx-auto print:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <Printer size={16} />
          Exporter
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6 print:hidden">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <ErrorState message="Impossible de charger les statistiques" />
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <KPICard
              label="CA total"
              value={formatCurrency(stats.totalRevenue)}
              icon={<TrendingUp size={20} className="text-green-600" />}
              bg="bg-green-50"
            />
            <KPICard
              label="Commandes"
              value={stats.totalOrders}
              icon={<ShoppingBag size={20} className="text-indigo-600" />}
              bg="bg-indigo-50"
            />
            <KPICard
              label="Panier moyen"
              value={formatCurrency(stats.averageBasket)}
              icon={<BarChart2 size={20} className="text-purple-600" />}
              bg="bg-purple-50"
            />
            <KPICard
              label="Meilleur jour"
              value={stats.bestDay ? formatCurrency(stats.bestDay.revenue) : '—'}
              sublabel={stats.bestDay ? formatDate(stats.bestDay.date) : undefined}
              icon={<Star size={20} className="text-yellow-500" />}
              bg="bg-yellow-50"
            />
          </div>

          {/* Revenue Chart */}
          {stats.revenueByDay && stats.revenueByDay.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Revenus par jour</h2>
              <RevenueBarChart data={stats.revenueByDay} />
            </div>
          )}

          {/* Top products */}
          {stats.topProducts && stats.topProducts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Top 5 produits</h2>
              <div className="space-y-3">
                {stats.topProducts.slice(0, 5).map((product, idx) => {
                  const maxRevenue = stats.topProducts![0].revenue
                  const pct = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}</span>
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(product.revenue)}</p>
                          <p className="text-xs text-gray-400">{product.quantity} ventes</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

// ── RevenueBarChart ───────────────────────────────────────────────────────────

function RevenueBarChart({ data }: { data: RevenuePoint[] }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  const chartHeight = 160
  const barWidth = Math.max(8, Math.floor((100 / data.length) - 2))

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(300, data.length * 36) }}>
        {/* SVG Chart */}
        <svg
          width="100%"
          height={chartHeight + 40}
          viewBox={`0 0 ${data.length * 36} ${chartHeight + 40}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = chartHeight - pct * chartHeight
            return (
              <g key={pct}>
                <line
                  x1={0}
                  y1={y}
                  x2={data.length * 36}
                  y2={y}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
                <text
                  x={-4}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={9}
                  fill="#9ca3af"
                >
                  {formatShort(maxRevenue * pct)}
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {data.map((d, idx) => {
            const barH = Math.max(2, (d.revenue / maxRevenue) * chartHeight)
            const x = idx * 36 + 36 / 2 - barWidth / 2
            const y = chartHeight - barH
            const isMax = d.revenue === maxRevenue

            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={3}
                  fill={isMax ? '#4f46e5' : '#a5b4fc'}
                />
                {/* X-axis label */}
                <text
                  x={idx * 36 + 18}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#6b7280"
                >
                  {formatShortDate(d.date)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, sublabel, icon, bg }: {
  label: string
  value: string | number
  sublabel?: string
  icon: React.ReactNode
  bg: string
}) {
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return String(Math.round(value))
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return `${d.getDate()}/${d.getMonth() + 1}`
  } catch {
    return dateStr
  }
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-indigo-600" />
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-red-500">
      <AlertCircle size={20} />
      <p className="text-sm">{message}</p>
    </div>
  )
}
