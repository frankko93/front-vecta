"use client";

import { useState } from "react";

import { Download, FileText, Save } from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSummaryReport } from "@/hooks/use-reports";
import type { SummaryReportParams } from "@/lib/api/types";

import { ReportFilters } from "./_components/report-filters";
import { SaveScenarioDialog } from "./_components/save-scenario-dialog";
import { SummaryReportView } from "./_components/summary-report-view";

export default function ReportsPage() {
  const [params, setParams] = useState<SummaryReportParams | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const { report, isLoading, error } = useSummaryReport(params);

  const handleExport = () => {
    if (!report) return;
    // TODO: Implement Excel export
    alert("Exportar a Excel - Feature próximamente");
  };

  return (
    <AuthGuard requiredPermission="can_view">
      <div className="space-y-4">
        <Breadcrumbs />

        {/* Header with actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-xl tracking-tight">Reportes</h1>
              <p className="text-muted-foreground text-sm">Actual vs Budget</p>
            </div>
          </div>

          {report && params && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-3.5 w-3.5" />
                Exportar
              </Button>
              <Button size="sm" onClick={() => setIsSaveDialogOpen(true)}>
                <Save className="mr-2 h-3.5 w-3.5" />
                Guardar Escenario
              </Button>
            </div>
          )}
        </div>

        {/* Filters - compact card */}
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3">
            <ReportFilters onFilter={setParams} />
          </CardContent>
        </Card>

        {/* Report content */}
        {params && <SummaryReportView report={report} isLoading={isLoading} error={error} params={params} />}

        {/* Save dialog */}
        {params && (
          <SaveScenarioDialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen} reportParams={params} />
        )}
      </div>
    </AuthGuard>
  );
}
