"use client";

import { useMemo } from "react";

import { CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MonthlyVariance, SummaryReport } from "@/lib/api/types";

interface DeviationAlert {
  metric: string;
  label: string;
  variancePct: number;
  severity: "critical" | "warning" | "info";
  favorable: boolean;
}

// Key metrics to monitor for significant deviations
const MONITORED_METRICS: Array<{
  section: keyof MonthlyVariance;
  key: string;
  label: string;
  invertVariance?: boolean;
}> = [
  { section: "production", key: "total_production_silver_oz", label: "Producción Ag" },
  { section: "production", key: "total_production_gold_oz", label: "Producción Au" },
  { section: "nsr", key: "net_smelter_return", label: "NSR" },
  { section: "costs", key: "production_based_costs", label: "Costos Producción", invertVariance: true },
  { section: "capex", key: "total", label: "CAPEX Total", invertVariance: true },
  { section: "mining", key: "ore_mined_t", label: "Mineral Extraído" },
  { section: "processing", key: "total_tonnes_processed", label: "Tonnes Procesadas" },
  { section: "capex", key: "pbr_net_cash_flow", label: "Cash Flow Neto" },
  { section: "cash_cost", key: "cash_cost_per_oz_silver", label: "Cash Cost /oz", invertVariance: true },
  { section: "cash_cost", key: "aisc_per_oz_silver", label: "AISC /oz", invertVariance: true },
];

/**
 * Scan the latest comparable month for metrics with significant variance.
 * Returns top 6 alerts sorted by absolute deviation.
 */
function computeAlerts(report: SummaryReport): DeviationAlert[] {
  const alerts: DeviationAlert[] = [];

  // Find months with both actual and budget data
  const comparableMonths = report.months.filter((m) => m.actual && m.budget && m.variance);
  if (comparableMonths.length === 0) return [];

  // Use the latest month with comparison data
  const latestMonth = comparableMonths[comparableMonths.length - 1];
  const variance = latestMonth.variance;
  if (!variance) return [];

  for (const metric of MONITORED_METRICS) {
    const sectionVariance = variance[metric.section];
    if (!sectionVariance) continue;

    const metricData = sectionVariance[metric.key];
    if (!metricData || metricData.variance_pct === undefined) continue;

    const absPct = Math.abs(metricData.variance_pct);
    if (absPct < 5) continue;

    const isPositive = metricData.variance_pct > 0;
    const isFavorable = metric.invertVariance ? !isPositive : isPositive;

    let severity: "critical" | "warning" | "info" = "info";
    if (absPct >= 20) severity = "critical";
    else if (absPct >= 10) severity = "warning";

    alerts.push({
      metric: metric.key,
      label: metric.label,
      variancePct: metricData.variance_pct,
      severity,
      favorable: isFavorable,
    });
  }

  alerts.sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));
  return alerts.slice(0, 6);
}

interface DashboardAlertsProps {
  report: SummaryReport;
}

export function DashboardAlerts({ report }: DashboardAlertsProps) {
  const alerts = useMemo(() => computeAlerts(report), [report]);

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <h3 className="mb-3 font-semibold text-sm">Desviaciones</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground text-sm">Sin desviaciones significativas</p>
          <p className="text-muted-foreground/70 text-xs">Todas las métricas dentro del rango esperado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Desviaciones vs Budget</h3>
        <Badge variant="outline" className="text-xs">
          Último mes con datos
        </Badge>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const Icon = alert.favorable ? TrendingUp : TrendingDown;

          const severityColor = {
            critical: alert.favorable
              ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
              : "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/30",
            warning: alert.favorable
              ? "border-emerald-200/60 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/20"
              : "border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/30",
            info: "border-border/40 bg-muted/20",
          }[alert.severity];

          const textColor = alert.favorable
            ? "text-emerald-700 dark:text-emerald-400"
            : alert.severity === "critical"
              ? "text-red-700 dark:text-red-400"
              : "text-orange-700 dark:text-orange-400";

          return (
            <div
              key={alert.metric}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${severityColor}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${textColor}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{alert.label}</p>
              </div>
              <span className={`font-semibold text-sm tabular-nums ${textColor}`}>
                {alert.variancePct > 0 ? "+" : ""}
                {alert.variancePct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
