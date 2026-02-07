"use client";

import { useState } from "react";

import { Building2, Calendar, GitCompare, Layers, Trash2 } from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useScenarios } from "@/hooks/use-scenarios";
import { cn } from "@/lib/utils";

import { ComparisonView } from "./_components/comparison-view";

export default function ScenariosPage() {
  const { userCompanies } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedScenarios, setSelectedScenarios] = useState<number[]>([]);

  const { scenarios, isLoading, compareScenarios, isComparing, compareResult } = useScenarios(
    selectedCompany,
    selectedYear,
  );

  const toggleScenario = (id: number) => {
    setSelectedScenarios((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedScenarios.length < 2) return;
    await compareScenarios({
      report_ids: selectedScenarios,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const selectedCompanyName = userCompanies.find((c) => c.company_id === selectedCompany)?.company_name;

  return (
    <AuthGuard requiredPermission="can_view">
      <div className="space-y-4">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <GitCompare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-xl tracking-tight">Comparar Escenarios</h1>
              <p className="text-muted-foreground text-sm">Analiza diferentes versiones de reportes</p>
            </div>
          </div>

          {selectedScenarios.length >= 2 && (
            <Button onClick={handleCompare} disabled={isComparing}>
              <GitCompare className="mr-2 h-4 w-4" />
              {isComparing ? "Comparando..." : `Comparar ${selectedScenarios.length} escenarios`}
            </Button>
          )}
        </div>

        {/* Filters - compact */}
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap items-end gap-3">
              {/* Company selector */}
              <div className="min-w-[180px] flex-1">
                <div className="mb-1.5 flex items-center gap-2 text-muted-foreground text-xs">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Empresa</span>
                </div>
                <Select value={selectedCompany?.toString()} onValueChange={(v) => setSelectedCompany(parseInt(v, 10))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecciona empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {userCompanies.map((company) => (
                      <SelectItem key={company.company_id} value={company.company_id.toString()}>
                        {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year selector */}
              <div className="w-[100px]">
                <div className="mb-1.5 flex items-center gap-2 text-muted-foreground text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Año</span>
                </div>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scenarios List */}
        {selectedCompany && (
          <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Escenarios de {selectedCompanyName}</span>
                {selectedScenarios.length > 0 && (
                  <span className="text-muted-foreground text-xs">({selectedScenarios.length} seleccionados)</span>
                )}
              </div>
              <span className="text-muted-foreground text-xs">Selecciona de 2 a 5 para comparar</span>
            </div>

            {/* Loading state */}
            {isLoading ? (
              <Card className="shadow-sm">
                <CardContent className="py-12">
                  <div className="flex items-center justify-center">
                    <Spinner className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
            ) : scenarios.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No hay escenarios guardados</p>
                    <p className="text-muted-foreground/70 text-sm">Ve a Reportes y guarda un escenario primero</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {scenarios.map((scenario, _index) => {
                  const isSelected = selectedScenarios.includes(scenario.id);
                  const isDisabled = !isSelected && selectedScenarios.length >= 5;
                  const selectionIndex = selectedScenarios.indexOf(scenario.id);

                  return (
                    <Card
                      key={scenario.id}
                      className={cn(
                        "cursor-pointer shadow-sm transition-all hover:shadow-md",
                        isSelected && "bg-primary/5 ring-2 ring-primary",
                        isDisabled && "cursor-not-allowed opacity-50",
                      )}
                      onClick={() => !isDisabled && toggleScenario(scenario.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs">
                                  {selectionIndex + 1}
                                </div>
                              )}
                              <span className="truncate font-medium">{scenario.name}</span>
                            </div>
                            {scenario.description && (
                              <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">{scenario.description}</p>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
                              <span className="rounded bg-muted px-1.5 py-0.5">Budget v{scenario.budget_version}</span>
                              <span>{formatDate(scenario.created_at)}</span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Delete scenario
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Comparison Results */}
        {compareResult && <ComparisonView comparison={compareResult} />}
      </div>
    </AuthGuard>
  );
}
