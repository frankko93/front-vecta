"use client";

import { useCallback, useMemo, useState } from "react";

import { ArrowUpDown, ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCAPEXReport, useDoreReport, useOPEXReport, usePBRReport } from "@/hooks/use-reports";
import type {
  CompanyConfig,
  MonthlyReport,
  MonthlyVariance,
  SummaryReport,
  SummaryReportParams,
} from "@/lib/api/types";
import { filterCategoriesByConfig, getMineralsDisplay, getMiningTypeLabel } from "@/lib/company-config";

import { DetailedCAPEXView } from "./detailed-capex-view";
import { DetailedDoreView } from "./detailed-dore-view";
import { DetailedOPEXView } from "./detailed-opex-view";
import { DetailedPBRView } from "./detailed-pbr-view";

interface SummaryReportViewProps {
  report: SummaryReport | undefined;
  isLoading: boolean;
  error: Error | null;
  params: SummaryReportParams | null;
}

function fmtMonth(m: string): string {
  const [y, month] = m.split("-");
  return new Date(parseInt(y, 10), parseInt(month, 10) - 1).toLocaleDateString("es", { month: "short" });
}

function fmtMonthLong(m: string): string {
  const [y, month] = m.split("-");
  return new Date(parseInt(y, 10), parseInt(month, 10) - 1).toLocaleDateString("es", { month: "long" });
}

function getFieldFormat(fieldName: string, section?: string): { unit: string | undefined; isCurrency: boolean } {
  const currencySections = ["costs", "nsr", "capex", "cash_cost"];
  const currencyFields = ["cost", "nsr", "capex", "flow", "margin", "credit", "price", "revenue", "aisc", "cash_cost"];

  const isCurrencyField =
    (section && currencySections.includes(section)) ||
    currencyFields.some((cf) => fieldName.toLowerCase().includes(cf));

  if (isCurrencyField && (fieldName.includes("per_oz") || fieldName.includes("cost") || fieldName.includes("price"))) {
    if (fieldName.endsWith("_oz")) return { unit: "/oz", isCurrency: true };
    return { unit: undefined, isCurrency: true };
  }

  if (fieldName.endsWith("_t")) return { unit: "t", isCurrency: false };
  if (fieldName.endsWith("_oz")) return { unit: "oz", isCurrency: false };
  if (fieldName.endsWith("_gpt")) return { unit: "g/t", isCurrency: false };
  if (fieldName.endsWith("_pct")) return { unit: "%", isCurrency: false };
  if (fieldName.endsWith("_m")) return { unit: "m", isCurrency: false };

  if (isCurrencyField) return { unit: undefined, isCurrency: true };

  return { unit: undefined, isCurrency: false };
}

