"use client";

import { useMemo } from "react";

import {
  ArrowDown,
  ArrowUp,
  Banknote,
  CircleDollarSign,
  Coins,
  DollarSign,
  Gem,
  Minus,
  TrendingUp,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { SummaryReport } from "@/lib/api/types";

interface KPI {
  label: string;
  value: string;
  unit: string;
  variancePct: number | null;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  invertVariance?: boolean;
}

// Format large numbers compactly
function fmtNum(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000).toLocaleString("en-US")}K`;
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// Format currency values compactly
function fmtCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000).toLocaleString("en-US")}K`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// Compute percentage change between actual and budget
function pctChange(actual: number, budget: number): number | null {
  if (budget === 0) return null;
  return ((actual - budget) / Math.abs(budget)) * 100;
}

/**
 * Extract KPI data from SummaryReport.
 * Only uses months where both actual AND budget exist for fair comparison.
 */
function computeKPIs(report: SummaryReport): KPI[] {
  let aAg = 0;
  let bAg = 0;
  let aAu = 0;
  let bAu = 0;
  let aNsr = 0;
  let bNsr = 0;
  let aCashTotal = 0;
  let bCashTotal = 0;
  let aAiscTotal = 0;
  let bAiscTotal = 0;
  let aPayAg = 0;
  let bPayAg = 0;
  let aCashFlow = 0;
  let bCashFlow = 0;
  let hasProductionData = false;
  let hasNsrData = false;
  let hasCashCostData = false;
  let hasCapexData = false;

  for (const m of report.months) {
    const a = m.actual;
    const b = m.budget;
    if (!a || !b) continue;

    if (a.production.has_data && b.production.has_data) {
      hasProductionData = true;
      aAg += a.production.total_production_silver_oz || 0;
      bAg += b.production.total_production_silver_oz || 0;
      aAu += a.production.total_production_gold_oz || 0;
      bAu += b.production.total_production_gold_oz || 0;
      aPayAg += a.production.payable_silver_oz || 0;
      bPayAg += b.production.payable_silver_oz || 0;
    }

    if (a.nsr.has_data && b.nsr.has_data) {
      hasNsrData = true;
      aNsr += a.nsr.net_smelter_return || 0;
      bNsr += b.nsr.net_smelter_return || 0;
    }

    if (a.cash_cost.has_data && b.cash_cost.has_data) {
      hasCashCostData = true;
      aCashTotal += a.cash_cost.cash_cost_silver_total || 0;
      bCashTotal += b.cash_cost.cash_cost_silver_total || 0;
      aAiscTotal += a.cash_cost.aisc_silver_total || 0;
      bAiscTotal += b.cash_cost.aisc_silver_total || 0;
    }

    if (a.capex.has_data && b.capex.has_data) {
      hasCapexData = true;
      aCashFlow += a.capex.pbr_net_cash_flow || 0;
      bCashFlow += b.capex.pbr_net_cash_flow || 0;
    }
  }

  // Weighted average for per-unit metrics
  const aCostOz = aPayAg > 0 ? aCashTotal / aPayAg : 0;
  const bCostOz = bPayAg > 0 ? bCashTotal / bPayAg : 0;
  const aAiscOz = aPayAg > 0 ? aAiscTotal / aPayAg : 0;
  const bAiscOz = bPayAg > 0 ? bAiscTotal / bPayAg : 0;

  return [
    {
      label: "Producción Ag",
      value: hasProductionData ? fmtNum(aAg) : "-",
      unit: "oz",
      variancePct: hasProductionData ? pctChange(aAg, bAg) : null,
      description: "Producción total de plata",
      icon: Gem,
      color: "text-slate-600 dark:text-slate-300",
      bgColor: "bg-slate-100 dark:bg-slate-800/50",
    },
    {
      label: "Producción Au",
      value: hasProductionData ? fmtNum(aAu) : "-",
      unit: "oz",
      variancePct: hasProductionData ? pctChange(aAu, bAu) : null,
      description: "Producción total de oro",
      icon: Coins,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "NSR",
      value: hasNsrData ? fmtCurrency(aNsr) : "-",
      unit: "",
      variancePct: hasNsrData ? pctChange(aNsr, bNsr) : null,
      description: "Net Smelter Return",
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Cash Cost",
      value: hasCashCostData && aPayAg > 0 ? `$${aCostOz.toFixed(2)}` : "-",
      unit: "/oz",
      variancePct: hasCashCostData && aPayAg > 0 && bPayAg > 0 ? pctChange(aCostOz, bCostOz) : null,
      description: "Costo efectivo por onza Ag",
      icon: CircleDollarSign,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      invertVariance: true,
    },
    {
      label: "AISC",
      value: hasCashCostData && aPayAg > 0 ? `$${aAiscOz.toFixed(2)}` : "-",
      unit: "/oz",
      variancePct: hasCashCostData && aPayAg > 0 && bPayAg > 0 ? pctChange(aAiscOz, bAiscOz) : null,
      description: "All-In Sustaining Cost",
      icon: DollarSign,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      invertVariance: true,
    },
    {
      label: "Cash Flow Neto",
      value: hasCapexData ? fmtCurrency(aCashFlow) : "-",
      unit: "",
      variancePct: hasCapexData ? pctChange(aCashFlow, bCashFlow) : null,
      description: "Flujo de caja neto",
      icon: Banknote,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-50 dark:bg-teal-950/30",
    },
  ];
}

// Colored badge showing variance against budget
function VarianceBadge({ pct, invert }: { pct: number | null; invert?: boolean }) {
  if (pct === null) {
    return <span className="text-muted-foreground text-xs">Sin comparación</span>;
  }

  const isPositive = pct > 0;
  // For costs, positive variance (higher actual) = unfavorable
  const isFavorable = invert ? !isPositive : isPositive;

  const Icon = pct > 0 ? ArrowUp : pct < 0 ? ArrowDown : Minus;
  const colorClass = isFavorable ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

  return (
    <div className={`flex items-center gap-1 font-medium text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{Math.abs(pct).toFixed(1)}%</span>
      <span className="font-normal text-muted-foreground">vs Budget</span>
    </div>
  );
}

interface DashboardKPIsProps {
  report: SummaryReport | undefined;
  isLoading: boolean;
}

export function DashboardKPIs({ report, isLoading }: DashboardKPIsProps) {
  const kpis = useMemo(() => (report ? computeKPIs(report) : []), [report]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {["ag", "au", "nsr", "cashcost", "aisc", "cashflow"].map((id) => (
          <div key={id} className="rounded-xl border border-border/40 bg-card p-5">
            <Skeleton className="mb-3 h-4 w-16" />
            <Skeleton className="mb-2 h-8 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">{kpi.label}</span>
              <div className={`rounded-lg p-1.5 ${kpi.bgColor}`}>
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
              </div>
            </div>
            <div className="mb-1 flex items-baseline gap-1">
              <span className="font-bold text-2xl tracking-tight">{kpi.value}</span>
              {kpi.unit && <span className="text-muted-foreground text-sm">{kpi.unit}</span>}
            </div>
            <VarianceBadge pct={kpi.variancePct} invert={kpi.invertVariance} />
          </div>
        </div>
      ))}
    </div>
  );
}
