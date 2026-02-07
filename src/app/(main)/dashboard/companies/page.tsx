"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useCompanies } from "@/hooks/use-companies";

import { CompaniesTable } from "./_components/companies-table";
import { CreateCompanyDialog } from "./_components/create-company-dialog";

export default function CompaniesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { companies, isLoading, error } = useCompanies();
  const { isSuperAdmin } = useAuth();

  if (isLoading) {
    return (
      <AuthGuard requiredPermission="super_admin">
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard requiredPermission="super_admin">
        <Alert variant="destructive">
          <AlertDescription>
            Error al cargar empresas: {error instanceof Error ? error.message : "Error desconocido"}
          </AlertDescription>
        </Alert>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredPermission="super_admin">
      <div className="space-y-4 sm:space-y-6">
        <Breadcrumbs />

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-0">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Empresas Mineras</h1>
            <p className="text-muted-foreground">Gestiona las empresas mineras del sistema</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Empresa
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Empresas</CardTitle>
            <CardDescription>
              {companies.length} empresa{companies.length !== 1 ? "s" : ""} registrada
              {companies.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompaniesTable companies={companies} />
          </CardContent>
        </Card>

        <CreateCompanyDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      </div>
    </AuthGuard>
  );
}
