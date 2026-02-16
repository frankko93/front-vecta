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
import type { CompanyConfig, DoreMonthlyData, DoreReport, MonthlyReport, SummaryReport } from "@/lib/api/types";
import { filterCategoriesByConfig } from "@/lib/company-config";

interface DetailedDoreViewProps {
  report: DoreReport;
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
    section: "dore" | "nsr"; // Source section
    isCurrency?: boolean;
    isSubtotal?: boolean;
  }[];
}

// Dore Category configuration matching the Excel structure
const DORE_CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: "dore_produced",
    title: "Dore Produced",
    metrics: [
      { key: "dore_produced_oz", label: "Dore produced (oz)", section: "dore" },
      { key: "silver_grade_pct", label: "Silver Grade in Dore (%)", section: "dore" },
      { key: "gold_grade_pct", label: "Gold Grade in Dore (%)", section: "dore" },
    ],
  },
  {
    key: "metal_prices",
    title: "Metal Prices",
    metrics: [
      { key: "pbr_price_silver", label: "PBR Price - Silver ($/oz)", section: "dore", isCurrency: true },
      { key: "pbr_price_gold", label: "PBR Price - Gold ($/oz)", section: "dore", isCurrency: true },
      { key: "realized_price_silver", label: "Realized Price - Silver ($/oz)", section: "dore", isCurrency: true },
      { key: "realized_price_gold", label: "Realized Price - Gold ($/oz)", section: "dore", isCurrency: true },
    ],
  },
  {
    key: "metal_in_dore",
    title: "Metal in Dore",
    metrics: [
      { key: "metal_in_dore_silver_oz", label: "Metal in Dore - Silver (oz)", section: "dore" },
      { key: "metal_in_dore_gold_oz", label: "Metal in Dore - Gold (oz)", section: "dore" },
    ],
  },
  {
    key: "adjustments",
    title: "Adjustments",
    metrics: [
      { key: "silver_adjustment_oz", label: "Silver Adjustment (oz)", section: "dore" },
      { key: "gold_adjustment_oz", label: "Gold Adjustment (oz)", section: "dore" },
    ],
  },
  {
    key: "metal_adjusted",
    title: "Metal in Dore Adjusted",
    metrics: [
      { key: "metal_adjusted_silver_oz", label: "Metal in Dore Adjusted - Silver (oz)", section: "dore" },
      { key: "metal_adjusted_gold_oz", label: "Metal in Dore Adjusted - Gold (oz)", section: "dore" },
    ],
  },
  {
    key: "deductions",
    title: "Metal Deductions",
    metrics: [
      { key: "ag_deductions_pct", label: "Ag Deductions in Dore (%)", section: "dore" },
      { key: "au_deductions_pct", label: "Au Deductions in Dore (%)", section: "dore" },
      { key: "deductions_silver_oz", label: "Ag Deductions in Dore (oz)", section: "dore" },
      { key: "deductions_gold_oz", label: "Au Deductions in Dore (oz)", section: "dore" },
    ],
  },
  {
    key: "payable",
    title: "Payable Metal",
    metrics: [
      { key: "payable_silver_oz", label: "Payable Metal in Dore - Silver (oz)", section: "dore" },
      { key: "payable_gold_oz", label: "Payable Metal in Dore - Gold (oz)", section: "dore" },
    ],
  },
  {
    key: "metal_prices",
    title: "Metal Prices",
    metrics: [
      { key: "silver_price_per_oz", label: "Silver Price ($/oz)", section: "nsr", isCurrency: true },
      { key: "gold_price_per_oz", label: "Gold Price ($/oz)", section: "nsr", isCurrency: true },
    ],
  },
  {
    key: "gross_revenue",
    title: "Gross Metal Revenue",
    metrics: [
      { key: "gross_revenue_silver", label: "Dore Gross Revenue - Silver", section: "dore", isCurrency: true },
      { key: "gross_revenue_gold", label: "Dore Gross Revenue - Gold", section: "dore", isCurrency: true },
      { key: "gross_revenue_total", label: "Dore Revenue", section: "dore", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "charges",
    title: "Charges",
    metrics: [
      { key: "treatment_charge", label: "Dore Treatment Charge", section: "dore", isCurrency: true },
      { key: "refining_deductions_au", label: "Refining deductions - Au ($)", section: "dore", isCurrency: true },
      { key: "total_charges", label: "Dore Total Charges", section: "dore", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "nsr_dore",
    title: "Net Smelter Return - Dore",
    metrics: [
      { key: "nsr_dore", label: "Net Smelter Return - Dore", section: "dore", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "streaming",
    title: "Streaming & PBR Revenue",
    metrics: [
      { key: "streaming", label: "Streaming", section: "nsr", isCurrency: true },
      { key: "pbr_revenue", label: "PBR Revenue", section: "nsr", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "byproduct",
    title: "By-product Credits",
    metrics: [{ key: "gold_credit", label: "Gold Credit", section: "nsr", isCurrency: true }],
  },
];

// Metrics that should be averaged instead of summed
const AVERAGE_METRICS = [
  "silver_grade_pct",
  "gold_grade_pct",
  "ag_deductions_pct",
  "au_deductions_pct",
  "pbr_price_silver",
  "pbr_price_gold",
  "realized_price_silver",
  "realized_price_gold",
  "silver_price_per_oz",
  "gold_price_per_oz",
];

export function DetailedDoreView({ report, summaryReport }: DetailedDoreViewProps) {
  // Filter months that have data
  const monthsWithData = useMemo(() => {
    return report.months.filter((m) => (m.actual?.has_data ?? false) || (m.budget?.has_data ?? false));
  }, [report.months]);

  // Get summary months for additional metrics (streaming, pbr_revenue, gold_credit)
  const summaryMonths = useMemo(() => {
    if (!summaryReport) return [];
    return summaryReport.months.filter((m) => m.actual?.nsr?.has_data || m.budget?.nsr?.has_data);
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
      <DoreCharts months={monthsWithData} />

      {/* Table Section */}
      <DoreTable
        months={monthsWithData}
        summaryMonths={summaryMonths}
        companyConfig={report.config || summaryReport?.config}
      />
    </div>
  );
}

// ==================== Charts Component ====================

function DoreCharts({ months }: { months: DoreMonthlyData[] }) {
  // Prepare chart data
  const chartData = useMemo(() => {
    return months.map((m) => ({
      month: fmtMonth(m.month),
      dore_actual: m.actual?.dore_produced_oz ?? 0,
      dore_budget: m.budget?.dore_produced_oz ?? 0,
      payable_silver_actual: m.actual?.payable_silver_oz ?? 0,
      payable_silver_budget: m.budget?.payable_silver_oz ?? 0,
      payable_gold_actual: m.actual?.payable_gold_oz ?? 0,
      payable_gold_budget: m.budget?.payable_gold_oz ?? 0,
      nsr_actual: m.actual?.nsr_dore ?? 0,
      nsr_budget: m.budget?.nsr_dore ?? 0,
      revenue_silver_actual: m.actual?.gross_revenue_silver ?? 0,
      revenue_gold_actual: m.actual?.gross_revenue_gold ?? 0,
    }));
  }, [months]);

  // Calculate totals for summary cards
  const totals = useMemo(() => {
    const sum = (key: keyof DoreMonthlyData["actual"]) =>
      months.reduce((acc, m) => acc + ((m.actual?.[key] as number) ?? 0), 0);
    const sumBudget = (key: keyof DoreMonthlyData["budget"]) =>
      months.reduce((acc, m) => acc + ((m.budget?.[key] as number) ?? 0), 0);

    return {
      dore: { actual: sum("dore_produced_oz"), budget: sumBudget("dore_produced_oz") },
      payableSilver: { actual: sum("payable_silver_oz"), budget: sumBudget("payable_silver_oz") },
      payableGold: { actual: sum("payable_gold_oz"), budget: sumBudget("payable_gold_oz") },
      nsr: { actual: sum("nsr_dore"), budget: sumBudget("nsr_dore") },
      revenueTotal: { actual: sum("gross_revenue_total"), budget: sumBudget("gross_revenue_total") },
    };
  }, [months]);

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard title="Dore Produced" actual={totals.dore.actual} budget={totals.dore.budget} unit="oz" />
        <SummaryCard
          title="Payable Silver"
          actual={totals.payableSilver.actual}
          budget={totals.payableSilver.budget}
          unit="oz"
        />
        <SummaryCard
          title="Payable Gold"
          actual={totals.payableGold.actual}
          budget={totals.payableGold.budget}
          unit="oz"
        />
        <SummaryCard
          title="Gross Revenue"
          actual={totals.revenueTotal.actual}
          budget={totals.revenueTotal.budget}
          unit=""
          isCurrency
        />
        <SummaryCard title="NSR Dore" actual={totals.nsr.actual} budget={totals.nsr.budget} unit="" isCurrency />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Dore Production Flow Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dore → Payable Metal (oz)</CardTitle>
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
                  dataKey="dore_actual"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                  fillOpacity={0.6}
                  name="Dore Actual"
                />
                <Area
                  type="monotone"
                  dataKey="payable_silver_actual"
                  stroke="#64748b"
                  fill="#94a3b8"
                  fillOpacity={0.4}
                  name="Payable Ag Actual"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* NSR Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">NSR Dore ($)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => fmtCurr(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="nsr_actual" fill="#10b981" name="NSR Actual" />
                <Bar dataKey="nsr_budget" fill="#6ee7b7" name="NSR Budget" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Breakdown Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gross Revenue by Metal ($)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => fmtCurr(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="revenue_silver_actual" stackId="a" fill="#94a3b8" name="Silver Revenue" />
                <Bar dataKey="revenue_gold_actual" stackId="a" fill="#fde047" name="Gold Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payable Metals Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payable Metal: Actual vs Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="payable_silver_actual"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Ag Actual"
                />
                <Line
                  type="monotone"
                  dataKey="payable_silver_budget"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4"
                  dot={false}
                  name="Ag Budget"
                />
                <Line
                  type="monotone"
                  dataKey="payable_gold_actual"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Au Actual"
                />
                <Line
                  type="monotone"
                  dataKey="payable_gold_budget"
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
      </div>
    </>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  actual,
  budget,
  unit,
  isCurrency = false,
}: {
  title: string;
  actual: number;
  budget: number;
  unit: string;
  isCurrency?: boolean;
}) {
  const variance = actual - budget;
  const variancePct = budget !== 0 ? ((actual - budget) / Math.abs(budget)) * 100 : null;
  const isPositive = variance >= 0;
  const formatFn = isCurrency ? fmtCurr : fmt;

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="mb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="font-bold text-lg tabular-nums">
          {formatFn(actual)}
          {unit && <span className="ml-1 font-normal text-muted-foreground text-xs">{unit}</span>}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Bdg: {formatFn(budget)}</span>
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

function DoreTable({
  months,
  summaryMonths,
  companyConfig,
}: {
  months: DoreMonthlyData[];
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

  const summaryMonthsWithActual = useMemo(() => {
    return summaryMonths.filter((m) => m.actual?.nsr?.has_data);
  }, [summaryMonths]);

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

  const sumDoreMetric = useCallback(
    (monthsList: DoreMonthlyData[], metricKey: string, dataType: "actual" | "budget"): number | null => {
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

  const avgDoreMetric = useCallback(
    (monthsList: DoreMonthlyData[], metricKey: string, dataType: "actual" | "budget"): number | null => {
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

  const sumNSRMetric = useCallback(
    (monthsList: MonthlyReport[], metricKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let hasAny = false;
      for (const m of monthsList) {
        const data = m[dataType]?.nsr;
        if (data?.has_data && typeof (data as unknown as Record<string, number>)[metricKey] === "number") {
          sum += (data as unknown as Record<string, number>)[metricKey];
          hasAny = true;
        }
      }
      return hasAny ? sum : null;
    },
    [],
  );

  // Get value from the correct source based on section
  const getMetricValue = useCallback(
    (
      metric: { key: string; section: string },
      targetDoreMonths: DoreMonthlyData[],
      targetSummaryMonths: MonthlyReport[],
      dataType: "actual" | "budget",
      isAllPeriod: boolean,
    ): number | null => {
      const isAvgMetric = AVERAGE_METRICS.includes(metric.key);

      if (metric.section === "dore") {
        if (isAllPeriod) {
          return isAvgMetric
            ? avgDoreMetric(targetDoreMonths, metric.key, dataType)
            : sumDoreMetric(targetDoreMonths, metric.key, dataType);
        }
        const monthData = targetDoreMonths[0];
        return monthData?.[dataType]?.has_data
          ? (monthData[dataType] as unknown as Record<string, number>)[metric.key]
          : null;
      }

      // Get from NSR section in Summary data
      if (targetSummaryMonths.length === 0) return null;

      if (isAllPeriod) {
        return sumNSRMetric(targetSummaryMonths, metric.key, dataType);
      }

      const monthData = targetSummaryMonths[0];
      const nsrData = monthData?.[dataType]?.nsr;
      return nsrData?.has_data ? (nsrData as unknown as Record<string, number>)[metric.key] : null;
    },
    [avgDoreMetric, sumDoreMetric, sumNSRMetric],
  );

  // Build table rows
  const tableRows = useMemo(() => {
    const isAllPeriod = selectedPeriod === "all";
    const targetDoreMonths = isAllPeriod ? monthsWithActual : months.filter((m) => m.month === selectedPeriod);
    const targetSummaryMonths = isAllPeriod
      ? summaryMonthsWithActual
      : summaryMonths.filter((m) => m.month === selectedPeriod);

    if (targetDoreMonths.length === 0 && targetSummaryMonths.length === 0) return [];

    const rows: TableRow[] = [];

    // Filter categories based on company configuration
    const filteredCategories = filterCategoriesByConfig(DORE_CATEGORY_CONFIG, companyConfig);

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
        const actualValue = getMetricValue(metric, targetDoreMonths, targetSummaryMonths, "actual", isAllPeriod);
        const budgetValue = getMetricValue(metric, targetDoreMonths, targetSummaryMonths, "budget", isAllPeriod);

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
        const formatFn = row.isCurrency ? fmtCurr : fmt;
        const numbersMatch = [row.actual, row.budget, row.favUnf].some(
          (v) => v !== null && formatFn(v).toLowerCase().includes(term),
        );
        if (metricMatches || numbersMatch) {
          matchingCategories.add(row.category);
        }
      }
    }

    return tableRows.filter((row) => {
      if (row.isHeader) return matchingCategories.has(row.category);
      const metricMatches = row.metric.toLowerCase().includes(term);
      const formatFn = row.isCurrency ? fmtCurr : fmt;
      const numbersMatch = [row.actual, row.budget, row.favUnf].some(
        (v) => v !== null && formatFn(v).toLowerCase().includes(term),
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
            <CardTitle className="text-base">Dore - Detailed Table</CardTitle>
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
                <th className="sticky left-0 min-w-[250px] bg-muted/30 px-3 py-2 text-left font-semibold">Metric</th>
                <th
                  colSpan={4}
                  className="border-l bg-blue-50/50 px-2 py-1 text-center font-semibold dark:bg-blue-950/20"
                >
                  <div className="text-xs">{isAllPeriod ? `Accumulated (${periodLabel})` : periodLabel}</div>
                </th>
              </tr>
              <tr className="border-b bg-muted/20">
                <th className="sticky left-0 bg-muted/20 px-3 py-1.5 text-left font-medium text-[10px] text-muted-foreground" />
                <th className="min-w-[100px] border-l px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 font-medium text-[10px]"
                    onClick={() => handleSort("actual")}
                  >
                    Actual <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="min-w-[100px] px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 font-medium text-[10px]"
                    onClick={() => handleSort("budget")}
                  >
                    Budget <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="min-w-[90px] px-2 py-1.5 text-right">
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