function fmt(v: number | undefined, hasData = true): string {
  if (!hasData || v === undefined || v === null) return "-";
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtCurr(v: number | undefined, hasData = true): string {
  if (!hasData || v === undefined || v === null) return "-";
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtValue(
  value: number | undefined,
  fieldName: string,
  section?: string,
  hasData = true,
): { formatted: string; unit: string | undefined } {
  if (!hasData || value === undefined || value === null) {
    return { formatted: "-", unit: undefined };
  }

  const { unit, isCurrency } = getFieldFormat(fieldName, section);
  const formatted = isCurrency ? fmtCurr(value, hasData) : fmt(value, hasData);

  return { formatted, unit: unit || undefined };
}

function calcVar(a: number, b: number, aHas: boolean, bHas: boolean): number | null {
  if (!aHas || !bHas || b === 0) return null;
  return ((a - b) / b) * 100;
}

function _getVariance(month: MonthlyReport, section: keyof MonthlyVariance, metric: string): number | null {
  if (!month.actual || !month.budget) return null;

  const actualHas = (month.actual[section] as Record<string, unknown>)?.has_data;
  const budgetHas = (month.budget[section] as Record<string, unknown>)?.has_data;

  if (!actualHas && !budgetHas) return null;

  if (month.variance?.[section]?.[metric]?.variance_pct !== undefined) {
    if (actualHas && budgetHas) {
      return month.variance[section][metric].variance_pct;
    }
    return null;
  }

  if (!actualHas || !budgetHas) return null;

  const actual = (month.actual[section] as Record<string, unknown>)?.[metric];
  const budget = (month.budget[section] as Record<string, unknown>)?.[metric];

  if (typeof actual !== "number" || typeof budget !== "number") return null;

  return calcVar(actual, budget, actualHas, budgetHas);
}

function calcTotals(months: MonthlyReport[]) {
  const t = {
    a: { ag: 0, au: 0, cost: 0, nsr: 0, capex: 0, flow: 0, ore: 0 },
    b: { ag: 0, au: 0, cost: 0, nsr: 0, capex: 0, flow: 0, ore: 0 },
  };
  months.forEach((m) => {
    if (!m.actual || !m.budget) return;

    if (
      m.actual.mining.has_data &&
      m.budget.mining.has_data &&
      typeof m.actual.mining.ore_mined_t === "number" &&
      typeof m.budget.mining.ore_mined_t === "number"
    ) {
      t.a.ore += m.actual.mining.ore_mined_t;
      t.b.ore += m.budget.mining.ore_mined_t;
    }

    if (m.actual.production.has_data && m.budget.production.has_data) {
      if (
        typeof m.actual.production.total_production_silver_oz === "number" &&
        typeof m.budget.production.total_production_silver_oz === "number"
      ) {
        t.a.ag += m.actual.production.total_production_silver_oz;
        t.b.ag += m.budget.production.total_production_silver_oz;
      }
      if (
        typeof m.actual.production.total_production_gold_oz === "number" &&
        typeof m.budget.production.total_production_gold_oz === "number"
      ) {
        t.a.au += m.actual.production.total_production_gold_oz;
        t.b.au += m.budget.production.total_production_gold_oz;
      }
    }

    if (
      m.actual.costs.has_data &&
      m.budget.costs.has_data &&
      typeof m.actual.costs.production_based_costs === "number" &&
      typeof m.budget.costs.production_based_costs === "number"
    ) {
      t.a.cost += m.actual.costs.production_based_costs;
      t.b.cost += m.budget.costs.production_based_costs;
    }

    if (
      m.actual.nsr.has_data &&
      m.budget.nsr.has_data &&
      typeof m.actual.nsr.net_smelter_return === "number" &&
      typeof m.budget.nsr.net_smelter_return === "number"
    ) {
      t.a.nsr += m.actual.nsr.net_smelter_return;
      t.b.nsr += m.budget.nsr.net_smelter_return;
    }

    if (m.actual.capex.has_data && m.budget.capex.has_data) {
      if (typeof m.actual.capex.total === "number" && typeof m.budget.capex.total === "number") {
        t.a.capex += m.actual.capex.total;
        t.b.capex += m.budget.capex.total;
      }
      if (
        typeof m.actual.capex.pbr_net_cash_flow === "number" &&
        typeof m.budget.capex.pbr_net_cash_flow === "number"
      ) {
        t.a.flow += m.actual.capex.pbr_net_cash_flow;
        t.b.flow += m.budget.capex.pbr_net_cash_flow;
      }
    }
  });
  return t;
}

export function SummaryReportView({ report, isLoading, error, params }: SummaryReportViewProps) {
  const { report: pbrReport } = usePBRReport(params);
  const { report: doreReport } = useDoreReport(params);
  const { report: opexReport } = useOPEXReport(params);
  const { report: capexReport } = useCAPEXReport(params);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error) {
    const apiError = error as { response?: { data?: { error?: string; details?: unknown } } };
    const hasValidationDetails =
      apiError?.response?.data?.error === "validation failed" && apiError?.response?.data?.details;

    return (
      <Alert variant="destructive">
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">{error.message}</p>
            {hasValidationDetails && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {apiError.response.data.details.map((detail: { type: string; message: string }) => (
                  <li key={`${detail.type}-${detail.message}`}>
                    <span className="font-medium">{detail.type}:</span> {detail.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!report) return null;

  const totals = calcTotals(report.months);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/10 bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="font-bold text-lg text-primary">{report.company_name.charAt(0)}</span>
            </div>
            <div>
              <CardTitle className="font-semibold text-lg">{report.company_name}</CardTitle>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-muted-foreground text-sm">{report.year}</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-muted-foreground text-xs">{getMineralsDisplay(report.config)}</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-muted-foreground text-xs">{getMiningTypeLabel(report.config)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="font-normal text-xs">
              {report.months.length} meses
            </Badge>
            {report.coverage?.actual_is_partial && (
              <Badge variant="outline" className="border-orange-300 bg-orange-50 font-normal text-orange-700 text-xs">
                Actual: {report.coverage.actual_months.length} meses
              </Badge>
            )}
            {report.coverage && !report.coverage.has_complete_actual && report.coverage.has_any_actual && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 font-normal text-amber-700 text-xs">
                Datos parciales
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-4 overflow-x-auto lg:grid-cols-8">
            <TabsTrigger value="summary" className="text-xs">
              Resumen
            </TabsTrigger>
            <TabsTrigger value="pbr" className="text-xs">
              PBR
            </TabsTrigger>
            <TabsTrigger value="dore" className="text-xs">
              Dore
            </TabsTrigger>
            <TabsTrigger value="opex" className="text-xs">
              OPEX
            </TabsTrigger>
            <TabsTrigger value="capex" className="text-xs">
              CAPEX
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4 space-y-4">
            {(() => {
              const lastMonthWithYTD = [...report.months]
                .reverse()
                .find((m) => m.ytd?.actual?.production?.has_data && m.ytd?.budget?.production?.has_data);

              if (lastMonthWithYTD?.ytd) {
                const ytd = lastMonthWithYTD.ytd;

                const getYTDVariance = (section: keyof MonthlyVariance, metric: string): number | null => {
                  const actualHas = (ytd.actual[section] as Record<string, unknown>)?.has_data;
                  const budgetHas = (ytd.budget[section] as Record<string, unknown>)?.has_data;

                  if (!actualHas && !budgetHas) return null;

                  if (ytd.variance?.[section]?.[metric]?.variance_pct !== undefined) {
                    if (actualHas && budgetHas) {
                      return ytd.variance[section][metric].variance_pct;
                    }
                    return null;
                  }

                  if (!actualHas || !budgetHas) return null;

                  const actual = (ytd.actual[section] as Record<string, unknown>)?.[metric];
                  const budget = (ytd.budget[section] as Record<string, unknown>)?.[metric];

                  if (typeof actual !== "number" || typeof budget !== "number") return null;

                  return calcVar(actual, budget, actualHas, budgetHas);
                };

                const ytdAgVar = getYTDVariance("production", "total_production_silver_oz");
                const ytdAuVar = getYTDVariance("production", "total_production_gold_oz");
                const ytdCostVar = getYTDVariance("costs", "production_based_costs");
                const ytdNsrVar = getYTDVariance("nsr", "net_smelter_return");
                const ytdCapexVar = getYTDVariance("capex", "total");
                const ytdFlowVar = getYTDVariance("capex", "pbr_net_cash_flow");
                const ytdAiscVar = getYTDVariance("cash_cost", "aisc_per_oz_silver");

                return (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        YTD (Year-to-Date) - {fmtMonthLong(lastMonthWithYTD.month)}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Valores acumulados desde el inicio del año hasta {fmtMonthLong(lastMonthWithYTD.month)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                        {(() => {
                          const silverFmt = fmtValue(
                            ytd.actual.production.total_production_silver_oz,
                            "total_production_silver_oz",
                            "production",
                            ytd.actual.production.has_data,
                          );
                          const silverBudgetFmt = fmtValue(
                            ytd.budget.production.total_production_silver_oz,
                            "total_production_silver_oz",
                            "production",
                            ytd.budget.production.has_data,
                          );
                          return (
                            <Stat
                              label="Plata YTD"
                              value={silverFmt.formatted}
                              budget={silverBudgetFmt.formatted}
                              unit={silverFmt.unit}
                              var={ytdAgVar}
                            />
                          );
                        })()}
                        {(() => {
                          const goldFmt = fmtValue(
                            ytd.actual.production.total_production_gold_oz,
                            "total_production_gold_oz",
                            "production",
                            ytd.actual.production.has_data,
                          );
                          const goldBudgetFmt = fmtValue(
                            ytd.budget.production.total_production_gold_oz,
                            "total_production_gold_oz",
                            "production",
                            ytd.budget.production.has_data,
                          );
                          return (
                            <Stat
                              label="Oro YTD"
                              value={goldFmt.formatted}
                              budget={goldBudgetFmt.formatted}
                              unit={goldFmt.unit}
                              var={ytdAuVar}
                            />
                          );
                        })()}
                        {(() => {
                          const oreFmt = fmtValue(
                            ytd.actual.mining.ore_mined_t,
                            "ore_mined_t",
                            "mining",
                            ytd.actual.mining.has_data,
                          );
                          const oreBudgetFmt = fmtValue(
                            ytd.budget.mining.ore_mined_t,
                            "ore_mined_t",
                            "mining",
                            ytd.budget.mining.has_data,
                          );
                          return (
                            <Stat
                              label="Mineral YTD"
                              value={oreFmt.formatted}
                              budget={oreBudgetFmt.formatted}
                              unit={oreFmt.unit}
                              var={getYTDVariance("mining", "ore_mined_t")}
                            />
                          );
                        })()}
                        {(() => {
                          const tonnesFmt = fmtValue(
                            ytd.actual.processing.total_tonnes_processed,
                            "total_tonnes_processed",
                            "processing",
                            ytd.actual.processing.has_data,
                          );
                          const tonnesBudgetFmt = fmtValue(
                            ytd.budget.processing.total_tonnes_processed,
                            "total_tonnes_processed",
                            "processing",
                            ytd.budget.processing.has_data,
                          );
                          return (
                            <Stat
                              label="Toneladas Proc. YTD"
                              value={tonnesFmt.formatted}
                              budget={tonnesBudgetFmt.formatted}
                              unit={tonnesFmt.unit}
                              var={getYTDVariance("processing", "total_tonnes_processed")}
                            />
                          );
                        })()}
                        {(() => {
                          const costFmt = fmtValue(
                            ytd.actual.costs.production_based_costs,
                            "production_based_costs",
                            "costs",
                            ytd.actual.costs.has_data,
                          );
                          const costBudgetFmt = fmtValue(
                            ytd.budget.costs.production_based_costs,
                            "production_based_costs",
                            "costs",
                            ytd.budget.costs.has_data,
                          );
                          return (
                            <Stat
                              label="Costos YTD"
                              value={costFmt.formatted}
                              budget={costBudgetFmt.formatted}
                              unit={costFmt.unit}
                              var={ytdCostVar}
                            />
                          );
                        })()}
                        {(() => {
                          const nsrFmt = fmtValue(
                            ytd.actual.nsr.net_smelter_return,
                            "net_smelter_return",
                            "nsr",
                            ytd.actual.nsr.has_data,
                          );
                          const nsrBudgetFmt = fmtValue(
                            ytd.budget.nsr.net_smelter_return,
                            "net_smelter_return",
                            "nsr",
                            ytd.budget.nsr.has_data,
                          );
                          return (
                            <Stat
                              label="NSR YTD"
                              value={nsrFmt.formatted}
                              budget={nsrBudgetFmt.formatted}
                              unit={nsrFmt.unit}
                              var={ytdNsrVar}
                            />
                          );
                        })()}
                        {(() => {
                          const capexFmt = fmtValue(
                            ytd.actual.capex.total,
                            "total",
                            "capex",
                            ytd.actual.capex.has_data,
                          );
                          const capexBudgetFmt = fmtValue(
                            ytd.budget.capex.total,
                            "total",
                            "capex",
                            ytd.budget.capex.has_data,
                          );
                          return (
                            <Stat
                              label="CAPEX YTD"
                              value={capexFmt.formatted}
                              budget={capexBudgetFmt.formatted}
                              unit={capexFmt.unit}
                              var={ytdCapexVar}
                            />
                          );
                        })()}
                        {(() => {
                          const flowFmt = fmtValue(
                            ytd.actual.capex.pbr_net_cash_flow,
                            "pbr_net_cash_flow",
                            "capex",
                            ytd.actual.capex.has_data,
                          );
                          const flowBudgetFmt = fmtValue(
                            ytd.budget.capex.pbr_net_cash_flow,
                            "pbr_net_cash_flow",
                            "capex",
                            ytd.budget.capex.has_data,
                          );
                          return (
                            <Stat
                              label="Flujo Neto YTD"
                              value={flowFmt.formatted}
                              budget={flowBudgetFmt.formatted}
                              unit={flowFmt.unit}
                              var={ytdFlowVar}
                            />
                          );
                        })()}
                        {(() => {
                          const aiscFmt = fmtValue(
                            ytd.actual.cash_cost.aisc_per_oz_silver,
                            "aisc_per_oz_silver",
                            "cash_cost",
                            ytd.actual.cash_cost.has_data,
                          );
                          const aiscBudgetFmt = fmtValue(
                            ytd.budget.cash_cost.aisc_per_oz_silver,
                            "aisc_per_oz_silver",
                            "cash_cost",
                            ytd.budget.cash_cost.has_data,
                          );
                          return (
                            <Stat
                              label="AISC/oz YTD"
                              value={aiscFmt.formatted}
                              budget={aiscBudgetFmt.formatted}
                              unit={aiscFmt.unit}
                              var={ytdAiscVar}
                            />
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Stat
                label="Mineral"
                value={fmt(totals.a.ore)}
                budget={fmt(totals.b.ore)}
                unit="t"
                var={calcVar(totals.a.ore, totals.b.ore, true, true)}
              />
              <Stat
                label="Plata"
                value={fmt(totals.a.ag)}
                budget={fmt(totals.b.ag)}
                unit="oz"
                var={calcVar(totals.a.ag, totals.b.ag, true, true)}
              />
              <Stat
                label="Oro"
                value={fmt(totals.a.au)}
                budget={fmt(totals.b.au)}
                unit="oz"
                var={calcVar(totals.a.au, totals.b.au, true, true)}
              />
              <Stat
                label="Costos"
                value={fmtCurr(totals.a.cost)}
                budget={fmtCurr(totals.b.cost)}
                var={calcVar(totals.a.cost, totals.b.cost, true, true)}
              />
              <Stat
                label="NSR"
                value={fmtCurr(totals.a.nsr)}
                budget={fmtCurr(totals.b.nsr)}
                var={calcVar(totals.a.nsr, totals.b.nsr, true, true)}
              />
              <Stat
                label="Flujo Neto"
                value={fmtCurr(totals.a.flow)}
                budget={fmtCurr(totals.b.flow)}
                var={calcVar(totals.a.flow, totals.b.flow, true, true)}
              />
            </div>

            {/* Summary Table View - Excel-like table */}
            <SummaryTableView months={report.months} companyConfig={report.config} />
          </TabsContent>

          <TabsContent value="pbr" className="mt-4">
            {pbrReport ? (
              <DetailedPBRView report={pbrReport} summaryReport={report} />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-6 w-6" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="dore" className="mt-4">
            {doreReport ? (
              <DetailedDoreView report={doreReport} summaryReport={report} />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-6 w-6" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="opex" className="mt-4">
            {opexReport ? (
              <DetailedOPEXView report={opexReport} />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-6 w-6" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="capex" className="mt-4">
            {capexReport ? (
              <DetailedCAPEXView report={capexReport} />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-6 w-6" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  budget,
  unit,
  var: variance,
}: {
  label: string;
  value: string;
  budget: string;
  unit?: string;
  var: number | null;
}) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="mb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-base tabular-nums">
        {value}
        {unit && <span className="ml-0.5 font-normal text-muted-foreground text-xs">{unit}</span>}
      </p>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{budget}</span>
        {variance !== null && (
          <span className={`font-medium text-[10px] ${variance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {variance > 0 ? "+" : ""}
            {variance.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function _DataRow({
  label,
  value,
  unit,
  variance,
}: {
  label: string;
  value: string;
  unit?: string;
  variance: number | null;
}) {
  const hasData = value !== "-";
  const showUnit = hasData && unit;

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-medium tabular-nums ${!hasData ? "text-muted-foreground italic" : ""}`}>
          {value}
          {showUnit && <span className="ml-0.5 text-muted-foreground">{unit}</span>}
        </span>
        {variance !== null && hasData && (
          <span className={`font-medium text-[10px] ${variance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {variance > 0 ? "+" : ""}
            {variance.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function _DetailedTables({ months }: { months: MonthlyReport[] }) {
  const sections = [
    {
      title: "1. Minería",
      key: "mining",
      rows: [
        { label: "Mineral (t)", k: "ore_mined_t" },
        { label: "Estéril (t)", k: "waste_mined_t" },
        { label: "Desarrollos (m)", k: "developments_m" },
      ],
    },
    {
      title: "2. Procesamiento",
      key: "processing",
      rows: [
        { label: "Toneladas", k: "total_tonnes_processed" },
        { label: "Ley Ag (g/t)", k: "feed_grade_silver_gpt" },
        { label: "Ley Au (g/t)", k: "feed_grade_gold_gpt" },
        { label: "Recup. Ag (%)", k: "recovery_rate_silver_pct" },
        { label: "Recup. Au (%)", k: "recovery_rate_gold_pct" },
      ],
    },
    {
      title: "3. Producción (Calculado)",
      key: "production",
      rows: [
        { label: "Plata Total (oz)", k: "total_production_silver_oz" },
        { label: "Oro Total (oz)", k: "total_production_gold_oz" },
        { label: "Plata Pagable (oz)", k: "payable_silver_oz" },
        { label: "Oro Pagable (oz)", k: "payable_gold_oz" },
      ],
    },
    {
      title: "4. Costos",
      key: "costs",
      rows: [
        { label: "Mina", k: "mine", curr: true },
        { label: "Procesamiento", k: "processing", curr: true },
        { label: "G&A", k: "ga", curr: true },
        { label: "Transporte", k: "transport_shipping", curr: true },
        { label: "Var. Inventario", k: "inventory_variations", curr: true },
        { label: "Total (Calc)", k: "production_based_costs", curr: true, bold: true },
      ],
    },
    {
      title: "5. NSR (Calculado)",
      key: "nsr",
      rows: [
        { label: "NSR Doré", k: "nsr_dore", curr: true },
        { label: "Shipping", k: "shipping_selling", curr: true },
        { label: "Impuestos", k: "sales_taxes_royalties", curr: true },
        { label: "NSR Total", k: "net_smelter_return", curr: true, bold: true },
        { label: "NSR/Ton", k: "nsr_per_tonne", curr: true },
        { label: "Costo/Ton", k: "total_cost_per_tonne", curr: true },
        { label: "Margen/Ton", k: "margin_per_tonne", curr: true },
      ],
    },
    {
      title: "6. CAPEX",
      key: "capex",
      rows: [
        { label: "Sustaining", k: "sustaining", curr: true },
        { label: "Project", k: "project", curr: true },
        { label: "Leasing", k: "leasing", curr: true },
        { label: "Total CAPEX", k: "total", curr: true, bold: true },
        { label: "Margen Prod.", k: "production_based_margin", curr: true },
        { label: "Flujo Neto", k: "pbr_net_cash_flow", curr: true, bold: true },
      ],
    },
    {
      title: "7. Cash Cost (Calculado)",
      key: "cash_cost",
      rows: [
        { label: "Crédito Oro", k: "gold_credit", curr: true },
        { label: "Cash Cost/oz", k: "cash_cost_per_oz_silver", curr: true },
        { label: "AISC/oz", k: "aisc_per_oz_silver", curr: true, bold: true },
      ],
    },
  ];

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const hasData = months.some(
          (m) => (m.actual?.[section.key as keyof typeof m.actual] as Record<string, unknown>)?.has_data,
        );
        if (!hasData) return null;

        return (
          <Card key={section.key} className="overflow-hidden">
            <CardHeader className="bg-muted/20 px-3 py-2">
              <CardTitle className="font-semibold text-sm">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/10">
                      <th className="sticky left-0 w-40 bg-background px-3 py-2 text-left font-medium">Métrica</th>
                      {months.map((m) => (
                        <th key={m.month} className="min-w-[90px] px-2 py-2 text-right font-medium sm:min-w-[100px]">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="capitalize">{fmtMonth(m.month)}</span>
                            <div className="flex gap-0.5 text-[8px] text-muted-foreground">
                              <span>Act</span>
                              <span>/</span>
                              <span>Bdg</span>
                              <span>/</span>
                              <span>%</span>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr
                        key={row.k}
                        className={`border-b last:border-0 hover:bg-muted/10 ${row.bold ? "bg-muted/5" : ""}`}
                      >
                        <td
                          className={`sticky left-0 z-10 bg-background px-2 py-1.5 sm:px-3 ${row.bold ? "font-semibold" : ""}`}
                        >
                          <span className="block sm:inline">{row.label}</span>
                        </td>
                        {months.map((m) => {
                          const a = m.actual?.[section.key as keyof typeof m.actual] as
                            | Record<string, unknown>
                            | undefined;
                          const b = m.budget?.[section.key as keyof typeof m.budget] as
                            | Record<string, unknown>
                            | undefined;
                          const aVal = a?.[row.k];
                          const bVal = b?.[row.k];
                          const aHas = a?.has_data ?? false;
                          const bHas = b?.has_data ?? false;
                          const v = calcVar(aVal, bVal, aHas, bHas);

                          return (
                            <td key={m.month} className="px-1.5 py-1.5 text-right sm:px-2">
                              <div className="flex flex-col items-end tabular-nums">
                                <span className={`text-[11px] sm:text-xs ${row.bold ? "font-semibold" : ""}`}>
                                  {row.curr ? fmtCurr(aVal, aHas) : fmt(aVal, aHas)}
                                </span>
                                <span className="text-[9px] text-muted-foreground sm:text-[10px]">
                                  {row.curr ? fmtCurr(bVal, bHas) : fmt(bVal, bHas)}
                                </span>
                                {v !== null ? (
                                  <span
                                    className={`font-medium text-[9px] sm:text-[10px] ${v >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                                  >
                                    {v > 0 ? "+" : ""}
                                    {v.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-muted-foreground sm:text-[10px]">-</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function _ChartsView({ months }: { months: MonthlyReport[] }) {
  const prodData = months
    .filter((m) => m.actual?.production?.has_data)
    .map((m) => ({
      m: fmtMonth(m.month),
      ag: m.actual?.production.total_production_silver_oz,
      agB: m.budget?.production?.has_data ? m.budget.production.total_production_silver_oz : 0,
      au: m.actual?.production.total_production_gold_oz,
      auB: m.budget?.production?.has_data ? m.budget.production.total_production_gold_oz : 0,
    }));

  const monthWithCosts = months.find((m) => m.actual?.costs?.has_data);
  const costsData = monthWithCosts?.actual
    ? [
        { name: "Mina", value: monthWithCosts.actual.costs.mine, color: "#3b82f6" },
        { name: "Procesamiento", value: monthWithCosts.actual.costs.processing, color: "#10b981" },
        { name: "G&A", value: monthWithCosts.actual.costs.ga, color: "#f59e0b" },
      ]
    : [];

  const nsrData = months
    .filter((m) => m.actual?.nsr?.has_data && m.actual?.costs?.has_data)
    .map((m) => ({
      m: fmtMonth(m.month),
      nsr: m.actual?.nsr.net_smelter_return,
      costs: m.actual?.costs.production_based_costs,
      margin: m.actual?.capex.production_based_margin,
    }));

  return (
    <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
      <ChartCard title="Producción Plata (oz)">
        <LineChart data={prodData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="m" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => fmt(v)} />
          <Line type="monotone" dataKey="ag" stroke="#3b82f6" strokeWidth={2} dot={false} name="Actual" />
          <Line
            type="monotone"
            dataKey="agB"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4"
            dot={false}
            name="Budget"
          />
        </LineChart>
      </ChartCard>

      <ChartCard title="Producción Oro (oz)">
        <LineChart data={prodData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="m" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => fmt(v)} />
          <Line type="monotone" dataKey="au" stroke="#f59e0b" strokeWidth={2} dot={false} name="Actual" />
          <Line
            type="monotone"
            dataKey="auB"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4"
            dot={false}
            name="Budget"
          />
        </LineChart>
      </ChartCard>

      <ChartCard title="Distribución de Costos">
        <PieChart>
          <Pie
            data={costsData}
            cx="50%"
            cy="50%"
            outerRadius={65}
            dataKey="value"
            label={(e) => `${e.name}: ${((e.value / costsData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0)}%`}
            labelStyle={{ fontSize: 10 }}
          >
            {costsData.map((e) => (
              <Cell key={e.name ?? e.color} fill={e.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => fmtCurr(v)} contentStyle={{ fontSize: 11 }} />
        </PieChart>
      </ChartCard>

      <ChartCard title="NSR vs Costos vs Margen">
        <BarChart data={nsrData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="m" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => fmtCurr(v)} />
          <Bar dataKey="nsr" fill="#10b981" radius={[3, 3, 0, 0]} name="NSR" />
          <Bar dataKey="costs" fill="#ef4444" radius={[3, 3, 0, 0]} name="Costos" />
          <Bar dataKey="margin" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Margen" />
        </BarChart>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card className="p-3">
      <h3 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        {children}
      </ResponsiveContainer>
    </Card>
  );
}

// ==================== Summary Table View ====================

interface TableRow {
  id: string;
  category: string;
  metric: string;
  actualMonth: number | null;
  budgetMonth: number | null;
  favUnfMonth: number | null;
  varianceMonth: number | null;
  actualYTD: number | null;
  budgetYTD: number | null;
  favUnfYTD: number | null;
  varianceYTD: number | null;
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
    section: string;
    isCurrency?: boolean;
    isSubtotal?: boolean;
  }[];
}

const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: "mining",
    title: "Mining",
    metrics: [
      { key: "ore_mined_t", label: "Ore Mined (t)", section: "mining" },
      { key: "waste_mined_t", label: "Waste Mined (t)", section: "mining" },
      { key: "developments_m", label: "Developments (m)", section: "mining" },
    ],
  },
  {
    key: "processing",
    title: "Processing",
    metrics: [
      { key: "total_tonnes_processed", label: "Total Tonnes Processed", section: "processing" },
      { key: "feed_grade_silver_gpt", label: "Feed Grade - Silver (g/t)", section: "processing" },
      { key: "feed_grade_gold_gpt", label: "Feed Grade - Gold (g/t)", section: "processing" },
      { key: "recovery_rate_silver_pct", label: "Recovery Rate - Silver (%)", section: "processing" },
      { key: "recovery_rate_gold_pct", label: "Recovery Rate - Gold (%)", section: "processing" },
    ],
  },
  {
    key: "production",
    title: "Production",
    metrics: [
      { key: "total_production_silver_oz", label: "Total Production - Silver (oz)", section: "production" },
      { key: "total_production_gold_oz", label: "Total Production - Gold (oz)", section: "production" },
    ],
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
    key: "nsr_per_tonne",
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
    key: "capex_cash",
    title: "CAPEX & Cash Flow",
    metrics: [
      { key: "sustaining", label: "AISC Sustaining Capital", section: "capex", isCurrency: true },
      { key: "pbr_net_cash_flow", label: "PBR Net Cash flow", section: "capex", isCurrency: true, isSubtotal: true },
    ],
  },
  {
    key: "cash_cost",
    title: "PBR Based Cash Cost & AISC",
    metrics: [
      { key: "gold_credit", label: "Gold Credit", section: "nsr", isCurrency: true },
      { key: "cash_cost_per_oz_silver", label: "Cash Cost per oz Silver", section: "cash_cost", isCurrency: true },
      {
        key: "aisc_per_oz_silver",
        label: "AISC per oz Silver",
        section: "cash_cost",
        isCurrency: true,
        isSubtotal: true,
      },
    ],
  },
];

function SummaryTableView({ months, companyConfig }: { months: MonthlyReport[]; companyConfig?: CompanyConfig }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all"); // "all" or specific month

  // Get months that have actual data (for calculating accumulated totals)
  const monthsWithActual = useMemo(() => {
    return months.filter((m) => m.actual?.production?.has_data);
  }, [months]);

  // Get available months with data for the selector
  const availableMonths = useMemo(() => {
    return months
      .filter((m) => m.actual?.production?.has_data || m.budget?.production?.has_data)
      .map((m) => ({
        value: m.month,
        label: new Date(
          parseInt(m.month.split("-")[0], 10),
          parseInt(m.month.split("-")[1], 10) - 1,
        ).toLocaleDateString("es", { month: "long", year: "numeric" }),
        hasActual: m.actual?.production?.has_data ?? false,
        hasBudget: m.budget?.production?.has_data ?? false,
      }));
  }, [months]);

  // Calculate the period label for display
  const periodLabel = useMemo(() => {
    if (selectedPeriod === "all") {
      if (monthsWithActual.length === 0) return "Sin datos";
      const firstMonth = monthsWithActual[0];
      const lastMonth = monthsWithActual[monthsWithActual.length - 1];
      const formatMonth = (m: string) =>
        new Date(parseInt(m.split("-")[0], 10), parseInt(m.split("-")[1], 10) - 1).toLocaleDateString("es", {
          month: "short",
        });

      if (firstMonth.month === lastMonth.month) {
        return formatMonth(firstMonth.month);
      }
      return `${formatMonth(firstMonth.month)} - ${formatMonth(lastMonth.month)}`;
    }
    return new Date(
      parseInt(selectedPeriod.split("-")[0], 10),
      parseInt(selectedPeriod.split("-")[1], 10) - 1,
    ).toLocaleDateString("es", { month: "short", year: "numeric" });
  }, [selectedPeriod, monthsWithActual]);

  // Helper function to sum values across months (stable ref for useMemo deps)
  const sumMetricAcrossMonths = useCallback(
    (monthsList: MonthlyReport[], section: string, metricKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let hasAnyData = false;

      for (const month of monthsList) {
        const data = month[dataType]?.[section as keyof typeof month.actual] as Record<string, unknown>;
        if (data?.has_data && typeof data[metricKey] === "number") {
          sum += data[metricKey];
          hasAnyData = true;
        }
      }

      return hasAnyData ? sum : null;
    },
    [],
  );

  // Helper function to calculate average for rate/percentage metrics (stable ref for useMemo deps)
  const avgMetricAcrossMonths = useCallback(
    (monthsList: MonthlyReport[], section: string, metricKey: string, dataType: "actual" | "budget"): number | null => {
      let sum = 0;
      let count = 0;

      for (const month of monthsList) {
        const data = month[dataType]?.[section as keyof typeof month.actual] as Record<string, unknown>;
        if (data?.has_data && typeof data[metricKey] === "number") {
          sum += data[metricKey];
          count++;
        }
      }

      return count > 0 ? sum / count : null;
    },
    [],
  );

  // Metrics that should be averaged instead of summed (rates, percentages, per-unit values)
  const AVERAGE_METRICS = [
    "feed_grade_silver_gpt",
    "feed_grade_gold_gpt",
    "recovery_rate_silver_pct",
    "recovery_rate_gold_pct",
    "nsr_per_tonne",
    "total_cost_per_tonne",
    "margin_per_tonne",
    "cash_cost_per_oz_silver",
    "aisc_per_oz_silver",
  ];

  // Build table rows from the data
  const tableRows = useMemo(() => {
    const isAllPeriod = selectedPeriod === "all";
    const targetMonths = isAllPeriod ? monthsWithActual : months.filter((m) => m.month === selectedPeriod);

    if (targetMonths.length === 0) return [];

    const rows: TableRow[] = [];

    // Filter categories based on company configuration
    const filteredCategories = filterCategoriesByConfig(CATEGORY_CONFIG, companyConfig);

    for (const category of filteredCategories) {
      // Add category header
      rows.push({
        id: `header-${category.key}`,
        category: category.key,
        metric: category.title,
        actualMonth: null,
        budgetMonth: null,
        favUnfMonth: null,
        varianceMonth: null,
        actualYTD: null,
        budgetYTD: null,
        favUnfYTD: null,
        varianceYTD: null,
        isCurrency: false,
        isHeader: true,
        isSubtotal: false,
      });

      for (const metric of category.metrics) {
        let actualValue: number | null;
        let budgetValue: number | null;
        let actualYTD: number | null = null;
        let budgetYTD: number | null = null;

        if (isAllPeriod) {
          // Accumulated mode: sum or average across all months with actual data
          const isAvgMetric = AVERAGE_METRICS.includes(metric.key);
          const aggregator = isAvgMetric ? avgMetricAcrossMonths : sumMetricAcrossMonths;

          actualValue = aggregator(targetMonths, metric.section, metric.key, "actual");
          budgetValue = aggregator(targetMonths, metric.section, metric.key, "budget");

          // For "all" mode, we don't show separate YTD (the main columns ARE the YTD)
        } else {
          // Single month mode
          const monthData = targetMonths[0];
          const sectionData = monthData?.actual?.[metric.section as keyof typeof monthData.actual] as
            | Record<string, unknown>
            | undefined;
          const budgetData = monthData?.budget?.[metric.section as keyof typeof monthData.budget] as
            | Record<string, unknown>
            | undefined;
          const ytdActualData = monthData?.ytd?.actual?.[metric.section as keyof typeof monthData.ytd.actual] as
            | Record<string, unknown>
            | undefined;
          const ytdBudgetData = monthData?.ytd?.budget?.[metric.section as keyof typeof monthData.ytd.budget] as
            | Record<string, unknown>
            | undefined;

          actualValue = sectionData?.has_data ? sectionData[metric.key] : null;
          budgetValue = budgetData?.has_data ? budgetData[metric.key] : null;
          actualYTD = ytdActualData?.has_data ? ytdActualData[metric.key] : null;
          budgetYTD = ytdBudgetData?.has_data ? ytdBudgetData[metric.key] : null;
        }

        // Calculate Fav (Unf) = Actual - Budget
        const favUnfMonth = actualValue !== null && budgetValue !== null ? actualValue - budgetValue : null;
        const favUnfYTD = actualYTD !== null && budgetYTD !== null ? actualYTD - budgetYTD : null;

        // Calculate % Variance
        const varianceMonth =
          actualValue !== null && budgetValue !== null && budgetValue !== 0
            ? ((actualValue - budgetValue) / Math.abs(budgetValue)) * 100
            : null;
        const varianceYTD =
          actualYTD !== null && budgetYTD !== null && budgetYTD !== 0
            ? ((actualYTD - budgetYTD) / Math.abs(budgetYTD)) * 100
            : null;

        rows.push({
          id: `${category.key}-${metric.key}`,
          category: category.key,
          metric: metric.label,
          actualMonth: actualValue,
          budgetMonth: budgetValue,
          favUnfMonth,
          varianceMonth,
          actualYTD,
          budgetYTD,
          favUnfYTD,
          varianceYTD,
          isCurrency: metric.isCurrency || false,
          isHeader: false,
          isSubtotal: metric.isSubtotal || false,
        });
      }
    }

    return rows;
  }, [selectedPeriod, monthsWithActual, months, companyConfig, avgMetricAcrossMonths, sumMetricAcrossMonths]);

  // Helper to check if a number matches the search term (stable ref for useMemo deps)
  const numberMatchesSearch = useCallback((value: number | null, term: string, isCurrency: boolean): boolean => {
    if (value === null) return false;
    const formatted = isCurrency
      ? `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return formatted.toLowerCase().includes(term);
  }, []);

  // Filter rows based on search (metric name OR numeric values)
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return tableRows;
    const term = searchTerm.toLowerCase();

    // Keep headers for categories that have matching rows
    const matchingCategories = new Set<string>();
    for (const row of tableRows) {
      if (!row.isHeader) {
        const metricMatches = row.metric.toLowerCase().includes(term);
        const numbersMatch =
          numberMatchesSearch(row.actualMonth, term, row.isCurrency) ||
          numberMatchesSearch(row.budgetMonth, term, row.isCurrency) ||
          numberMatchesSearch(row.favUnfMonth, term, row.isCurrency) ||
          numberMatchesSearch(row.actualYTD, term, row.isCurrency) ||
          numberMatchesSearch(row.budgetYTD, term, row.isCurrency) ||
          numberMatchesSearch(row.favUnfYTD, term, row.isCurrency);

        if (metricMatches || numbersMatch) {
          matchingCategories.add(row.category);
        }
      }
    }

    return tableRows.filter((row) => {
      if (row.isHeader) return matchingCategories.has(row.category);
      const metricMatches = row.metric.toLowerCase().includes(term);
      const numbersMatch =
        numberMatchesSearch(row.actualMonth, term, row.isCurrency) ||
        numberMatchesSearch(row.budgetMonth, term, row.isCurrency) ||
        numberMatchesSearch(row.favUnfMonth, term, row.isCurrency) ||
        numberMatchesSearch(row.actualYTD, term, row.isCurrency) ||
        numberMatchesSearch(row.budgetYTD, term, row.isCurrency) ||
        numberMatchesSearch(row.favUnfYTD, term, row.isCurrency);
      return metricMatches || numbersMatch;
    });
  }, [tableRows, searchTerm, numberMatchesSearch]);

  // Sort rows (keeping headers in place)
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

    // Sort each category's rows
    for (const [, rows] of grouped) {
      const dataRows = rows.slice(1); // Skip header
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
    if (value === null || value === undefined) return "-";
    if (isCurrency) {
      return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  const formatVariance = (value: number | null): string => {
    if (value === null) return "-";
    return `${value >= 0 ? "" : ""}${value.toFixed(0)}%`;
  };

  const formatFavUnf = (value: number | null, isCurrency: boolean): string => {
    if (value === null) return "-";
    const absValue = Math.abs(value);
    const formatted = isCurrency
      ? `$${absValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : absValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return value < 0 ? `(${formatted})` : formatted;
  };

  const getVarianceColor = (value: number | null): string => {
    if (value === null) return "";
    return value >= 0 ? "text-emerald-600" : "text-rose-600";
  };

  const isAllPeriod = selectedPeriod === "all";
  const hasData = isAllPeriod ? monthsWithActual.length > 0 : months.some((m) => m.month === selectedPeriod);

  if (!hasData) {
    return <div className="py-8 text-center text-muted-foreground">No hay datos disponibles para mostrar</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Vista de Tabla Detallada</CardTitle>
            <CardDescription className="text-xs">
              {isAllPeriod
                ? `Acumulado de ${monthsWithActual.length} mes${monthsWithActual.length > 1 ? "es" : ""} con datos Actual`
                : "Actual vs Budget con YTD"}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Period Selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">📊 Todo (Acumulado YTD)</option>
              <optgroup label="Por mes">
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} {m.hasActual && m.hasBudget ? "✓" : m.hasActual ? "(A)" : "(B)"}
                  </option>
                ))}
              </optgroup>
            </select>
            {/* Search */}
            <div className="relative w-64">
              <Search className="-translate-y-1/2 absolute top-1/2 left-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar métrica o valor..."
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
                <th className="sticky left-0 min-w-[220px] bg-muted/30 px-3 py-2 text-left font-semibold">Métrica</th>
                <th
                  colSpan={4}
                  className="border-l bg-blue-50/50 px-2 py-1 text-center font-semibold dark:bg-blue-950/20"
                >
                  <div className="text-xs">{isAllPeriod ? `Acumulado (${periodLabel})` : periodLabel}</div>
                </th>
                {!isAllPeriod && (
                  <th
                    colSpan={4}
                    className="border-l bg-green-50/50 px-2 py-1 text-center font-semibold dark:bg-green-950/20"
                  >
                    <div className="text-xs">YTD</div>
                  </th>
                )}
              </tr>
              <tr className="border-b bg-muted/20">
                <th className="sticky left-0 bg-muted/20 px-3 py-1.5 text-left font-medium text-[10px] text-muted-foreground" />
                <th className="min-w-[90px] border-l px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 font-medium text-[10px]"
                    onClick={() => handleSort("actualMonth")}
                  >
                    Actual
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="min-w-[90px] px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 font-medium text-[10px]"
                    onClick={() => handleSort("budgetMonth")}
                  >
                    Budget
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="min-w-[80px] px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 font-medium text-[10px]"
                    onClick={() => handleSort("favUnfMonth")}
                  >
                    Fav (Unf)
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="min-w-[70px] px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 font-medium text-[10px]"
                    onClick={() => handleSort("varianceMonth")}
                  >
                    % Var
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                {!isAllPeriod && (
                  <>
                    <th className="min-w-[90px] border-l px-2 py-1.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 font-medium text-[10px]"
                        onClick={() => handleSort("actualYTD")}
                      >
                        Actual
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </th>
                    <th className="min-w-[90px] px-2 py-1.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 font-medium text-[10px]"
                        onClick={() => handleSort("budgetYTD")}
                      >
                        Budget
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </th>
                    <th className="min-w-[80px] px-2 py-1.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 font-medium text-[10px]"
                        onClick={() => handleSort("favUnfYTD")}
                      >
                        Fav (Unf)
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </th>
                    <th className="min-w-[70px] px-2 py-1.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 font-medium text-[10px]"
                        onClick={() => handleSort("varianceYTD")}
                      >
                        % Var
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </th>
                  </>
                )}
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
                      <td
                        colSpan={isAllPeriod ? 5 : 9}
                        className="sticky left-0 bg-muted/40 px-3 py-2 font-bold text-sm"
                      >
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
                      {formatValue(row.actualMonth, row.isCurrency)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatValue(row.budgetMonth, row.isCurrency)}
                    </td>
                    <td className={`px-2 py-1.5 text-right tabular-nums ${getVarianceColor(row.favUnfMonth)}`}>
                      {formatFavUnf(row.favUnfMonth, row.isCurrency)}
                    </td>
                    <td className={`px-2 py-1.5 text-right tabular-nums ${getVarianceColor(row.varianceMonth)}`}>
                      {formatVariance(row.varianceMonth)}
                    </td>
                    {!isAllPeriod && (
                      <>
                        <td className="border-l px-2 py-1.5 text-right tabular-nums">
                          {formatValue(row.actualYTD, row.isCurrency)}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatValue(row.budgetYTD, row.isCurrency)}
                        </td>
                        <td className={`px-2 py-1.5 text-right tabular-nums ${getVarianceColor(row.favUnfYTD)}`}>
                          {formatFavUnf(row.favUnfYTD, row.isCurrency)}
                        </td>
                        <td className={`px-2 py-1.5 text-right tabular-nums ${getVarianceColor(row.varianceYTD)}`}>
                          {formatVariance(row.varianceYTD)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visibleRows.filter((r) => !r.isHeader).length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No se encontraron métricas que coincidan con la búsqueda
          </div>
        )}
      </CardContent>
    </Card>
  );
}
