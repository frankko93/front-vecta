"use client";

import { useMemo } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SummaryReport } from "@/lib/api/types";

// Format month string "2026-01" to short Spanish name
function fmtMonth(m: string): string {
  const [y, month] = m.split("-");
  return new Date(Number.parseInt(y, 10), Number.parseInt(month, 10) - 1).toLocaleDateString("es", { month: "short" });
}

// Format large numbers for chart axes
function fmtAxisValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}K`;
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const COLORS = {
  actual: "#3b82f6",
  budget: "#94a3b8",
};

// Custom tooltip matching the app's design
function ChartTooltip({
  active,
  payload,
  label,
  isCurrency,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  isCurrency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 text-sm shadow-lg">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {isCurrency ? "$" : ""}
            {(entry.value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            {!isCurrency ? " oz" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

interface DashboardChartsProps {
  report: SummaryReport;
}

export function DashboardCharts({ report }: DashboardChartsProps) {
  const { nsrData, productionData, hasNsrData, hasProductionData } = useMemo(() => {
    const nsr: Array<{ month: string; actual: number | null; budget: number | null }> = [];
    const prod: Array<{ month: string; actual: number | null; budget: number | null }> = [];

    for (const m of report.months) {
      const monthLabel = fmtMonth(m.month);

      nsr.push({
        month: monthLabel,
        actual: m.actual?.nsr.has_data ? m.actual.nsr.net_smelter_return : null,
        budget: m.budget?.nsr.has_data ? m.budget.nsr.net_smelter_return : null,
      });

      prod.push({
        month: monthLabel,
        actual: m.actual?.production.has_data ? m.actual.production.total_production_silver_oz : null,
        budget: m.budget?.production.has_data ? m.budget.production.total_production_silver_oz : null,
      });
    }

    return {
      nsrData: nsr,
      productionData: prod,
      hasNsrData: nsr.some((d) => d.actual !== null || d.budget !== null),
      hasProductionData: prod.some((d) => d.actual !== null || d.budget !== null),
    };
  }, [report]);

  if (!hasNsrData && !hasProductionData) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* NSR Trend - Area Chart */}
      {hasNsrData && (
        <div className="rounded-xl border border-border/40 bg-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm">NSR — Actual vs Budget</h3>
            <p className="mt-0.5 text-muted-foreground text-xs">Net Smelter Return mensual</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={nsrData}>
              <defs>
                <linearGradient id="nsrActualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.actual} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COLORS.actual} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${fmtAxisValue(v)}`}
                tickLine={false}
                axisLine={false}
                width={65}
              />
              <Tooltip content={<ChartTooltip isCurrency />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="budget"
                stroke={COLORS.budget}
                strokeDasharray="5 5"
                fill="none"
                name="Budget"
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke={COLORS.actual}
                strokeWidth={2}
                fill="url(#nsrActualGradient)"
                name="Actual"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Silver Production - Bar Chart */}
      {hasProductionData && (
        <div className="rounded-xl border border-border/40 bg-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm">Producción Ag — Actual vs Budget</h3>
            <p className="mt-0.5 text-muted-foreground text-xs">Producción mensual de plata (oz)</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={productionData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={fmtAxisValue}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="budget" fill={COLORS.budget} name="Budget" radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Bar dataKey="actual" fill={COLORS.actual} name="Actual" radius={[3, 3, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
