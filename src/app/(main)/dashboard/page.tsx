"use client";

import Link from "next/link";

import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  GitCompare,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user, userCompanies, isLoading, isSuperAdmin, canManageCompanyUsers } = useAuth();

  // User only sees their assigned companies
  const totalCompanies = userCompanies.length;

  // Permission checks
  const hasAnyViewAccess = userCompanies.length > 0;
  const hasAnyEditAccess = userCompanies.some((c) => c.role === "editor" || c.role === "admin");

  const stats = [
    {
      title: "Mis Empresas",
      value: isLoading ? "-" : totalCompanies,
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      description: "Empresas asignadas",
      trend: null,
    },
    {
      title: "Tu Rol",
      value: user?.permissions[0] || "Viewer",
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      description: "Permisos del sistema",
      capitalize: true,
    },
    {
      title: "Estado del Sistema",
      value: "Operativo",
      icon: Zap,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      description: "Todos los servicios activos",
    },
  ];

  // All quick actions with permission requirements
  const allQuickActions = [
    {
      title: "Gestionar Empresas",
      description: "Ver y administrar empresas mineras",
      icon: Building2,
      href: "/dashboard/companies",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      visible: isSuperAdmin,
    },
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
      description: "Análisis y comparaciones",
      icon: BarChart3,
      href: "/dashboard/reports",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      visible: hasAnyViewAccess,
    },
    {
      title: "Comparar Escenarios",
      description: "Análisis de diferentes versiones",
      icon: GitCompare,
      href: "/dashboard/scenarios",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      visible: hasAnyViewAccess,
    },
    {
      title: "Gestionar Usuarios",
      description: "Administrar usuarios del sistema",
      icon: Users,
      href: "/dashboard/users",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-50 dark:bg-pink-950/20",
      visible: canManageCompanyUsers || isSuperAdmin,
    },
  ];

  // Filter to only show permitted actions
  const quickActions = allQuickActions.filter((action) => action.visible);

  // Workflow steps filtered by permissions
  const allWorkflowSteps = [
    {
      step: 1,
      title: "Configurar Empresa",
      description: "Crea y configura tu empresa minera con sus datos básicos",
      icon: Building2,
      href: "/dashboard/companies",
      completed: totalCompanies > 0,
      visible: isSuperAdmin,
    },
    {
      step: 2,
      title: "Importar Budget",
      description: "Carga datos presupuestarios (PBR, Dore, OPEX, CAPEX)",
      icon: Upload,
      href: "/dashboard/import",
      completed: false,
      visible: hasAnyEditAccess,
    },
    {
      step: 3,
      title: "Importar Actual",
      description: "Carga datos reales mensuales para comparar",
      icon: Calendar,
      href: "/dashboard/import",
      completed: false,
      visible: hasAnyEditAccess,
    },
    {
      step: 4,
      title: "Generar Reportes",
      description: "Analiza y compara datos reales vs presupuesto",
      icon: BarChart3,
      href: "/dashboard/reports",
      completed: false,
      visible: hasAnyViewAccess,
    },
  ];

  // Filter and re-number steps based on visibility
  const workflowSteps = allWorkflowSteps
    .filter((step) => step.visible)
    .map((step, index) => ({ ...step, step: index + 1 }));

  return (
    <div className="space-y-8">
      {/* Welcome Section - Futuristic Glass Card */}
      <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-background p-8 shadow-lg shadow-primary/5 backdrop-blur-sm transition-all hover:shadow-primary/10 hover:shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">
              Bienvenido,{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {user?.first_name}
              </span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              {user?.work_area || "Sistema de gestión minera"} •{" "}
              {new Date().toLocaleDateString("es", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-sm backdrop-blur-sm">
            <Zap className="mr-1.5 h-3.5 w-3.5" />
            Sistema Operativo
          </Badge>
        </div>
      </div>

      {/* Key Metrics - Clean Futuristic Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className="flex items-baseline gap-2">
                  <div className={`font-bold text-3xl tracking-tight ${stat.color}`}>
                    {isLoading ? <Skeleton className="h-8 w-16" /> : <span>{stat.value}</span>}
                  </div>
                </div>
                <p className="font-light text-muted-foreground text-xs">{stat.description}</p>
              </div>
              <div className={`ml-4 rounded-xl p-3 ${stat.bgColor} transition-transform group-hover:scale-110`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions - Futuristic Glass Cards */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl tracking-tight">Accesos Rápidos</h2>
            <p className="mt-1 text-muted-foreground text-sm">Navega rápidamente a las funciones principales</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-primary/10 hover:shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div
                    className={`mb-4 inline-flex rounded-xl p-3 ${action.bgColor} transition-transform group-hover:scale-110 group-hover:shadow-lg`}
                  >
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <h3 className="mb-1 font-semibold text-base tracking-tight">{action.title}</h3>
                  <p className="mb-4 font-light text-muted-foreground text-xs leading-relaxed">{action.description}</p>
                  <div className="flex items-center gap-1 font-medium text-primary text-sm transition-all group-hover:gap-2">
                    Acceder <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Companies Overview - Clean Grid */}
      {!isLoading && userCompanies.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card/50 p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-xl tracking-tight">Mis Empresas</h2>
              <p className="mt-1 text-muted-foreground text-sm">Empresas a las que tienes acceso</p>
            </div>
            <Link href="/dashboard/reports">
              <Badge
                variant="outline"
                className="cursor-pointer border-primary/20 bg-primary/5 backdrop-blur-sm transition-all hover:bg-primary/10"
              >
                Ver reportes <ChevronRight className="ml-1 h-3 w-3" />
              </Badge>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userCompanies.slice(0, 6).map((company) => (
              <Link key={company.company_id} href="/dashboard/reports">
                <div className="group relative overflow-hidden rounded-xl border border-border/40 bg-card/30 p-4 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card/60 hover:shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-sm">{company.company_name}</p>
                      <p className="mt-0.5 truncate text-muted-foreground text-xs capitalize">Rol: {company.role}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {userCompanies.length > 6 && (
            <div className="mt-6 text-center">
              <Link href="/dashboard/reports">
                <Badge
                  variant="outline"
                  className="cursor-pointer border-primary/20 bg-primary/5 backdrop-blur-sm transition-all hover:bg-primary/10"
                >
                  Ver {userCompanies.length - 6} empresas más
                </Badge>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Getting Started / Workflow - Futuristic Steps */}
      <div className="rounded-2xl border border-border/40 bg-card/50 p-6 shadow-sm backdrop-blur-sm">
        <div className="mb-6">
          <h2 className="font-bold text-xl tracking-tight">Guía de Inicio</h2>
          <p className="mt-1 text-muted-foreground text-sm">Sigue estos pasos para comenzar a usar el sistema</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {workflowSteps.map((step, _idx) => (
            <Link key={step.step} href={step.href}>
              <div
                className={`group relative overflow-hidden rounded-xl border border-border/40 bg-card/30 p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card/60 hover:shadow-lg ${
                  step.completed ? "border-emerald-500/30 bg-emerald-500/5" : ""
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-semibold transition-transform group-hover:scale-110 ${
                      step.completed
                        ? "bg-emerald-500/20 text-emerald-600 shadow-emerald-500/20 shadow-lg dark:text-emerald-400"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {step.completed ? (
                      <TrendingUp className="h-6 w-6" />
                    ) : (
                      <span className="font-bold text-base">{step.step}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                      {step.completed && (
                        <Badge
                          variant="outline"
                          className="h-5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 text-xs dark:text-emerald-400"
                        >
                          ✓ Completado
                        </Badge>
                      )}
                    </div>
                    <p className="font-light text-muted-foreground text-xs leading-relaxed">{step.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* System Info - Clean Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-border/40 bg-card/50 p-6 shadow-sm backdrop-blur-sm">
          <h3 className="mb-4 font-semibold text-base">Sobre el Sistema</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-border/20 border-b pb-2">
              <span className="font-light text-muted-foreground">Versión</span>
              <span className="font-semibold">2.1.0</span>
            </div>
            <div className="flex items-center justify-between border-border/20 border-b pb-2">
              <span className="font-light text-muted-foreground">Tipo de Sistema</span>
              <span className="font-semibold">Gestión Minera</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-light text-muted-foreground">Estado</span>
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                Operativo
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-6 shadow-sm backdrop-blur-sm">
          <h3 className="mb-4 font-semibold text-base">Soporte</h3>
          <p className="mb-4 font-light text-muted-foreground text-sm leading-relaxed">
            ¿Necesitas ayuda? Consulta la documentación o contacta al equipo de soporte para asistencia.
          </p>
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className="cursor-pointer border-primary/20 bg-primary/5 backdrop-blur-sm transition-all hover:bg-primary/10"
            >
              <FileText className="mr-1.5 h-3 w-3" />
              Documentación
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
