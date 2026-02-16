"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { ArrowRight, BarChart3, Building2, Calendar, GitCompare, Upload, Users, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useSummaryReport } from "@/hooks/use-reports";
import { cn } from "@/lib/utils";

import { DashboardAlerts } from "./_components/dashboard-alerts";
import { DashboardCharts } from "./_components/dashboard-charts";
import { DashboardKPIs } from "./_components/dashboard-kpis";

export default function DashboardPage() {
  const {
    user,
    userCompanies,
    selectedCompanyId,
    selectedCompany,
    isLoading: authLoading,
    isSuperAdmin,
    canManageSelectedCompanyUsers,
  } = useAuth();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // Render date only on client to avoid hydration mismatch
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("es", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  // Fetch report data for the selected company and year
  const params = useMemo(() => {
    if (!selectedCompanyId) return null;
    return { company_id: selectedCompanyId, year, budget_version: 1 };
  }, [selectedCompanyId, year]);

  const { report, isLoading: reportLoading } = useSummaryReport(params);

  // Check if the report contains any actual data
  // When the API fails (e.g. no data imported), treat it as "no data" — not an error
  const hasActualData = report?.coverage?.has_any_actual ?? report?.months.some((m) => m.actual !== null) ?? false;

  // Permission-based visibility
  const hasAnyViewAccess = userCompanies.length > 0;
  const hasAnyEditAccess = userCompanies.some((c) => c.role === "editor" || c.role === "admin");

  // Quick actions filtered by permissions
  const quickActions = useMemo(
    () =>
      [
        {
          title: "Importar Datos",
          description: "Cargar PBR, Dore, OPEX, CAPEX",
          icon: Upload,
          href: "/dashboard/import",
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
          visible: hasAnyEditAccess,
        },
        {
          title: "Ver Reportes",
          description: "Análisis detallado",
          icon: BarChart3,
          href: "/dashboard/reports",
          color: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-50 dark:bg-purple-950/20",
          visible: hasAnyViewAccess,
        },
        {
          title: "Comparar Escenarios",
          description: "Análisis de versiones",
          icon: GitCompare,
          href: "/dashboard/scenarios",
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-50 dark:bg-orange-950/20",
          visible: hasAnyViewAccess,
        },
        {
          title: "Gestionar Usuarios",
          description: "Administrar accesos",
          icon: Users,
          href: "/dashboard/users",
          color: "text-pink-600 dark:text-pink-400",
          bgColor: "bg-pink-50 dark:bg-pink-950/20",
          visible: canManageSelectedCompanyUsers || isSuperAdmin,
        },
        {
          title: "Gestionar Empresas",
          description: "Configuración empresas",
          icon: Building2,
          href: "/dashboard/companies",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          visible: isSuperAdmin,
        },
      ].filter((a) => a.visible),
    [hasAnyEditAccess, hasAnyViewAccess, canManageSelectedCompanyUsers, isSuperAdmin],
  );

  // Data coverage indicator (which months have actual/budget data)
  const coverageMonths = useMemo(() => {
    if (!report?.coverage) return null;
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const hasActual = report.coverage?.actual_months.includes(month) ?? false;
      const hasBudget = report.coverage?.budget_months.includes(month) ?? false;
      return { month, hasActual, hasBudget };
    });
  }, [report?.coverage]);

  return (
    <div className="space-y-6">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            Bienvenido,{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {user?.first_name}
            </span>
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {selectedCompany ? selectedCompany.company_name : user?.work_area || "Sistema de gestión minera"}
            {dateStr && <span className="hidden sm:inline"> &bull; {dateStr}</span>}
          </p>

          {/* Monthly data coverage dots */}
          {coverageMonths && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Cobertura {year}:</span>
              <div className="flex gap-0.5">
                {coverageMonths.map((cm) => (
                  <div
                    key={cm.month}
                    className={cn(
                      "h-2 w-3.5 rounded-sm transition-colors",
                      cm.hasActual && cm.hasBudget
                        ? "bg-emerald-500"
                        : cm.hasActual
                          ? "bg-blue-500"
                          : cm.hasBudget
                            ? "bg-amber-400/70"
                            : "bg-muted",
                    )}
                    title={`Mes ${cm.month}: ${cm.hasActual ? "Actual" : ""}${cm.hasActual && cm.hasBudget ? " + " : ""}${cm.hasBudget ? "Budget" : ""}${!cm.hasActual && !cm.hasBudget ? "Sin datos" : ""}`}
                  />
                ))}
              </div>
              <div className="hidden items-center gap-3 text-muted-foreground text-xs sm:flex">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Ambos
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-blue-500" /> Actual
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-amber-400/70" /> Budget
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Year selector */}
        {selectedCompanyId && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      {authLoading ? (
        /* Auth loading skeleton */
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {["ag", "au", "nsr", "cashcost", "aisc", "cashflow"].map((id) => (
              <Skeleton key={id} className="h-[120px] rounded-xl" />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-[340px] rounded-xl" />
            <Skeleton className="h-[340px] rounded-xl" />
          </div>
        </div>
      ) : !selectedCompanyId ? (
        /* No company selected */
        <div className="space-y-6">
          <div className="rounded-xl border border-border/40 bg-card p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h2 className="mt-4 font-semibold text-lg">Selecciona una empresa</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm">
              Selecciona una empresa desde el menú lateral para ver el resumen de operaciones, métricas clave y análisis
              de desviaciones.
            </p>
          </div>

          {/* Show quick actions prominently when no company selected */}
          {quickActions.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="group flex items-center gap-4 rounded-xl border border-border/40 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md">
                    <div className={`rounded-lg p-2.5 ${action.bgColor} transition-transform group-hover:scale-105`}>
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{action.title}</p>
                      <p className="text-muted-foreground text-xs">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Company selected – data-driven dashboard */
        <>
          {/* KPI Cards */}
          <DashboardKPIs report={report} isLoading={reportLoading} />

          {/* Charts (only with actual data) */}
          {report && hasActualData && <DashboardCharts report={report} />}

          {/* Bottom section: Alerts + Quick Actions */}
          <div className="grid gap-5 lg:grid-cols-5">
            {/* Alerts panel (wider) */}
            <div className="lg:col-span-3">
              {report && hasActualData ? (
                <DashboardAlerts report={report} />
              ) : !reportLoading ? (
                /* Empty state – no data imported */
                <div className="rounded-xl border border-border/40 bg-card p-8 text-center">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <h3 className="mt-3 font-semibold">Sin datos importados</h3>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Importa datos de PBR, Dore, OPEX o CAPEX para ver métricas y análisis.
                  </p>
                  {hasAnyEditAccess && (
                    <Link
                      href="/dashboard/import"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                    >
                      <Upload className="h-4 w-4" />
                      Importar Datos
                    </Link>
                  )}
                </div>
              ) : (
                <Skeleton className="h-[280px] rounded-xl" />
              )}
            </div>

            {/* Quick Actions (compact sidebar) */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border/40 bg-card p-5">
                <h3 className="mb-3 font-semibold text-sm">Acciones Rápidas</h3>
                <div className="space-y-1.5">
                  {quickActions.map((action) => (
                    <Link key={action.href} href={action.href}>
                      <div className="group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50">
                        <div className={`rounded-lg p-2 ${action.bgColor} transition-transform group-hover:scale-105`}>
                          <action.icon className={`h-4 w-4 ${action.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{action.title}</p>
                          <p className="text-muted-foreground text-xs">{action.description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── System Status Bar ── */}
      <div className="flex items-center justify-between rounded-lg border border-border/20 px-4 py-2 text-muted-foreground text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Sistema Operativo
          </span>
          <span>v2.1.0</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedCompany && (
            <Badge variant="outline" className="font-normal text-xs">
              {selectedCompany.company_name}
            </Badge>
          )}
          <Zap className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
