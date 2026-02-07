"use client";

import { useState } from "react";

import { AuthGuard } from "@/components/auth-guard";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ImportForm } from "./_components/import-form";
import { ImportHistory } from "./_components/import-history";

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <AuthGuard requiredPermission="can_edit">
      <div className="space-y-4 sm:space-y-6">
        <Breadcrumbs />
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Importar Datos</h1>
          <p className="text-muted-foreground">Importa archivos CSV con datos de producción, costos y finanzas</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upload">Importar CSV</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Importar Archivo CSV</CardTitle>
                <CardDescription>Selecciona el tipo de datos, empresa y sube el archivo CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <ImportForm onSuccess={() => setActiveTab("history")} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Formatos de CSV Esperados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <h3 className="font-semibold">PBR (Plan Beneficio Regional)</h3>
                    <p className="text-muted-foreground text-sm">Datos de minería, procesamiento y recuperación</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Dore</h3>
                    <p className="text-muted-foreground text-sm">Producción de doré, precios y ajustes</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">OPEX</h3>
                    <p className="text-muted-foreground text-sm">Costos operativos por centro de costo</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">CAPEX</h3>
                    <p className="text-muted-foreground text-sm">Gastos de capital e inversiones</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Financial</h3>
                    <p className="text-muted-foreground text-sm">Datos financieros y ajustes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Importaciones</CardTitle>
                <CardDescription>Revisa y gestiona las importaciones anteriores</CardDescription>
              </CardHeader>
              <CardContent>
                <ImportHistory />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
