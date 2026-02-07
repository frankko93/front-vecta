"use client";

import { useCallback, useMemo, useState } from "react";

import { ArrowUpDown, ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CompanyConfig, OPEXMonthlyData, OPEXReport, SummaryReport } from "@/lib/api/types";
import { filterCategoriesByConfig } from "@/lib/company-config";

interface DetailedOPEXViewProps {
  report: OPEXReport;
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

// Format currency
function fmtCurr(v: number | undefined | null): string {
  if (v === undefined || v === null) return "-";
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// Format number
function _fmt(v: number | undefined | null): string {
  if (v === undefined || v === null) return "-";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
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
    source: "direct" | "subcategory"; // direct = from OPEXActual, subcategory = from by_subcategory
    isCurrency?: boolean;
    isSubtotal?: boolean;
  }[];
}

// OPEX Category configuration matching the Excel structure
// Mapping subcategory names to their parent categories based on naming patterns
const OPEX_CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: "cost_center_summary",
    title: "PBR Costs by Cost Center",
    metrics: [
      { key: "mine", label: "Costs - Mine", source: "direct", isCurrency: true },
      { key: "processing", label: "Costs - Processing", source: "direct", isCurrency: true },
      { key: "ga", label: "Costs - G&A", source: "direct", isCurrency: true },
      { key: "transport_shipping", label: "Transport & Shipping", source: "direct", isCurrency: true },
      { key: "inventory_variations", label: "Inventory Variations", source: "direct", isCurrency: true },
      { key: "total", label: "Production based Costs", source: "direct", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "expense_type",
    title: "PBR Costs by Expense Type",
    metrics: [
      { key: "Labour", label: "Labour and Benefits", source: "expense_type", isCurrency: true },
      { key: "Materials", label: "Materials", source: "expense_type", isCurrency: true },
      { key: "Third Party", label: "Third Party", source: "expense_type", isCurrency: true },
      { key: "Other", label: "Other Expenses", source: "expense_type", isCurrency: true },
    ],
  },
  {
    key: "mine_detail",
    title: "Mine - Detail",
    metrics: [
      { key: "Drilling", label: "Drilling", source: "subcategory", isCurrency: true },
      { key: "Blasting", label: "Blasting", source: "subcategory", isCurrency: true },
      { key: "Loading", label: "Loading", source: "subcategory", isCurrency: true },
      { key: "Hauling", label: "Hauling", source: "subcategory", isCurrency: true },
      { key: "Ground Support", label: "Ground Support", source: "subcategory", isCurrency: true },
      { key: "Mine Services", label: "Mine Services", source: "subcategory", isCurrency: true },
      { key: "Mine Geology", label: "Mine Geology", source: "subcategory", isCurrency: true },
      { key: "Mine Engineering", label: "Mine Engineering", source: "subcategory", isCurrency: true },
      { key: "Mine Maintenance", label: "Mine Maintenance", source: "subcategory", isCurrency: true },
      { key: "General Operating", label: "General Operating", source: "subcategory", isCurrency: true },
      { key: "mine", label: "Mine Total", source: "direct", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "processing_detail",
    title: "Processing - Detail",
    metrics: [
      { key: "CO General Operating", label: "CO General Operating", source: "subcategory", isCurrency: true },
      { key: "CO Primary Crushing", label: "CO Primary Crushing", source: "subcategory", isCurrency: true },
      {
        key: "CO Grinding and Classifying",
        label: "CO Grinding and Classifying",
        source: "subcategory",
        isCurrency: true,
      },
      {
        key: "CO Regrinding and Flotation",
        label: "CO Regrinding and Flotation",
        source: "subcategory",
        isCurrency: true,
      },
      {
        key: "CO Thickening and Filtering",
        label: "CO Thickening and Filtering",
        source: "subcategory",
        isCurrency: true,
      },
      { key: "CO Tailing Disposal", label: "CO Tailing Disposal", source: "subcategory", isCurrency: true },
      { key: "CO Water Treatment", label: "CO Water Treatment", source: "subcategory", isCurrency: true },
      { key: "CO Sampling and Assaying", label: "CO Sampling and Assaying", source: "subcategory", isCurrency: true },
      { key: "CO Plant Maintenance", label: "CO Plant Maintenance", source: "subcategory", isCurrency: true },
      { key: "PR Leaching", label: "PR Leaching", source: "subcategory", isCurrency: true },
      { key: "PR Refining", label: "PR Refining", source: "subcategory", isCurrency: true },
      { key: "processing", label: "Plant Total", source: "direct", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "ga_detail",
    title: "G&A - Detail",
    metrics: [
      { key: "General Administration", label: "General Administration", source: "subcategory", isCurrency: true },
      {
        key: "Maintenance Shops (Overhead)",
        label: "Maintenance Shops (Overhead)",
        source: "subcategory",
        isCurrency: true,
      },
      {
        key: "Self generated installed power static",
        label: "Self Generated Power",
        source: "subcategory",
        isCurrency: true,
      },
      { key: "Warehouse", label: "Warehouse", source: "subcategory", isCurrency: true },
      { key: "Purchasing", label: "Purchasing", source: "subcategory", isCurrency: true },
      { key: "Safety", label: "Safety", source: "subcategory", isCurrency: true },
      { key: "Security", label: "Security", source: "subcategory", isCurrency: true },
      { key: "Legal", label: "Legal", source: "subcategory", isCurrency: true },
      { key: "Environmental Services", label: "Environmental Services", source: "subcategory", isCurrency: true },
      { key: "Camp", label: "Camp", source: "subcategory", isCurrency: true },
      {
        key: "Public Community Relations",
        label: "Public Community Relations",
        source: "subcategory",
        isCurrency: true,
      },
      { key: "Human Resources", label: "Human Resources", source: "subcategory", isCurrency: true },
      {
        key: "New Business / Project Development",
        label: "New Business / Project Dev",
        source: "subcategory",
        isCurrency: true,
      },
      { key: "Financings & Cost", label: "Financings & Cost", source: "subcategory", isCurrency: true },
      { key: "Information Systems", label: "Information Systems", source: "subcategory", isCurrency: true },
      { key: "Contract Administration", label: "Contract Administration", source: "subcategory", isCurrency: true },
      { key: "Other Indirect", label: "Other Indirect", source: "subcategory", isCurrency: true },
      { key: "PAS Corporate", label: "PAS Corporate", source: "subcategory", isCurrency: true },
      { key: "ga", label: "G&A Total", source: "direct", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "transport_detail",
    title: "Transport & Shipping",
    metrics: [
      {
        key: "transport_shipping",
        label: "Transport & Shipping",
        source: "direct",
        isCurrency: true,
        isSubtotal: true,
      },
    ],
  },
  {
    key: "inventory_detail",
    title: "Inventory Variations",
    metrics: [
      { key: "Stockpile/WIP", label: "Stockpile/WIP", source: "subcategory", isCurrency: true },
      {
        key: "inventory_variations",
        label: "Inventory Variations Total",
        source: "direct",
        isCurrency: true,
        isSubtotal: true,
      },
    ],
  },
];

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function DetailedOPEXView({ report, summaryReport: _summaryReport }: DetailedOPEXViewProps) {
  // Filter months that have data
  const monthsWithData = useMemo(() => {
    return report.months.filter((m) => (m.actual?.has_data ?? false) || (m.budget?.has_data ?? false));
  }, [report.months]);

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
      <OPEXCharts months={monthsWithData} />

      {/* Table Section */}
      <OPEXTable months={monthsWithData} allMonths={report.months} companyConfig={report.config} />
    </div>
  );
}

// ==================== Charts Component ====================

function OPEXCharts({ months }: { months: OPEXMonthlyData[] }) {
  // Prepare chart data
  const chartData = useMemo(() => {
    return months.map((m) => ({
      month: fmtMonth(m.month),
      mine_actual: m.actual?.mine ?? 0,
      mine_budget: m.budget?.mine ?? 0,
      processing_actual: m.actual?.processing ?? 0,
      processing_budget: m.budget?.processing ?? 0,
      ga_actual: m.actual?.ga ?? 0,
      ga_budget: m.budget?.ga ?? 0,
      transport_actual: m.actual?.transport_shipping ?? 0,
      inventory_actual: m.actual?.inventory_variations ?? 0,
      total_actual: m.actual?.total ?? 0,
      total_budget: m.budget?.total ?? 0,
    }));
  }, [months]);

  // Calculate totals for summary cards
  const totals = useMemo(() => {
    const sum = (key: keyof OPEXMonthlyData["actual"]) =>
      months.reduce((acc, m) => acc + ((m.actual?.[key] as number) ?? 0), 0);
    const sumBudget = (key: keyof OPEXMonthlyData["budget"]) =>
      months.reduce((acc, m) => acc + ((m.budget?.[key] as number) ?? 0), 0);

    return {
      total: { actual: sum("total"), budget: sumBudget("total") },
      mine: { actual: sum("mine"), budget: sumBudget("mine") },
      processing: { actual: sum("processing"), budget: sumBudget("processing") },
      ga: { actual: sum("ga"), budget: sumBudget("ga") },
      transport: { actual: sum("transport_shipping"), budget: sumBudget("transport_shipping") },
    };
  }, [months]);

  // Pie chart data
  const pieData = useMemo(() => {
    return [
      { name: "Mine", value: totals.mine.actual, color: CHART_COLORS[0] },
      { name: "Processing", value: totals.processing.actual, color: CHART_COLORS[1] },
      { name: "G&A", value: totals.ga.actual, color: CHART_COLORS[2] },
      { name: "Transport", value: totals.transport.actual, color: CHART_COLORS[3] },
    ].filter((d) => d.value > 0);
  }, [totals]);

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard title="Total OPEX" actual={totals.total.actual} budget={totals.total.budget} invertColors />
        <SummaryCard title="Mine" actual={totals.mine.actual} budget={totals.mine.budget} invertColors />
        <SummaryCard
          title="Processing"
          actual={totals.processing.actual}
          budget={totals.processing.budget}
          invertColors
        />
        <SummaryCard title="G&A" actual={totals.ga.actual} budget={totals.ga.budget} invertColors />
        <SummaryCard title="Transport" actual={totals.transport.actual} budget={totals.transport.budget} invertColors />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Stacked Bar Chart - OPEX by Cost Center */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">OPEX by Cost Center</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => fmtCurr(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="mine_actual" stackId="a" fill={CHART_COLORS[0]} name="Mine" />
                <Bar dataKey="processing_actual" stackId="a" fill={CHART_COLORS[1]} name="Processing" />
                <Bar dataKey="ga_actual" stackId="a" fill={CHART_COLORS[2]} name="G&A" />
                <Bar dataKey="transport_actual" stackId="a" fill={CHART_COLORS[3]} name="Transport" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cost Center Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name ?? entry.color} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtCurr(v)} contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Total OPEX Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total OPEX: Actual vs Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => fmtCurr(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="total_actual"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey="total_budget"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4"
                  dot={false}
                  name="Budget"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Center Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cost Center: Actual vs Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => fmtCurr(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="mine_actual" fill={CHART_COLORS[0]} name="Mine Act" />
                <Bar dataKey="mine_budget" fill="#93c5fd" name="Mine Bdg" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Summary Card Component (costs - inverted colors)
function SummaryCard({
  title,
  actual,
  budget,
  invertColors = false,
}: {
  title: string;
  actual: number;
  budget: number;
  invertColors?: boolean;
}) {
  const variance = actual - budget;
  const variancePct = budget !== 0 ? ((actual - budget) / Math.abs(budget)) * 100 : null;
  // For costs, under budget (negative variance) is good
  const isPositive = invertColors ? variance <= 0 : variance >= 0;

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="mb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="font-bold text-lg tabular-nums">{fmtCurr(actual)}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Bdg: {fmtCurr(budget)}</span>
          {variancePct !== null && (
            <span className={`font-medium text-[10px] ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {variance >= 0 ? "+" : ""}
              {variancePct.toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Table Component ====================

function OPEXTable({
  months,
  allMonths,
  companyConfig,
}: {
  months: OPEXMonthlyData[];
  allMonths: OPEXMonthlyData[];
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
    return allMonths.map((m) => ({
      value: m.month,
      label: fmtMonthLong(m.month),
      hasActual: m.actual?.has_data ?? false,
      hasBudget: m.budget?.has_data ?? false,
    }));
  }, [allMonths]);

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

  const sumOPEXMetric = useCallback(
    (monthsList: OPEXMonthlyData[], metricKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let hasAny = false;
      for (const m of monthsList) {
        const data = m[dataType];
        if (data?.has_data && typeof (data as Record<string, unknown>)[metricKey] === "number") {
          sum += (data as Record<string, unknown>)[metricKey];
          hasAny = true;
        }
      }
      return hasAny ? sum : null;
    },
    [],
  );

  const sumSubcategoryMetric = useCallback(
    (monthsList: OPEXMonthlyData[], subcategoryKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let hasAny = false;
      for (const m of monthsList) {
        const data = m[dataType];
        if (data?.has_data) {
          const value = data.by_subcategory?.[subcategoryKey];
          if (typeof value === "number") {
            sum += value;
            hasAny = true;
          }
        }
      }
      return hasAny ? sum : null;
    },
    [],
  );

  const sumExpenseTypeMetric = useCallback(
    (monthsList: OPEXMonthlyData[], expenseTypeKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let hasAny = false;
      for (const m of monthsList) {
        const data = m[dataType];
        if (data?.has_data) {
          const value = data.by_expense_type?.[expenseTypeKey];
          if (typeof value === "number") {
            sum += value;
            hasAny = true;
          }
        }
      }
      return hasAny ? sum : null;
    },
    [],
  );

  // Get value from the correct source (stable ref for useMemo deps)
  const getMetricValue = useCallback(
    (
      metric: { key: string; source: string },
      targetMonths: OPEXMonthlyData[],
      dataType: "actual" | "budget",
      isAllPeriod: boolean,
    ): number | null => {
      if (metric.source === "direct") {
        if (isAllPeriod) {
          return sumOPEXMetric(targetMonths, metric.key, dataType);
        }
        const monthData = targetMonths[0];
        return monthData?.[dataType]?.has_data ? (monthData[dataType] as Record<string, unknown>)[metric.key] : null;
      }

      if (metric.source === "expense_type") {
        if (isAllPeriod) {
          return sumExpenseTypeMetric(targetMonths, metric.key, dataType);
        }
        const monthData = targetMonths[0];
        return monthData?.[dataType]?.by_expense_type?.[metric.key] ?? null;
      }

      if (isAllPeriod) {
        return sumSubcategoryMetric(targetMonths, metric.key, dataType);
      }

      const monthData = targetMonths[0];
      return monthData?.[dataType]?.by_subcategory?.[metric.key] ?? null;
    },
    [sumExpenseTypeMetric, sumOPEXMetric, sumSubcategoryMetric],
  );

  // Build table rows
  const tableRows = useMemo(() => {
    const isAllPeriod = selectedPeriod === "all";
    const targetMonths = isAllPeriod ? monthsWithActual : allMonths.filter((m) => m.month === selectedPeriod);

    if (targetMonths.length === 0) return [];

    const rows: TableRow[] = [];

    // Filter categories based on company configuration
    const filteredCategories = filterCategoriesByConfig(OPEX_CATEGORY_CONFIG, companyConfig);

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
        isCurrency: true,
        isHeader: true,
        isSubtotal: false,
      });

      for (const metric of category.metrics) {
        const actualValue = getMetricValue(metric, targetMonths, "actual", isAllPeriod);
        const budgetValue = getMetricValue(metric, targetMonths, "budget", isAllPeriod);

        // For costs, negative variance (under budget) is favorable
        const favUnf = actualValue !== null && budgetValue !== null ? budgetValue - actualValue : null;
        const variance =
          actualValue !== null && budgetValue !== null && budgetValue !== 0
            ? ((budgetValue - actualValue) / Math.abs(budgetValue)) * 100
            : null;

        rows.push({
          id: `${category.key}-${metric.key}`,
          category: category.key,
          metric: metric.label,
          actual: actualValue,
          budget: budgetValue,
          favUnf,
          variance,
          isCurrency: metric.isCurrency || true,
          isHeader: false,
          isSubtotal: metric.isSubtotal || false,
        });
      }
    }

    return rows;
  }, [selectedPeriod, monthsWithActual, allMonths, companyConfig, getMetricValue]);

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return tableRows;
    const term = searchTerm.toLowerCase();

    const matchingCategories = new Set<string>();
    for (const row of tableRows) {
      if (!row.isHeader) {
        const metricMatches = row.metric.toLowerCase().includes(term);
        const numbersMatch = [row.actual, row.budget, row.favUnf].some(
          (v) => v !== null && fmtCurr(v).toLowerCase().includes(term),
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
        (v) => v !== null && fmtCurr(v).toLowerCase().includes(term),
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

  const formatValue = (value: number | null): string => {
    if (value === null) return "-";
    return fmtCurr(value);
  };

  // For costs, show favorable (positive favUnf) in green, unfavorable (negative) in red
  const formatFavUnf = (value: number | null): string => {
    if (value === null) return "-";
    const absValue = Math.abs(value);
    const formatted = fmtCurr(absValue);
    return value < 0 ? `(${formatted})` : formatted;
  };

  const formatVariance = (value: number | null): string => {
    if (value === null) return "-";
    return `${value.toFixed(0)}%`;
  };

  const getVarianceColor = (value: number | null): string => {
    if (value === null) return "";
    // For costs, positive variance (under budget) is good
    return value >= 0 ? "text-emerald-600" : "text-rose-600";
  };

  const isAllPeriod = selectedPeriod === "all";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">OPEX - Detailed Table</CardTitle>
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
                <th className="sticky left-0 min-w-[250px] bg-muted/30 px-3 py-2 text-left font-semibold">Cost Item</th>
                <th
                  colSpan={4}
                  className="border-l bg-orange-50/50 px-2 py-1 text-center font-semibold dark:bg-orange-950/20"
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
                    <td className="border-l px-2 py-1.5 text-right tabular-nums">{formatValue(row.actual)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatValue(row.budget)}</td>
                    <td className={`px-2 py-1.5 text-right tabular-nums ${getVarianceColor(row.favUnf)}`}>
                      {formatFavUnf(row.favUnf)}
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
          <div className="py-8 text-center text-muted-foreground text-sm">No items found matching the search</div>
        )}
      </CardContent>
    </Card>
  );
}
