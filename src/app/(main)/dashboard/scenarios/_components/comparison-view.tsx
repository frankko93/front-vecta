"use client";

import { Fragment, useCallback, useMemo, useState } from "react";

import {
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  LayoutGrid,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CompareScenarioResponse, SavedReport, SummaryReport } from "@/lib/api/types";

interface ComparisonViewProps {
  comparison: CompareScenarioResponse;
}

// Chart colors for scenarios
const SCENARIO_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// Format helpers
const fmt = (value: number | null | undefined) => {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
};

const fmtCurrency = (value: number | null | undefined) => {
  if (value === undefined || value === null) return "-";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

const fmtPct = (value: number | null | undefined) => {
  if (value === undefined || value === null) return "-";
  return `${value.toFixed(1)}%`;
};

const fmtDecimal = (value: number | null | undefined) => {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

// Metric category configuration
interface MetricConfig {
  key: string;
  label: string;
  format: (v: number | null | undefined) => string;
  lowerIsBetter?: boolean;
  section: string;
  field: string;
  aggregate: "sum" | "avg";
}

interface CategoryConfig {
  key: string;
  title: string;
  metrics: MetricConfig[];
}

const COMPARISON_CATEGORIES: CategoryConfig[] = [
  {
    key: "mining",
    title: "Mining",
    metrics: [
      {
        key: "ore_mined_t",
        label: "Ore Mined (t)",
        format: fmt,
        section: "mining",
        field: "ore_mined_t",
        aggregate: "sum",
      },
      {
        key: "waste_mined_t",
        label: "Waste Mined (t)",
        format: fmt,
        section: "mining",
        field: "waste_mined_t",
        aggregate: "sum",
      },
      {
        key: "developments_m",
        label: "Developments (m)",
        format: fmt,
        section: "mining",
        field: "developments_m",
        aggregate: "sum",
      },
    ],
  },
  {
    key: "processing",
    title: "Processing",
    metrics: [
      {
        key: "total_tonnes_processed",
        label: "Tonnes Processed",
        format: fmt,
        section: "pbr",
        field: "total_tonnes_processed",
        aggregate: "sum",
      },
      {
        key: "feed_grade_silver_gpt",
        label: "Feed Grade Silver (g/t)",
        format: fmtDecimal,
        section: "pbr",
        field: "feed_grade_silver_gpt",
        aggregate: "avg",
      },
      {
        key: "feed_grade_gold_gpt",
        label: "Feed Grade Gold (g/t)",
        format: fmtDecimal,
        section: "pbr",
        field: "feed_grade_gold_gpt",
        aggregate: "avg",
      },
      {
        key: "recovery_rate_silver_pct",
        label: "Recovery Rate Silver (%)",
        format: fmtPct,
        section: "pbr",
        field: "recovery_rate_silver_pct",
        aggregate: "avg",
      },
      {
        key: "recovery_rate_gold_pct",
        label: "Recovery Rate Gold (%)",
        format: fmtPct,
        section: "pbr",
        field: "recovery_rate_gold_pct",
        aggregate: "avg",
      },
    ],
  },
  {
    key: "production",
    title: "Production",
    metrics: [
      {
        key: "total_production_silver_oz",
        label: "Total Production Silver (oz)",
        format: fmt,
        section: "production",
        field: "total_production_silver_oz",
        aggregate: "sum",
      },
      {
        key: "total_production_gold_oz",
        label: "Total Production Gold (oz)",
        format: fmt,
        section: "production",
        field: "total_production_gold_oz",
        aggregate: "sum",
      },
      {
        key: "payable_silver_oz",
        label: "Payable Silver (oz)",
        format: fmt,
        section: "production",
        field: "payable_silver_oz",
        aggregate: "sum",
      },
      {
        key: "payable_gold_oz",
        label: "Payable Gold (oz)",
        format: fmt,
        section: "production",
        field: "payable_gold_oz",
        aggregate: "sum",
      },
      {
        key: "dore_production_oz",
        label: "Dore Production (oz)",
        format: fmt,
        section: "production",
        field: "dore_production_oz",
        aggregate: "sum",
      },
    ],
  },
  {
    key: "nsr",
    title: "Revenue & NSR",
    metrics: [
      {
        key: "nsr_dore",
        label: "NSR Dore (Gross Revenue)",
        format: fmtCurrency,
        section: "nsr",
        field: "nsr_dore",
        aggregate: "sum",
      },
      {
        key: "streaming",
        label: "Streaming Agreement",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "nsr",
        field: "streaming",
        aggregate: "sum",
      },
      {
        key: "pbr_revenue",
        label: "PBR Revenue (Net of Streaming)",
        format: fmtCurrency,
        section: "nsr",
        field: "pbr_revenue",
        aggregate: "sum",
      },
      {
        key: "gold_credit",
        label: "Gold Credit (By-product)",
        format: fmtCurrency,
        section: "nsr",
        field: "gold_credit",
        aggregate: "sum",
      },
      {
        key: "net_smelter_return",
        label: "Net Smelter Return",
        format: fmtCurrency,
        section: "nsr",
        field: "net_smelter_return",
        aggregate: "sum",
      },
      {
        key: "nsr_per_tonne",
        label: "NSR per Tonne",
        format: fmtCurrency,
        section: "nsr",
        field: "nsr_per_tonne",
        aggregate: "avg",
      },
    ],
  },
  {
    key: "deductions",
    title: "Deductions & Charges",
    metrics: [
      {
        key: "shipping_selling",
        label: "Shipping & Selling",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "nsr",
        field: "shipping_selling",
        aggregate: "sum",
      },
      {
        key: "sales_taxes_royalties",
        label: "Sales Taxes & Royalties",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "nsr",
        field: "sales_taxes_royalties",
        aggregate: "sum",
      },
      {
        key: "smelting_refining_charges",
        label: "Smelting & Refining Charges",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "nsr",
        field: "smelting_refining_charges",
        aggregate: "sum",
      },
    ],
  },
  {
    key: "costs",
    title: "Operating Costs (OPEX)",
    metrics: [
      {
        key: "mine_opex",
        label: "Mine OPEX",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "costs",
        field: "mine",
        aggregate: "sum",
      },
      {
        key: "processing_opex",
        label: "Processing OPEX",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "costs",
        field: "processing",
        aggregate: "sum",
      },
      {
        key: "ga_opex",
        label: "G&A OPEX",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "costs",
        field: "ga",
        aggregate: "sum",
      },
      {
        key: "transport_shipping",
        label: "Transport & Shipping",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "costs",
        field: "transport_shipping",
        aggregate: "sum",
      },
      {
        key: "inventory_variations",
        label: "Inventory Variations",
        format: fmtCurrency,
        section: "costs",
        field: "inventory_variations",
        aggregate: "sum",
      },
      {
        key: "production_based_costs",
        label: "Total Production Costs",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "costs",
        field: "production_based_costs",
        aggregate: "sum",
      },
      {
        key: "total_cost_per_tonne",
        label: "Cost per Tonne",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "nsr",
        field: "total_cost_per_tonne",
        aggregate: "avg",
      },
    ],
  },
  {
    key: "capex",
    title: "Capital Expenditure (CAPEX)",
    metrics: [
      {
        key: "sustaining",
        label: "Sustaining CAPEX",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "capex",
        field: "sustaining",
        aggregate: "sum",
      },
      {
        key: "project",
        label: "Project CAPEX",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "capex",
        field: "project",
        aggregate: "sum",
      },
      {
        key: "leasing",
        label: "Leasing",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "capex",
        field: "leasing",
        aggregate: "sum",
      },
      {
        key: "accretion",
        label: "Accretion Mine Closure Liability",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "capex",
        field: "accretion_of_mine_closure_liability",
        aggregate: "sum",
      },
      {
        key: "capex_total",
        label: "Total CAPEX",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "capex",
        field: "total",
        aggregate: "sum",
      },
    ],
  },
  {
    key: "margins",
    title: "Margins & Profitability",
    metrics: [
      {
        key: "production_based_margin",
        label: "Production Margin (NSR - Costs)",
        format: fmtCurrency,
        section: "costs",
        field: "production_based_margin",
        aggregate: "sum",
      },
      {
        key: "margin_per_tonne",
        label: "Margin per Tonne",
        format: fmtCurrency,
        section: "nsr",
        field: "margin_per_tonne",
        aggregate: "avg",
      },
      {
        key: "pbr_net_cash_flow",
        label: "PBR Net Cash Flow",
        format: fmtCurrency,
        section: "capex",
        field: "pbr_net_cash_flow",
        aggregate: "sum",
      },
    ],
  },
  {
    key: "unit_costs",
    title: "Unit Costs (per oz)",
    metrics: [
      {
        key: "gold_credit_cashcost",
        label: "Gold Credit (for Cash Cost)",
        format: fmtCurrency,
        section: "cash_cost",
        field: "gold_credit",
        aggregate: "sum",
      },
      {
        key: "cash_cost_per_oz_silver",
        label: "Cash Cost per oz Silver",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "cash_cost",
        field: "cash_cost_per_oz_silver",
        aggregate: "avg",
      },
      {
        key: "aisc_per_oz_silver",
        label: "AISC per oz Silver",
        format: fmtCurrency,
        lowerIsBetter: true,
        section: "cash_cost",
        field: "aisc_per_oz_silver",
        aggregate: "avg",
      },
    ],
  },
];

// Calculated KPIs that derive from other metrics
interface CalculatedKPI {
  key: string;
  label: string;
  format: (v: number | null | undefined) => string;
  lowerIsBetter?: boolean;
  calculate: (metrics: Record<string, number | null>) => number | null;
  description: string;
}

const CALCULATED_KPIS: CalculatedKPI[] = [
  {
    key: "waste_ore_ratio",
    label: "Waste/Ore Ratio",
    format: fmtDecimal,
    lowerIsBetter: true,
    description: "Ratio de desperdicio por tonelada de mineral",
    calculate: (m) => {
      const ore = m.ore_mined_t;
      const waste = m.waste_mined_t;
      if (!ore || ore === 0 || !waste) return null;
      return waste / ore;
    },
  },
  {
    key: "silver_equivalent_oz",
    label: "Silver Equivalent (oz)",
    format: fmt,
    description: "Producción total en onzas equivalentes de plata (Au × 80)",
    calculate: (m) => {
      const silver = m.total_production_silver_oz || 0;
      const gold = m.total_production_gold_oz || 0;
      return silver + gold * 80; // Gold to silver ratio ~80:1
    },
  },
  {
    key: "payable_ratio_silver",
    label: "Payable Ratio Silver (%)",
    format: fmtPct,
    description: "% de plata producida que es pagable",
    calculate: (m) => {
      const total = m.total_production_silver_oz;
      const payable = m.payable_silver_oz;
      if (!total || total === 0 || !payable) return null;
      return (payable / total) * 100;
    },
  },
  {
    key: "operating_margin_pct",
    label: "Operating Margin (%)",
    format: fmtPct,
    description: "Margen operativo = (NSR - Costs) / NSR × 100",
    calculate: (m) => {
      const nsr = m.net_smelter_return;
      const margin = m.production_based_margin;
      if (!nsr || nsr === 0 || margin === null) return null;
      return (margin / nsr) * 100;
    },
  },
  {
    key: "cost_per_payable_oz",
    label: "Cost per Payable oz Silver",
    format: fmtCurrency,
    lowerIsBetter: true,
    description: "Costo total / onzas pagables",
    calculate: (m) => {
      const costs = m.production_based_costs;
      const payable = m.payable_silver_oz;
      if (!payable || payable === 0 || !costs) return null;
      return costs / payable;
    },
  },
  {
    key: "revenue_per_payable_oz",
    label: "Revenue per Payable oz Silver",
    format: fmtCurrency,
    description: "NSR / onzas pagables",
    calculate: (m) => {
      const nsr = m.net_smelter_return;
      const payable = m.payable_silver_oz;
      if (!payable || payable === 0 || !nsr) return null;
      return nsr / payable;
    },
  },
  {
    key: "capex_per_oz",
    label: "CAPEX per Payable oz Silver",
    format: fmtCurrency,
    lowerIsBetter: true,
    description: "Inversión de capital por onza pagable",
    calculate: (m) => {
      const capex = m.capex_total;
      const payable = m.payable_silver_oz;
      if (!payable || payable === 0 || !capex) return null;
      return capex / payable;
    },
  },
  {
    key: "free_cash_flow_margin",
    label: "Free Cash Flow Margin (%)",
    format: fmtPct,
    description: "Cash Flow Neto / NSR × 100",
    calculate: (m) => {
      const nsr = m.net_smelter_return;
      const cashFlow = m.pbr_net_cash_flow;
      if (!nsr || nsr === 0 || cashFlow === null) return null;
      return (cashFlow / nsr) * 100;
    },
  },
  {
    key: "gold_credit_impact",
    label: "Gold Credit Impact (%)",
    format: fmtPct,
    description: "Impacto del crédito de oro en costos",
    calculate: (m) => {
      const goldCredit = m.gold_credit;
      const costs = m.production_based_costs;
      if (!costs || costs === 0 || !goldCredit) return null;
      return (Math.abs(goldCredit) / costs) * 100;
    },
  },
  {
    key: "processing_efficiency",
    label: "Processing Efficiency (%)",
    format: fmtPct,
    description: "Toneladas procesadas / Toneladas minadas × 100",
    calculate: (m) => {
      const processed = m.total_tonnes_processed;
      const mined = m.ore_mined_t;
      if (!mined || mined === 0 || !processed) return null;
      return (processed / mined) * 100;
    },
  },
];

// Helper to aggregate metrics from report_data
function aggregateMetric(
  report: SummaryReport,
  section: string,
  field: string,
  aggregate: "sum" | "avg",
  dataType: "actual" | "budget" = "actual",
): number | null {
  const months = report.months.filter((m) => {
    const data = m[dataType];
    if (!data) return false;
    const sectionData = (data as unknown as Record<string, { has_data?: boolean }>)[section];
    return sectionData?.has_data === true;
  });
  if (months.length === 0) return null;

  let total = 0;
  let count = 0;

  for (const month of months) {
    const sectionData = month[dataType]?.[section as keyof typeof month.actual] as Record<string, unknown> | undefined;
    if (sectionData && field in sectionData) {
      const value = sectionData[field] as number;
      if (value !== null && value !== undefined && !Number.isNaN(value)) {
        total += value;
        count++;
      }
    }
  }

  if (count === 0) return null;
  return aggregate === "avg" ? total / count : total;
}

// Get monthly trend data for a specific metric
function getMonthlyTrend(
  reports: SavedReport[],
  section: string,
  field: string,
  dataType: "actual" | "budget" = "actual",
): { month: string; [key: string]: string | number }[] {
  const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const data: { month: string; [key: string]: string | number }[] = [];

  for (let i = 0; i < 12; i++) {
    const monthStr = `${reports[0]?.report_data?.year || 2025}-${String(i + 1).padStart(2, "0")}`;
    const entry: { month: string; [key: string]: string | number } = { month: monthLabels[i] };

    for (const report of reports) {
      const monthData = report.report_data?.months?.find((m) => m.month === monthStr);
      const sectionData = monthData?.[dataType]?.[section as keyof typeof monthData.actual] as
        | Record<string, unknown>
        | undefined;
      const value = sectionData?.[field] as number | undefined;
      entry[report.name] = value ?? 0;
    }

    data.push(entry);
  }

  return data;
}

export function ComparisonView({ comparison }: ComparisonViewProps) {
  const { reports, comparison: _comparisonData } = comparison;
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [_sortConfig, _setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Extract basic info
  const companyName = reports[0]?.report_data?.company_name || "N/A";
  const year = reports[0]?.report_data?.year || new Date().getFullYear();

  // Toggle category collapse
  const toggleCategory = (key: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Calculate all metrics for each report
  const reportMetrics = useMemo(() => {
    return reports.map((report, idx) => {
      const metrics: Record<string, number | null> = {
        report_id: report.id,
        report_name: report.name as unknown as number,
        color: idx,
      };

      // Aggregate all metrics from report_data
      for (const category of COMPARISON_CATEGORIES) {
        for (const metric of category.metrics) {
          metrics[metric.key] = aggregateMetric(report.report_data, metric.section, metric.field, metric.aggregate);
        }
      }

      // Calculate derived KPIs
      for (const kpi of CALCULATED_KPIS) {
        metrics[kpi.key] = kpi.calculate(metrics);
      }

      return metrics;
    });
  }, [reports]);

  // Find best value for a metric (stable ref for useMemo deps)
  const findBest = useCallback(
    (key: string, lowerIsBetter = false): number | null => {
      const values = reportMetrics.map((m) => m[key]).filter((v): v is number => v !== null);
      if (values.length === 0) return null;
      return lowerIsBetter ? Math.min(...values) : Math.max(...values);
    },
    [reportMetrics],
  );

  // Calculate wins per report (including KPIs)
  const wins = useMemo(() => {
    const winsMap: Record<number, number> = {};
    reports.forEach((r) => {
      winsMap[r.id] = 0;
    });

    // Count wins from regular metrics
    for (const category of COMPARISON_CATEGORIES) {
      for (const metric of category.metrics) {
        const bestValue = findBest(metric.key, metric.lowerIsBetter);
        if (bestValue !== null) {
          reportMetrics.forEach((m) => {
            if (m[metric.key] === bestValue) {
              winsMap[m.report_id as number]++;
            }
          });
        }
      }
    }

    // Count wins from calculated KPIs
    for (const kpi of CALCULATED_KPIS) {
      const bestValue = findBest(kpi.key, kpi.lowerIsBetter);
      if (bestValue !== null) {
        reportMetrics.forEach((m) => {
          if (m[kpi.key] === bestValue) {
            winsMap[m.report_id as number]++;
          }
        });
      }
    }

    return winsMap;
  }, [reportMetrics, reports, findBest]);

  // Find best scenario
  const bestScenarioId = Object.entries(wins).reduce((a, b) => (wins[Number(a[0])] > wins[Number(b[0])] ? a : b))[0];
  const bestScenario = reports.find((r) => r.id === Number(bestScenarioId));

  // Key metrics for highlight
  const keyHighlightMetrics = [
    {
      key: "pbr_net_cash_flow",
      label: "PBR Net Cash Flow",
      format: fmtCurrency,
      desc: "Flujo de caja neto de producción",
    },
    { key: "operating_margin_pct", label: "Margen Operativo", format: fmtPct, desc: "(NSR - Costos) / NSR" },
    {
      key: "aisc_per_oz_silver",
      label: "AISC por oz Plata",
      format: fmtCurrency,
      desc: "Costo total sostenible",
      lowerIsBetter: true,
    },
    { key: "silver_equivalent_oz", label: "Producción Eq. Plata", format: fmt, desc: "Ag + (Au × 80)" },
  ];

  // Prepare chart data
  const productionChartData = reportMetrics.map((m, idx) => ({
    name: reports[idx].name,
    silver: m.total_production_silver_oz || 0,
    gold: (m.total_production_gold_oz || 0) * 80, // Scale gold for visibility
    color: SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
  }));

  const financialChartData = reportMetrics.map((m, idx) => ({
    name: reports[idx].name,
    nsr: m.net_smelter_return || 0,
    margin: m.production_based_margin || 0,
    cashFlow: m.pbr_net_cash_flow || 0,
  }));

  const costsChartData = reportMetrics.map((m, idx) => ({
    name: reports[idx].name,
    mine: m.mine_opex || 0,
    processing: m.processing_opex || 0,
    ga: m.ga_opex || 0,
  }));

  // Monthly trend data for key metrics
  const nsrTrendData = getMonthlyTrend(reports, "nsr", "net_smelter_return");
  const productionTrendData = getMonthlyTrend(reports, "production", "total_production_silver_oz");

  // Count total metrics (including KPIs)
  const totalMetrics = COMPARISON_CATEGORIES.reduce((sum, cat) => sum + cat.metrics.length, 0) + CALCULATED_KPIS.length;

  return (
    <div className="space-y-4">
      {/* Header with company info */}
      <div className="flex items-center justify-between rounded-lg border bg-gradient-to-r from-primary/5 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <span className="font-bold text-lg text-primary">{companyName.charAt(0)}</span>
          </div>
          <div>
            <h2 className="font-semibold text-lg">{companyName}</h2>
            <p className="text-muted-foreground text-sm">
              {year} • {reports.length} escenarios • {totalMetrics} métricas
            </p>
          </div>
        </div>

        {bestScenario && (
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
            <Award className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary text-sm">Recomendado: {bestScenario.name}</span>
          </div>
        )}
      </div>

      {/* Best Scenario Highlight - More compact */}
      {bestScenario && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {keyHighlightMetrics.map((metric, _idx) => {
            const scenarioMetric = reportMetrics.find((m) => m.report_id === bestScenario.id);
            const value = scenarioMetric?.[metric.key] as number | null;
            const bestValue = findBest(metric.key, metric.lowerIsBetter);
            const isBest = bestValue !== null && value === bestValue;

            return (
              <Card key={metric.key} className="shadow-sm">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">{metric.label}</p>
                      <p className={`font-bold text-xl ${isBest ? "text-primary" : ""}`}>{metric.format(value)}</p>
                      <p className="text-[10px] text-muted-foreground/70">{metric.desc}</p>
                    </div>
                    {isBest && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start border bg-muted/70 p-1 shadow-sm">
          <TabsTrigger
            value="overview"
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Resumen
          </TabsTrigger>
          <TabsTrigger
            value="production"
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Producción
          </TabsTrigger>
          <TabsTrigger
            value="financial"
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Financiero
          </TabsTrigger>
          <TabsTrigger
            value="trends"
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Tendencias
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards per Scenario - More compact */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {reports.map((report, idx) => {
              const metrics = reportMetrics[idx];
              const scenarioWins = wins[report.id];
              const isBest = report.id === Number(bestScenarioId);
              const winPct = Math.round((scenarioWins / totalMetrics) * 100);

              return (
                <Card
                  key={report.id}
                  className={`shadow-sm transition-all ${isBest ? "bg-primary/5 ring-2 ring-primary" : "hover:shadow-md"}`}
                >
                  <CardContent className="space-y-3 pt-4 pb-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }}
                        />
                        <span className="truncate font-medium text-sm">{report.name}</span>
                      </div>
                      {isBest && <Award className="h-4 w-4 shrink-0 text-primary" />}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Score</span>
                        <span className="font-semibold">{winPct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${winPct}%`,
                            backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
                          }}
                        />
                      </div>
                    </div>

                    {/* Key metrics - 2x2 grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-1">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Cash Flow</span>
                        <p className="truncate font-medium">{fmtCurrency(metrics.pbr_net_cash_flow)}</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">NSR</span>
                        <p className="truncate font-medium">{fmtCurrency(metrics.net_smelter_return)}</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">AISC/oz</span>
                        <p className="truncate font-medium">{fmtCurrency(metrics.aisc_per_oz_silver)}</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Margen</span>
                        <p className="truncate font-medium">{fmtCurrency(metrics.production_based_margin)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detailed Comparison Table */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Comparación Detallada</CardTitle>
                  <CardDescription className="text-xs">Click en las categorías para expandir/contraer</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {COMPARISON_CATEGORIES.reduce((sum, cat) => sum + cat.metrics.length, 0) + CALCULATED_KPIS.length}{" "}
                  métricas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[260px] text-xs">Métrica</TableHead>
                    {reports.map((report, idx) => (
                      <TableHead key={report.id} className="min-w-[100px] text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }}
                          />
                          <span className="max-w-[80px] truncate text-xs">{report.name}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-[60px] text-center text-xs">Mejor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPARISON_CATEGORIES.map((category) => {
                    const isCollapsed = collapsedCategories.has(category.key);
                    return (
                      <Fragment key={category.key}>
                        {/* Category Header */}
                        <TableRow
                          className="cursor-pointer bg-muted/50 hover:bg-muted"
                          onClick={() => toggleCategory(category.key)}
                        >
                          <TableCell colSpan={reports.length + 2} className="font-semibold">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {category.title}
                              <Badge variant="outline" className="ml-2">
                                {category.metrics.length} métricas
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Category Metrics */}
                        {!isCollapsed &&
                          category.metrics.map((metric) => {
                            const bestValue = findBest(metric.key, metric.lowerIsBetter);

                            return (
                              <TableRow key={metric.key}>
                                <TableCell className="pl-8">
                                  <div className="flex items-center gap-2">
                                    {metric.lowerIsBetter ? (
                                      <TrendingDown className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    {metric.label}
                                  </div>
                                </TableCell>
                                {reportMetrics.map((m) => {
                                  const value = m[metric.key] as number | null;
                                  const isBest = bestValue !== null && value === bestValue;

                                  return (
                                    <TableCell key={m.report_id} className="text-right">
                                      <div
                                        className={`flex items-center justify-end gap-1 ${isBest ? "font-semibold text-primary" : ""}`}
                                      >
                                        {metric.format(value)}
                                        {isBest && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                                      </div>
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center text-muted-foreground text-xs">
                                  {reports.find((_r, idx) => reportMetrics[idx][metric.key] === bestValue)?.name || "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </Fragment>
                    );
                  })}

                  {/* Calculated KPIs Section */}
                  <TableRow
                    className="cursor-pointer bg-primary/10 hover:bg-primary/15"
                    onClick={() => toggleCategory("kpis")}
                  >
                    <TableCell colSpan={reports.length + 2} className="font-semibold">
                      <div className="flex items-center gap-2">
                        {collapsedCategories.has("kpis") ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        KPIs Calculados (Indicadores Clave)
                        <Badge variant="default" className="ml-2">
                          {CALCULATED_KPIS.length} KPIs
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>

                  {!collapsedCategories.has("kpis") &&
                    CALCULATED_KPIS.map((kpi) => {
                      const bestValue = findBest(kpi.key, kpi.lowerIsBetter);

                      return (
                        <TableRow key={kpi.key} className="bg-primary/5">
                          <TableCell className="pl-8">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                {kpi.lowerIsBetter ? (
                                  <TrendingDown className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                )}
                                {kpi.label}
                              </div>
                              <span className="text-muted-foreground text-xs">{kpi.description}</span>
                            </div>
                          </TableCell>
                          {reportMetrics.map((m) => {
                            const value = m[kpi.key] as number | null;
                            const isBest = bestValue !== null && value === bestValue;

                            return (
                              <TableCell key={m.report_id} className="text-right">
                                <div
                                  className={`flex items-center justify-end gap-1 ${isBest ? "font-semibold text-primary" : ""}`}
                                >
                                  {kpi.format(value)}
                                  {isBest && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center text-muted-foreground text-xs">
                            {reports.find((_r, idx) => reportMetrics[idx][kpi.key] === bestValue)?.name || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Production Tab */}
        <TabsContent value="production" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Production Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Producción Total</CardTitle>
                <CardDescription>Plata y Oro por escenario</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productionChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="silver" fill="#94a3b8" name="Silver (oz)" />
                    <Bar dataKey="gold" fill="#f59e0b" name="Gold (oz × 80)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Mining & Processing */}
            <Card>
              <CardHeader>
                <CardTitle>Mining & Processing</CardTitle>
                <CardDescription>Toneladas procesadas vs minadas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={reportMetrics.map((m, idx) => ({
                      name: reports[idx].name,
                      ore: m.ore_mined_t || 0,
                      processed: m.total_tonnes_processed || 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="ore" fill="#3b82f6" name="Ore Mined (t)" />
                    <Bar dataKey="processed" fill="#10b981" name="Processed (t)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Production Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Producción</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Métrica</TableHead>
                    {reports.map((r, _idx) => (
                      <TableHead key={r.id} className="text-right">
                        {r.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ...(COMPARISON_CATEGORIES.find((c) => c.key === "mining")?.metrics ?? []),
                    ...(COMPARISON_CATEGORIES.find((c) => c.key === "processing")?.metrics ?? []),
                    ...(COMPARISON_CATEGORIES.find((c) => c.key === "production")?.metrics ?? []),
                  ].map((metric) => {
                    const bestValue = findBest(metric.key, metric.lowerIsBetter);
                    return (
                      <TableRow key={metric.key}>
                        <TableCell className="font-medium">{metric.label}</TableCell>
                        {reportMetrics.map((m) => {
                          const value = m[metric.key] as number | null;
                          const isBest = bestValue !== null && value === bestValue;
                          return (
                            <TableCell
                              key={m.report_id}
                              className={`text-right ${isBest ? "font-semibold text-primary" : ""}`}
                            >
                              {metric.format(value)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* NSR & Margins */}
            <Card>
              <CardHeader>
                <CardTitle>NSR & Márgenes</CardTitle>
                <CardDescription>Ingresos y márgenes por escenario</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={financialChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                    <Legend />
                    <Bar dataKey="nsr" fill="#10b981" name="NSR" />
                    <Bar dataKey="margin" fill="#3b82f6" name="Margin" />
                    <Bar dataKey="cashFlow" fill="#8b5cf6" name="Cash Flow" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Costs Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Desglose de Costos</CardTitle>
                <CardDescription>OPEX por área</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costsChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                    <Legend />
                    <Bar dataKey="mine" stackId="a" fill="#ef4444" name="Mine" />
                    <Bar dataKey="processing" stackId="a" fill="#f59e0b" name="Processing" />
                    <Bar dataKey="ga" stackId="a" fill="#3b82f6" name="G&A" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Unit Costs Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Costos Unitarios</CardTitle>
              <CardDescription>Cash Cost y AISC por onza de plata</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={reportMetrics.map((m, idx) => ({
                    name: reports[idx].name,
                    cashCost: m.cash_cost_per_oz_silver || 0,
                    aisc: m.aisc_per_oz_silver || 0,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                  <Legend />
                  <Bar dataKey="cashCost" fill="#f59e0b" name="Cash Cost/oz" />
                  <Bar dataKey="aisc" fill="#ef4444" name="AISC/oz" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* NSR Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencia NSR Mensual</CardTitle>
                <CardDescription>Net Smelter Return por mes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={nsrTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                    <Legend />
                    {reports.map((report, idx) => (
                      <Line
                        key={report.id}
                        type="monotone"
                        dataKey={report.name}
                        stroke={SCENARIO_COLORS[idx % SCENARIO_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Production Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencia Producción Plata</CardTitle>
                <CardDescription>Producción mensual de plata (oz)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={productionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    {reports.map((report, idx) => (
                      <Area
                        key={report.id}
                        type="monotone"
                        dataKey={report.name}
                        stroke={SCENARIO_COLORS[idx % SCENARIO_COLORS.length]}
                        fill={SCENARIO_COLORS[idx % SCENARIO_COLORS.length]}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cumulative Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Comparación Acumulada YTD</CardTitle>
              <CardDescription>Progreso acumulado de métricas clave por escenario</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {keyHighlightMetrics.map((metric) => {
                  const bestValue = findBest(metric.key, metric.lowerIsBetter);
                  return (
                    <div key={metric.key} className="space-y-2">
                      <div className="font-medium text-sm">{metric.label}</div>
                      {reports.map((report, idx) => {
                        const value = reportMetrics[idx][metric.key] as number | null;
                        const maxValue = Math.max(
                          ...reportMetrics.map((m) => Math.abs((m[metric.key] as number) || 0)),
                        );
                        const pct = maxValue > 0 ? (Math.abs(value || 0) / maxValue) * 100 : 0;
                        const isBest = bestValue !== null && value === bestValue;

                        return (
                          <div key={report.id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className={isBest ? "font-semibold text-primary" : "text-muted-foreground"}>
                                {report.name}
                              </span>
                              <span className={isBest ? "font-semibold text-primary" : ""}>{metric.format(value)}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
