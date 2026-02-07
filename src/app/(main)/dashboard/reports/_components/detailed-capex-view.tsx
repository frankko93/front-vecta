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
import type { CAPEXMonthlyData, CAPEXReport, CompanyConfig } from "@/lib/api/types";
import { filterCategoriesByConfig } from "@/lib/company-config";

interface DetailedCAPEXViewProps {
  report: CAPEXReport;
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
    source: "direct" | "category" | "project"; // direct = from CAPEXActual, category/project = from breakdowns
    isCurrency?: boolean;
    isSubtotal?: boolean;
  }[];
}

// CAPEX Category configuration matching the Excel structure
const CAPEX_CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: "type_summary",
    title: "CAPEX by Type",
    metrics: [
      { key: "sustaining", label: "Sustaining Capital", source: "direct", isCurrency: true },
      { key: "project", label: "Project Capital", source: "direct", isCurrency: true },
      { key: "leasing", label: "Leasing", source: "direct", isCurrency: true },
      {
        key: "accretion_of_mine_closure_liability",
        label: "Accretion of Mine Closure Liability",
        source: "direct",
        isCurrency: true,
      },
      { key: "total", label: "Total CAPEX", source: "direct", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "sustaining_capital",
    title: "Sustaining Capital (PBR)",
    metrics: [
      {
        key: "Pre-Stripping and Capital Developments",
        label: "Pre-Stripping and Capital Developments",
        source: "category",
        isCurrency: true,
      },
      { key: "Exploration/Mine Geology", label: "Exploration/Mine Geology", source: "category", isCurrency: true },
      { key: "Mine Equipment", label: "Mine Equipment", source: "category", isCurrency: true },
      { key: "Mine Infrastructure", label: "Mine Infrastructure", source: "category", isCurrency: true },
      {
        key: "Tailings Dams and Leach Pads",
        label: "Tailings Dams and Leach Pads",
        source: "category",
        isCurrency: true,
      },
      { key: "Plant Upgrades", label: "Plant Upgrades", source: "category", isCurrency: true },
      { key: "Site Infrastructure", label: "Site Infrastructure", source: "category", isCurrency: true },
      { key: "Administration Projects", label: "Administration Projects", source: "category", isCurrency: true },
      { key: "Community Projects", label: "Community Projects", source: "category", isCurrency: true },
      {
        key: "Right-of-Use Asset (IFRS16)",
        label: "Right-of-Use Asset (IFRS16)",
        source: "category",
        isCurrency: true,
      },
      { key: "sustaining", label: "Total Sustaining Capital", source: "direct", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "mppe_reconciliation",
    title: "MPPE Additions to Sustaining Capital Reconciliation",
    metrics: [
      { key: "Total MPPE Additions", label: "Total MPPE Additions", source: "category", isCurrency: true },
      { key: "Project Capital", label: "Project Capital", source: "category", isCurrency: true },
      {
        key: "Leasing Addition - Project Capital",
        label: "Leasing Addition - Project Capital",
        source: "category",
        isCurrency: true,
      },
      { key: "Other", label: "Other", source: "category", isCurrency: true },
      { key: "Sustaining MPPE Additions", label: "Sustaining MPPE Additions", source: "category", isCurrency: true },
      {
        key: "Leasing Addition - Sustaining Capital",
        label: "Leasing Addition - Sustaining Capital",
        source: "category",
        isCurrency: true,
      },
      {
        key: "Sustaining Capital Lease Cash Outflows",
        label: "Sustaining Capital Lease Cash Outflows",
        source: "category",
        isCurrency: true,
      },
    ],
  },
  {
    key: "mppe_accounting",
    title: "MPPE Additions (Accounting) - Projects",
    metrics: [
      { key: "C487EY21001 - CAPEX EXPLORACIONES", label: "CAPEX EXPLORACIONES", source: "project", isCurrency: true },
      { key: "C487MY25001", label: "Reemplazo unidad rotación Diamec 303", source: "project", isCurrency: true },
      { key: "C487MY25002", label: "Sistema Anticolisión", source: "project", isCurrency: true },
      {
        key: "C487MY25003",
        label: "Mantenimiento (mecanico) Baldes, Over hauling",
        source: "project",
        isCurrency: true,
      },
      { key: "C487MY25004", label: "Motobomba Dewatering Open Pit", source: "project", isCurrency: true },
      { key: "C487MY25005", label: "Bomba Sumergible", source: "project", isCurrency: true },
      { key: "C487MY25006", label: "Salidas de Emergencia/RB Martina WEST", source: "project", isCurrency: true },
      { key: "C487MY25007", label: "Estaciones de Bombeo", source: "project", isCurrency: true },
      { key: "C487MY25008", label: "Data Infrastructure UG", source: "project", isCurrency: true },
      { key: "C487MY25009", label: "Leaky feeder EPW", source: "project", isCurrency: true },
      { key: "C487MY25010", label: "Ventiladores de mina", source: "project", isCurrency: true },
      { key: "C487PY25001", label: "Upgrade de Planta", source: "project", isCurrency: true },
      { key: "C487AY25001", label: "Ampliación períles de residuos", source: "project", isCurrency: true },
      { key: "C487AY25002", label: "Finalización taller de soldadura", source: "project", isCurrency: true },
      { key: "C487AY25003", label: "Pórtico para Taller Eléctrico y bomba", source: "project", isCurrency: true },
      { key: "C487AY24001", label: "Cerramiento y techo Dep Cianur", source: "project", isCurrency: true },
      { key: "C487AY24005", label: "Refacciones de infraestructura", source: "project", isCurrency: true },
      { key: "C487AY24003", label: "Equipamiento Naty", source: "project", isCurrency: true },
      { key: "C48703300", label: "Mine Development", source: "project", isCurrency: true },
    ],
  },
  {
    key: "capital_lease",
    title: "Capital Lease Cash Outflows",
    metrics: [
      { key: "IFRS16", label: "IFRS16", source: "category", isCurrency: true },
      {
        key: "leasing",
        label: "Total Capital Lease Cash Outflows",
        source: "direct",
        isCurrency: true,
        isSubtotal: true,
      },
    ],
  },
  {
    key: "project_capital_lease",
    title: "Project Capital Lease Cash Outflows",
    metrics: [
      {
        key: "project",
        label: "Total Project Capital Lease Cash Outflows",
        source: "direct",
        isCurrency: true,
        isSubtotal: true,
      },
    ],
  },
];

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function DetailedCAPEXView({ report }: DetailedCAPEXViewProps) {
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
      <CAPEXCharts months={monthsWithData} />

      {/* Table Section */}
      <CAPEXTable months={monthsWithData} allMonths={report.months} companyConfig={report.config} />
    </div>
  );
}

// ==================== Charts Component ====================

function CAPEXCharts({ months }: { months: CAPEXMonthlyData[] }) {
  // Prepare chart data
  const chartData = useMemo(() => {
    return months.map((m) => ({
      month: fmtMonth(m.month),
      sustaining_actual: m.actual?.sustaining ?? 0,
      sustaining_budget: m.budget?.sustaining ?? 0,
      project_actual: m.actual?.project ?? 0,
      project_budget: m.budget?.project ?? 0,
      leasing_actual: m.actual?.leasing ?? 0,
      leasing_budget: m.budget?.leasing ?? 0,
      total_actual: m.actual?.total ?? 0,
      total_budget: m.budget?.total ?? 0,
    }));
  }, [months]);

  // Calculate totals for summary cards
  const totals = useMemo(() => {
    const sum = (key: keyof CAPEXMonthlyData["actual"]) =>
      months.reduce((acc, m) => acc + ((m.actual?.[key] as number) ?? 0), 0);
    const sumBudget = (key: keyof CAPEXMonthlyData["budget"]) =>
      months.reduce((acc, m) => acc + ((m.budget?.[key] as number) ?? 0), 0);

    return {
      total: { actual: sum("total"), budget: sumBudget("total") },
      sustaining: { actual: sum("sustaining"), budget: sumBudget("sustaining") },
      project: { actual: sum("project"), budget: sumBudget("project") },
      leasing: { actual: sum("leasing"), budget: sumBudget("leasing") },
    };
  }, [months]);

  // Pie chart data
  const pieData = useMemo(() => {
    return [
      { name: "Sustaining", value: totals.sustaining.actual, color: CHART_COLORS[0] },
      { name: "Project", value: totals.project.actual, color: CHART_COLORS[1] },
      { name: "Leasing", value: totals.leasing.actual, color: CHART_COLORS[2] },
    ].filter((d) => d.value > 0);
  }, [totals]);

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard title="Total CAPEX" actual={totals.total.actual} budget={totals.total.budget} invertColors />
        <SummaryCard
          title="Sustaining"
          actual={totals.sustaining.actual}
          budget={totals.sustaining.budget}
          invertColors
        />
        <SummaryCard title="Project" actual={totals.project.actual} budget={totals.project.budget} invertColors />
        <SummaryCard title="Leasing" actual={totals.leasing.actual} budget={totals.leasing.budget} invertColors />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Stacked Bar Chart - CAPEX by Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CAPEX by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtCurr(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="sustaining_actual" stackId="a" fill={CHART_COLORS[0]} name="Sustaining" />
                <Bar dataKey="project_actual" stackId="a" fill={CHART_COLORS[1]} name="Project" />
                <Bar dataKey="leasing_actual" stackId="a" fill={CHART_COLORS[2]} name="Leasing" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CAPEX Distribution</CardTitle>
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

        {/* Total CAPEX Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total CAPEX: Actual vs Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtCurr(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="total_actual"
                  stroke="#8b5cf6"
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

        {/* Sustaining vs Budget */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sustaining Capital: Actual vs Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtCurr(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="sustaining_actual" fill={CHART_COLORS[0]} name="Actual" />
                <Bar dataKey="sustaining_budget" fill="#93c5fd" name="Budget" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Summary Card Component (CAPEX - inverted colors, under budget is good)
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
  // For CAPEX, under budget (negative variance) is good
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

function CAPEXTable({
  months,
  allMonths,
  companyConfig,
}: {
  months: CAPEXMonthlyData[];
  allMonths: CAPEXMonthlyData[];
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

  const sumCAPEXMetric = useCallback(
    (monthsList: CAPEXMonthlyData[], metricKey: string, dataType: "actual" | "budget"): number | null => {
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

  const sumCategoryMetric = useCallback(
    (monthsList: CAPEXMonthlyData[], categoryKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let hasAny = false;
      for (const m of monthsList) {
        const data = m[dataType];
        if (data?.has_data) {
          const value = data.by_category?.[categoryKey];
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

  const sumProjectMetric = useCallback(
    (monthsList: CAPEXMonthlyData[], projectKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let hasAny = false;
      for (const m of monthsList) {
        const data = m[dataType];
        if (data?.has_data) {
          const value = data.by_project?.[projectKey];
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
      targetMonths: CAPEXMonthlyData[],
      dataType: "actual" | "budget",
      isAllPeriod: boolean,
    ): number | null => {
      if (metric.source === "direct") {
        if (isAllPeriod) {
          return sumCAPEXMetric(targetMonths, metric.key, dataType);
        }
        const monthData = targetMonths[0];
        return monthData?.[dataType]?.has_data ? (monthData[dataType] as Record<string, unknown>)[metric.key] : null;
      }

      if (metric.source === "category") {
        if (isAllPeriod) {
          return sumCategoryMetric(targetMonths, metric.key, dataType);
        }
        const monthData = targetMonths[0];
        return monthData?.[dataType]?.by_category?.[metric.key] ?? null;
      }

      // Get from project (source === "project")
      if (isAllPeriod) {
        return sumProjectMetric(targetMonths, metric.key, dataType);
      }

      const monthData = targetMonths[0];
      return monthData?.[dataType]?.by_project?.[metric.key] ?? null;
    },
    [sumCAPEXMetric, sumCategoryMetric, sumProjectMetric],
  );

  // Build table rows
  const tableRows = useMemo(() => {
    const isAllPeriod = selectedPeriod === "all";
    const targetMonths = isAllPeriod ? monthsWithActual : allMonths.filter((m) => m.month === selectedPeriod);

    if (targetMonths.length === 0) return [];

    const rows: TableRow[] = [];

    // Filter categories based on company configuration
    const filteredCategories = filterCategoriesByConfig(CAPEX_CATEGORY_CONFIG, companyConfig);

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

        // For CAPEX, negative variance (under budget) is favorable
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

  // For CAPEX, show favorable (positive favUnf = under budget) in green
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
    // For CAPEX, positive variance (under budget) is good
    return value >= 0 ? "text-emerald-600" : "text-rose-600";
  };

  const isAllPeriod = selectedPeriod === "all";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">CAPEX - Detailed Table</CardTitle>
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
                placeholder="Search item or value..."
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
                <th className="sticky left-0 min-w-[280px] bg-muted/30 px-3 py-2 text-left font-semibold">Item</th>
                <th
                  colSpan={4}
                  className="border-l bg-purple-50/50 px-2 py-1 text-center font-semibold dark:bg-purple-950/20"
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
