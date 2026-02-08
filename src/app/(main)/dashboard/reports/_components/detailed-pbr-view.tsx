"use client";

import { useCallback, useMemo, useState } from "react";

import { ArrowUpDown, ChevronDown, ChevronRight, Search } from "lucide-react";
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

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CompanyConfig, MonthlyReport, PBRMonthlyData, PBRReport, SummaryReport } from "@/lib/api/types";
import { filterCategoriesByConfig } from "@/lib/company-config";

interface DetailedPBRViewProps {
  report: PBRReport;
  summaryReport?: SummaryReport;
}

// Format month short
function fmtMonth(m: string): string {
  const [y, month] = m.split("-");
  return new Date(parseInt(y, 10), parseInt(month, 10) - 1).toLocaleDateString("es", { month: "short" });
}

// Format month long
function fmtMonthLong(m: string): string {
  const [y, month] = m.split("-");
  return new Date(parseInt(y, 10), parseInt(month, 10) - 1).toLocaleDateString("es", {
    month: "long",
    year: "numeric",
  });
}

// Format number
function fmt(v: number | undefined | null): string {
  if (v === undefined || v === null) return "-";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// Format currency
function fmtCurr(v: number | undefined | null): string {
  if (v === undefined || v === null) return "-";
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ==================== Table Types ====================

interface TableRow {
  id: string;
  category: string;
  metric: string;
  actual: number | null;
  budget: number | null;
  favUnf: number | null;
  variance: number | null;
  isCurrency: boolean;
  isHeader: boolean;
  isSubtotal: boolean;
}

type SortKey = keyof TableRow;
type SortDirection = "asc" | "desc";

interface CategoryConfig {
  key: string;
  title: string;
  metrics: {
    key: string;
    label: string;
    section: "pbr" | "mining" | "processing" | "production" | "nsr" | "costs" | "capex" | "cash_cost"; // Source section
    isCurrency?: boolean;
    isSubtotal?: boolean;
  }[];
}

// PBR Category configuration matching the Excel structure
// section: "pbr" = from PBRActual, others = from SummaryReport sections
const PBR_CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: "ore_mined",
    title: "Ore Mined",
    metrics: [
      { key: "open_pit_ore_t", label: "Open Pit Ore (t)", section: "mining" },
      { key: "underground_ore_t", label: "Underground Ore (t)", section: "mining" },
      { key: "ore_mined_t", label: "Total Ore Mined (t)", section: "pbr", isSubtotal: true },
    ],
  },
  {
    key: "waste_mined",
    title: "Waste Mined",
    metrics: [
      { key: "waste_mined_t", label: "Waste Mined (t)", section: "pbr" },
      { key: "stripping_ratio", label: "Stripping Ratio", section: "mining" },
    ],
  },
  {
    key: "mining_grades_silver",
    title: "Mining Grade - Silver (g/t)",
    metrics: [
      { key: "open_pit_grade_silver_gpt", label: "Open Pit", section: "mining" },
      { key: "underground_grade_silver_gpt", label: "Underground", section: "mining" },
      { key: "mining_grade_silver_gpt", label: "Mining Grade - Silver (g/t)", section: "mining", isSubtotal: true },
    ],
  },
  {
    key: "mining_grades_gold",
    title: "Mining Grade - Gold (g/t)",
    metrics: [
      { key: "open_pit_grade_gold_gpt", label: "Open Pit", section: "mining" },
      { key: "underground_grade_gold_gpt", label: "Underground", section: "mining" },
      { key: "mining_grade_gold_gpt", label: "Mining Grade - Gold (g/t)", section: "mining", isSubtotal: true },
    ],
  },
  {
    key: "developments",
    title: "Mine Development",
    metrics: [
      { key: "primary_development_m", label: "Primary Development - Sustaining (m)", section: "mining" },
      { key: "secondary_development_opex_m", label: "Secondary Development OPEX (m)", section: "mining" },
      { key: "expansionary_development_m", label: "Expansionary Development (m)", section: "mining" },
      { key: "developments_m", label: "Developments (m)", section: "pbr", isSubtotal: true },
    ],
  },
  {
    key: "headcount",
    title: "Headcount",
    metrics: [
      { key: "full_time_employees", label: "Full- & Part-Time Employees (Qty)", section: "mining" },
      { key: "contractors", label: "Contractors (Qty)", section: "mining" },
      { key: "total_headcount", label: "Total Headcount", section: "mining", isSubtotal: true },
    ],
  },
  {
    key: "processing",
    title: "Processing",
    metrics: [
      { key: "total_tonnes_processed", label: "Total Tonnes Processed", section: "pbr" },
      { key: "feed_grade_silver_gpt", label: "Feed Grade - Silver (g/t)", section: "pbr" },
      { key: "feed_grade_gold_gpt", label: "Feed Grade - Gold (g/t)", section: "pbr" },
    ],
  },
  {
    key: "recovery",
    title: "Recovery Rate",
    metrics: [
      { key: "recovery_rate_silver_pct", label: "Recovery Rate - Silver (%)", section: "pbr" },
      { key: "recovery_rate_gold_pct", label: "Recovery Rate - Gold (%)", section: "pbr" },
    ],
  },
  {
    key: "production",
    title: "Total Production",
    metrics: [
      { key: "total_production_silver_oz", label: "Total Production - Silver (oz)", section: "pbr" },
      { key: "total_production_gold_oz", label: "Total Production - Gold (oz)", section: "pbr" },
    ],
  },
  {
    key: "dore",
    title: "Dore Production",
    metrics: [{ key: "dore_production_oz", label: "Dore Production (oz)", section: "production" }],
  },
  {
    key: "payable",
    title: "Payable Production",
    metrics: [
      { key: "payable_silver_oz", label: "Payable Metal in Dore - Silver (oz)", section: "production" },
      { key: "payable_gold_oz", label: "Payable Metal in Dore - Gold (oz)", section: "production" },
    ],
  },
  {
    key: "nsr_tonne",
    title: "Net Smelter Return per Tonne",
    metrics: [
      { key: "nsr_per_tonne", label: "NSR per tonne", section: "nsr", isCurrency: true },
      { key: "total_cost_per_tonne", label: "Total cost per tonne", section: "nsr", isCurrency: true },
      { key: "margin_per_tonne", label: "Margin per Tonne", section: "nsr", isCurrency: true },
    ],
  },
  {
    key: "pbr_margin",
    title: "Production Basis Margin Reporting",
    metrics: [
      { key: "nsr_dore", label: "Net Smelter Return - Dore", section: "nsr", isCurrency: true },
      { key: "streaming", label: "Streaming", section: "nsr", isCurrency: true },
      { key: "pbr_revenue", label: "PBR Revenue", section: "nsr", isCurrency: true, isSubtotal: true },
      { key: "shipping_selling", label: "Shipping & Selling", section: "nsr", isCurrency: true },
      { key: "sales_taxes_royalties", label: "Sales Taxes & Royalties", section: "nsr", isCurrency: true },
      { key: "smelting_refining_charges", label: "Smelting & Refining Charges", section: "nsr", isCurrency: true },
      { key: "net_smelter_return", label: "Net Smelter Return", section: "nsr", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "costs",
    title: "Costs",
    metrics: [
      { key: "mine", label: "Costs - Mine", section: "costs", isCurrency: true },
      { key: "processing", label: "Costs - Processing", section: "costs", isCurrency: true },
      { key: "ga", label: "Costs - G&A", section: "costs", isCurrency: true },
      { key: "transport_shipping", label: "Transport & Shipping", section: "costs", isCurrency: true },
      { key: "inventory_variations", label: "Inventory Variations", section: "costs", isCurrency: true },
      {
        key: "production_based_costs",
        label: "Production based Costs",
        section: "costs",
        isCurrency: true,
        isSubtotal: true,
      },
    ],
  },
  {
    key: "margin",
    title: "Production based Margin",
    metrics: [
      {
        key: "production_based_margin",
        label: "Production based Margin",
        section: "costs",
        isCurrency: true,
        isSubtotal: true,
      },
    ],
  },
  {
    key: "capex",
    title: "CAPEX & Cash Flow",
    metrics: [
      { key: "sustaining", label: "AISC Sustaining Capital", section: "capex", isCurrency: true },
      { key: "pbr_net_cash_flow", label: "PBR Net Cash flow", section: "capex", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "cost_per_oz",
    title: "Cost per Ounce Paid",
    metrics: [
      { key: "gold_credit", label: "Gold Credit", section: "nsr", isCurrency: true },
      {
        key: "cash_cost_per_oz_silver",
        label: "Cash Cost per Payable Ounce - Silver",
        section: "cash_cost",
        isCurrency: true,
      },
    ],
  },
  {
    key: "aisc",
    title: "All In Sustaining Cost (AISC)",
    metrics: [
      {
        key: "accretion_of_mine_closure_liability",
        label: "Accretion of Mine Closure Liability",
        section: "capex",
        isCurrency: true,
      },
      {
        key: "aisc_per_oz_silver",
        label: "AISC per Payable Ounce - Silver",
        section: "cash_cost",
        isCurrency: true,
        isSubtotal: true,
      },
    ],
  },
];

// Metrics that should be averaged instead of summed
const AVERAGE_METRICS = [
  // Mining grades
  "mining_grade_silver_gpt",
  "mining_grade_gold_gpt",
  "open_pit_grade_silver_gpt",
  "underground_grade_silver_gpt",
  "open_pit_grade_gold_gpt",
  "underground_grade_gold_gpt",
  "stripping_ratio",
  // Processing grades and rates
  "feed_grade_silver_gpt",
  "feed_grade_gold_gpt",
  "recovery_rate_silver_pct",
  "recovery_rate_gold_pct",
  // Per-unit metrics
  "nsr_per_tonne",
  "total_cost_per_tonne",
  "margin_per_tonne",
  "cash_cost_per_oz_silver",
  "aisc_per_oz_silver",
];

export function DetailedPBRView({ report, summaryReport }: DetailedPBRViewProps) {
  // Filter months that have data
  const monthsWithData = useMemo(() => {
    return report.months.filter((m) => (m.actual?.has_data ?? false) || (m.budget?.has_data ?? false));
  }, [report.months]);

  // Get summary months for additional metrics
  const summaryMonths = useMemo(() => {
    if (!summaryReport) return [];
    return summaryReport.months.filter((m) => m.actual?.production?.has_data || m.budget?.production?.has_data);
  }, [summaryReport]);

  if (monthsWithData.length === 0) {
    return (
      <Alert>
        <AlertDescription>No hay datos disponibles para este reporte</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts Section */}
      <PBRCharts months={monthsWithData} />

      {/* Table Section */}
      <PBRTable
        months={monthsWithData}
        allMonths={report.months}
        summaryMonths={summaryMonths}
        companyConfig={report.config || summaryReport?.config}
      />
    </div>
  );
}

// ==================== Charts Component ====================

function PBRCharts({ months }: { months: PBRMonthlyData[] }) {
  // Prepare chart data
  const chartData = useMemo(() => {
    return months.map((m) => ({
      month: fmtMonth(m.month),
      // Mining
      ore_actual: m.actual?.ore_mined_t ?? 0,
      ore_budget: m.budget?.ore_mined_t ?? 0,
      waste_actual: m.actual?.waste_mined_t ?? 0,
      waste_budget: m.budget?.waste_mined_t ?? 0,
      // Processing
      processed_actual: m.actual?.total_tonnes_processed ?? 0,
      processed_budget: m.budget?.total_tonnes_processed ?? 0,
      // Grades
      silver_grade_actual: m.actual?.feed_grade_silver_gpt ?? 0,
      silver_grade_budget: m.budget?.feed_grade_silver_gpt ?? 0,
      gold_grade_actual: m.actual?.feed_grade_gold_gpt ?? 0,
      gold_grade_budget: m.budget?.feed_grade_gold_gpt ?? 0,
      // Recovery
      silver_recovery_actual: m.actual?.recovery_rate_silver_pct ?? 0,
      silver_recovery_budget: m.budget?.recovery_rate_silver_pct ?? 0,
      gold_recovery_actual: m.actual?.recovery_rate_gold_pct ?? 0,
      gold_recovery_budget: m.budget?.recovery_rate_gold_pct ?? 0,
      // Production
      silver_prod_actual: m.actual?.total_production_silver_oz ?? 0,
      silver_prod_budget: m.budget?.total_production_silver_oz ?? 0,
      gold_prod_actual: m.actual?.total_production_gold_oz ?? 0,
      gold_prod_budget: m.budget?.total_production_gold_oz ?? 0,
      // Ratio
      ratio_actual: m.actual?.waste_ore_ratio ?? 0,
      ratio_budget: m.budget?.waste_ore_ratio ?? 0,
    }));
  }, [months]);

  // Calculate totals for summary cards
  const totals = useMemo(() => {
    const sum = (key: keyof PBRMonthlyData["actual"]) =>
      months.reduce((acc, m) => acc + ((m.actual?.[key] as number) ?? 0), 0);
    const sumBudget = (key: keyof PBRMonthlyData["budget"]) =>
      months.reduce((acc, m) => acc + ((m.budget?.[key] as number) ?? 0), 0);

    return {
      ore: { actual: sum("ore_mined_t"), budget: sumBudget("ore_mined_t") },
      waste: { actual: sum("waste_mined_t"), budget: sumBudget("waste_mined_t") },
      processed: { actual: sum("total_tonnes_processed"), budget: sumBudget("total_tonnes_processed") },
      silverProd: { actual: sum("total_production_silver_oz"), budget: sumBudget("total_production_silver_oz") },
      goldProd: { actual: sum("total_production_gold_oz"), budget: sumBudget("total_production_gold_oz") },
    };
  }, [months]);

  const _getVarianceColor = (actual: number, budget: number) => {
    const variance = actual - budget;
    return variance >= 0 ? "text-emerald-600" : "text-rose-600";
  };

  const _getVariancePct = (actual: number, budget: number) => {
    if (budget === 0) return null;
    return ((actual - budget) / Math.abs(budget)) * 100;
  };

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard title="Ore Mined" actual={totals.ore.actual} budget={totals.ore.budget} unit="t" />
        <SummaryCard title="Waste Mined" actual={totals.waste.actual} budget={totals.waste.budget} unit="t" />
        <SummaryCard
          title="Tonnes Processed"
          actual={totals.processed.actual}
          budget={totals.processed.budget}
          unit="t"
        />
        <SummaryCard
          title="Silver Production"
          actual={totals.silverProd.actual}
          budget={totals.silverProd.budget}
          unit="oz"
        />
        <SummaryCard
          title="Gold Production"
          actual={totals.goldProd.actual}
          budget={totals.goldProd.budget}
          unit="oz"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Mining Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mining: Ore vs Waste</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="ore_actual" fill="#3b82f6" name="Ore Actual" />
                <Bar dataKey="ore_budget" fill="#93c5fd" name="Ore Budget" />
                <Bar dataKey="waste_actual" fill="#f97316" name="Waste Actual" />
                <Bar dataKey="waste_budget" fill="#fdba74" name="Waste Budget" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Production Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Production: Silver & Gold (oz)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area
                  type="monotone"
                  dataKey="silver_prod_actual"
                  stroke="#64748b"
                  fill="#94a3b8"
                  fillOpacity={0.6}
                  name="Silver Actual"
                />
                <Area
                  type="monotone"
                  dataKey="silver_prod_budget"
                  stroke="#cbd5e1"
                  fill="#e2e8f0"
                  fillOpacity={0.3}
                  strokeDasharray="4"
                  name="Silver Budget"
                />
                <Area
                  type="monotone"
                  dataKey="gold_prod_actual"
                  stroke="#eab308"
                  fill="#fde047"
                  fillOpacity={0.6}
                  name="Gold Actual"
                />
                <Area
                  type="monotone"
                  dataKey="gold_prod_budget"
                  stroke="#fef08a"
                  fill="#fef9c3"
                  fillOpacity={0.3}
                  strokeDasharray="4"
                  name="Gold Budget"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Feed Grades Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Feed Grade (g/t)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="silver_grade_actual"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Ag Actual"
                />
                <Line
                  type="monotone"
                  dataKey="silver_grade_budget"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4"
                  dot={false}
                  name="Ag Budget"
                />
                <Line
                  type="monotone"
                  dataKey="gold_grade_actual"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Au Actual"
                />
                <Line
                  type="monotone"
                  dataKey="gold_grade_budget"
                  stroke="#fde047"
                  strokeWidth={1.5}
                  strokeDasharray="4"
                  dot={false}
                  name="Au Budget"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recovery Rate Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recovery Rate (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[80, 100]} />
                <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="silver_recovery_actual"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Ag Recovery Actual"
                />
                <Line
                  type="monotone"
                  dataKey="silver_recovery_budget"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4"
                  dot={false}
                  name="Ag Recovery Budget"
                />
                <Line
                  type="monotone"
                  dataKey="gold_recovery_actual"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Au Recovery Actual"
                />
                <Line
                  type="monotone"
                  dataKey="gold_recovery_budget"
                  stroke="#fde047"
                  strokeWidth={1.5}
                  strokeDasharray="4"
                  dot={false}
                  name="Au Recovery Budget"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Summary Card Component
function SummaryCard({ title, actual, budget, unit }: { title: string; actual: number; budget: number; unit: string }) {
  const variance = actual - budget;
  const variancePct = budget !== 0 ? ((actual - budget) / Math.abs(budget)) * 100 : null;
  const isPositive = variance >= 0;

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="mb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="font-bold text-lg tabular-nums">
          {fmt(actual)}
          <span className="ml-1 font-normal text-muted-foreground text-xs">{unit}</span>
        </p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Bdg: {fmt(budget)}</span>
          {variancePct !== null && (
            <span className={`font-medium text-[10px] ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {isPositive ? "+" : ""}
              {variancePct.toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Table Component ====================

function PBRTable({
  months,
  allMonths: _allMonths,
  summaryMonths,
  companyConfig,
}: {
  months: PBRMonthlyData[];
  allMonths: PBRMonthlyData[];
  summaryMonths: MonthlyReport[];
  companyConfig?: CompanyConfig;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // Get months with actual data
  const monthsWithActual = useMemo(() => {
    return months.filter((m) => m.actual?.has_data);
  }, [months]);

  // Available months for selector
  const availableMonths = useMemo(() => {
    return months.map((m) => ({
      value: m.month,
      label: fmtMonthLong(m.month),
      hasActual: m.actual?.has_data ?? false,
      hasBudget: m.budget?.has_data ?? false,
    }));
  }, [months]);

  // Period label
  const periodLabel = useMemo(() => {
    if (selectedPeriod === "all") {
      if (monthsWithActual.length === 0) return "Sin datos";
      const firstMonth = monthsWithActual[0];
      const lastMonth = monthsWithActual[monthsWithActual.length - 1];
      if (firstMonth.month === lastMonth.month) {
        return fmtMonth(firstMonth.month);
      }
      return `${fmtMonth(firstMonth.month)} - ${fmtMonth(lastMonth.month)}`;
    }
    return fmtMonthLong(selectedPeriod);
  }, [selectedPeriod, monthsWithActual]);

  // Summary months with actual data
  const summaryMonthsWithActual = useMemo(() => {
    return summaryMonths.filter((m) => m.actual?.production?.has_data);
  }, [summaryMonths]);

  // Helper functions for aggregation - PBR data (stable refs for getMetricValue deps)
  const sumPBRMetric = useCallback(
    (monthsList: PBRMonthlyData[], metricKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let hasAny = false;
      for (const m of monthsList) {
        const data = m[dataType];
        if (data?.has_data && typeof (data as unknown as Record<string, number>)[metricKey] === "number") {
          sum += (data as unknown as Record<string, number>)[metricKey];
          hasAny = true;
        }
      }
      return hasAny ? sum : null;
    },
    [],
  );

  const avgPBRMetric = useCallback(
    (monthsList: PBRMonthlyData[], metricKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let count = 0;
      for (const m of monthsList) {
        const data = m[dataType];
        if (data?.has_data && typeof (data as unknown as Record<string, number>)[metricKey] === "number") {
          sum += (data as unknown as Record<string, number>)[metricKey];
          count++;
        }
      }
      return count > 0 ? sum / count : null;
    },
    [],
  );

  const sumSummaryMetric = useCallback(
    (monthsList: MonthlyReport[], section: string, metricKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let hasAny = false;
      for (const m of monthsList) {
        const sectionData = m[dataType]?.[section as keyof typeof m.actual] as unknown as
          | Record<string, number>
          | undefined;
        if (sectionData?.has_data && typeof sectionData[metricKey] === "number") {
          sum += sectionData[metricKey];
          hasAny = true;
        }
      }
      return hasAny ? sum : null;
    },
    [],
  );

  const avgSummaryMetric = useCallback(
    (monthsList: MonthlyReport[], section: string, metricKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let count = 0;
      for (const m of monthsList) {
        const sectionData = m[dataType]?.[section as keyof typeof m.actual] as unknown as
          | Record<string, number>
          | undefined;
        if (sectionData?.has_data && typeof sectionData[metricKey] === "number") {
          sum += sectionData[metricKey];
          count++;
        }
      }
      return count > 0 ? sum / count : null;
    },
    [],
  );

  const getMetricValue = useCallback(
    (
      metric: { key: string; section: string },
      targetPBRMonths: PBRMonthlyData[],
      targetSummaryMonths: MonthlyReport[],
      dataType: "actual" | "budget",
      isAllPeriod: boolean,
    ): number | null => {
      const isAvgMetric = AVERAGE_METRICS.includes(metric.key);

      if (metric.section === "pbr") {
        if (isAllPeriod) {
          return isAvgMetric
            ? avgPBRMetric(targetPBRMonths, metric.key, dataType)
            : sumPBRMetric(targetPBRMonths, metric.key, dataType);
        }
        const monthData = targetPBRMonths[0];
        return monthData?.[dataType]?.has_data
          ? (monthData[dataType] as unknown as Record<string, number>)[metric.key]
          : null;
      }

      if (targetSummaryMonths.length === 0) return null;

      if (isAllPeriod) {
        return isAvgMetric
          ? avgSummaryMetric(targetSummaryMonths, metric.section, metric.key, dataType)
          : sumSummaryMetric(targetSummaryMonths, metric.section, metric.key, dataType);
      }

      const monthData = targetSummaryMonths[0];
      const sectionData = monthData?.[dataType]?.[metric.section as keyof typeof monthData.actual] as
        | Record<string, number>
        | undefined;
      return sectionData?.has_data ? sectionData[metric.key] : null;
    },
    [avgPBRMetric, avgSummaryMetric, sumPBRMetric, sumSummaryMetric],
  );

  // Build table rows
  const tableRows = useMemo(() => {
    const isAllPeriod = selectedPeriod === "all";
    const targetPBRMonths = isAllPeriod ? monthsWithActual : months.filter((m) => m.month === selectedPeriod);
    const targetSummaryMonths = isAllPeriod
      ? summaryMonthsWithActual
      : summaryMonths.filter((m) => m.month === selectedPeriod);

    if (targetPBRMonths.length === 0 && targetSummaryMonths.length === 0) return [];

    const rows: TableRow[] = [];

    // Filter categories based on company configuration
    const filteredCategories = filterCategoriesByConfig(PBR_CATEGORY_CONFIG, companyConfig);

    for (const category of filteredCategories) {
      // Add category header
      rows.push({
        id: `header-${category.key}`,
        category: category.key,
        metric: category.title,
        actual: null,
        budget: null,
        favUnf: null,
        variance: null,
        isCurrency: false,
        isHeader: true,
        isSubtotal: false,
      });

      for (const metric of category.metrics) {
        const actualValue = getMetricValue(metric, targetPBRMonths, targetSummaryMonths, "actual", isAllPeriod);
        const budgetValue = getMetricValue(metric, targetPBRMonths, targetSummaryMonths, "budget", isAllPeriod);

        const favUnf = actualValue !== null && budgetValue !== null ? actualValue - budgetValue : null;
        const variance =
          actualValue !== null && budgetValue !== null && budgetValue !== 0
            ? ((actualValue - budgetValue) / Math.abs(budgetValue)) * 100
            : null;

        rows.push({
          id: `${category.key}-${metric.key}`,
          category: category.key,
          metric: metric.label,
          actual: actualValue,
          budget: budgetValue,
          favUnf,
          variance,
          isCurrency: metric.isCurrency || false,
          isHeader: false,
          isSubtotal: metric.isSubtotal || false,
        });
      }
    }

    return rows;
  }, [selectedPeriod, monthsWithActual, months, summaryMonthsWithActual, summaryMonths, companyConfig, getMetricValue]);

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return tableRows;
    const term = searchTerm.toLowerCase();

    const matchingCategories = new Set<string>();
    for (const row of tableRows) {
      if (!row.isHeader) {
        const metricMatches = row.metric.toLowerCase().includes(term);
        const numbersMatch = [row.actual, row.budget, row.favUnf].some(
          (v) => v !== null && fmt(v).toLowerCase().includes(term),
        );
        if (metricMatches || numbersMatch) {
          matchingCategories.add(row.category);
        }
      }
    }

    return tableRows.filter((row) => {
      if (row.isHeader) return matchingCategories.has(row.category);
      const metricMatches = row.metric.toLowerCase().includes(term);
      const numbersMatch = [row.actual, row.budget, row.favUnf].some(
        (v) => v !== null && fmt(v).toLowerCase().includes(term),
      );
      return metricMatches || numbersMatch;
    });
  }, [tableRows, searchTerm]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortKey || sortKey === "metric" || sortKey === "category" || sortKey === "id") {
      return filteredRows;
    }

    const grouped: Map<string, TableRow[]> = new Map();
    let currentCategory = "";

    for (const row of filteredRows) {
      if (row.isHeader) {
        currentCategory = row.category;
        if (!grouped.has(currentCategory)) {
          grouped.set(currentCategory, [row]);
        }
      } else if (grouped.has(currentCategory)) {
        grouped.get(currentCategory)?.push(row);
      }
    }

    for (const [, rows] of grouped) {
      const dataRows = rows.slice(1);
      dataRows.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        const comparison = (aVal as number) - (bVal as number);
        return sortDirection === "asc" ? comparison : -comparison;
      });
      rows.splice(1, rows.length - 1, ...dataRows);
    }

    return Array.from(grouped.values()).flat();
  }, [filteredRows, sortKey, sortDirection]);

  // Filter out collapsed categories
  const visibleRows = useMemo(() => {
    return sortedRows.filter((row) => {
      if (row.isHeader) return true;
      return !collapsedCategories.has(row.category);
    });
  }, [sortedRows, collapsedCategories]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const toggleCategory = (categoryKey: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  const formatValue = (value: number | null, isCurrency: boolean): string => {
    if (value === null) return "-";
    if (isCurrency) return fmtCurr(value);
    return fmt(value);
  };

  const formatFavUnf = (value: number | null, isCurrency: boolean): string => {
    if (value === null) return "-";
    const absValue = Math.abs(value);
    const formatted = isCurrency ? fmtCurr(absValue) : fmt(absValue);
    return value < 0 ? `(${formatted})` : formatted;
  };

  const formatVariance = (value: number | null): string => {
    if (value === null) return "-";
    return `${value.toFixed(0)}%`;
  };

  const getVarianceColor = (value: number | null): string => {
    if (value === null) return "";
    return value >= 0 ? "text-emerald-600" : "text-rose-600";
  };

  const isAllPeriod = selectedPeriod === "all";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">PBR - Detailed Table</CardTitle>
            <CardDescription className="text-xs">
              {isAllPeriod
                ? `Accumulated from ${monthsWithActual.length} month${monthsWithActual.length > 1 ? "s" : ""} with Actual data`
                : "Actual vs Budget"}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">📊 All (Accumulated YTD)</option>
              <optgroup label="By month">
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} {m.hasActual && m.hasBudget ? "✓" : m.hasActual ? "(A)" : "(B)"}
                  </option>
                ))}
              </optgroup>
            </select>
            <div className="relative w-64">
              <Search className="-translate-y-1/2 absolute top-1/2 left-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search metric or value..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted/30">
              <tr className="border-b">
                <th className="sticky left-0 min-w-[220px] bg-muted/30 px-3 py-2 text-left font-semibold">Metric</th>
                <th
                  colSpan={4}
                  className="border-l bg-blue-50/50 px-2 py-1 text-center font-semibold dark:bg-blue-950/20"
                >
                  <div className="text-xs">{isAllPeriod ? `Accumulated (${periodLabel})` : periodLabel}</div>
                </th>
              </tr>
              <tr className="border-b bg-muted/20">
                <th className="sticky left-0 bg-muted/20 px-3 py-1.5 text-left font-medium text-[10px] text-muted-foreground" />
                <th className="min-w-[90px] border-l px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 font-medium text-[10px]"
                    onClick={() => handleSort("actual")}
                  >
                    Actual <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="min-w-[90px] px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 font-medium text-[10px]"
                    onClick={() => handleSort("budget")}
                  >
                    Budget <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="min-w-[80px] px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 font-medium text-[10px]"
                    onClick={() => handleSort("favUnf")}
                  >
                    Fav (Unf) <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="min-w-[70px] px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 font-medium text-[10px]"
                    onClick={() => handleSort("variance")}
                  >
                    % Var <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                if (row.isHeader) {
                  const isCollapsed = collapsedCategories.has(row.category);
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer bg-muted/40 hover:bg-muted/50"
                      onClick={() => toggleCategory(row.category)}
                    >
                      <td colSpan={5} className="sticky left-0 bg-muted/40 px-3 py-2 font-bold text-sm">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {row.metric}
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={row.id}
                    className={`border-b hover:bg-muted/10 ${row.isSubtotal ? "bg-muted/10 font-semibold" : ""}`}
                  >
                    <td
                      className={`sticky left-0 bg-background px-3 py-1.5 ${row.isSubtotal ? "bg-muted/10 font-semibold" : ""}`}
                    >
                      {row.metric}
                    </td>
                    <td className="border-l px-2 py-1.5 text-right tabular-nums">
                      {formatValue(row.actual, row.isCurrency)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatValue(row.budget, row.isCurrency)}</td>
                    <td className={`px-2 py-1.5 text-right tabular-nums ${getVarianceColor(row.favUnf)}`}>
                      {formatFavUnf(row.favUnf, row.isCurrency)}
                    </td>
                    <td className={`px-2 py-1.5 text-right tabular-nums ${getVarianceColor(row.variance)}`}>
                      {formatVariance(row.variance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visibleRows.filter((r) => !r.isHeader).length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">No metrics found matching the search</div>
        )}
      </CardContent>
    </Card>
  );
}
