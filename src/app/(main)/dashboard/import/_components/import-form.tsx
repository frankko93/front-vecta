"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Upload, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useDataImport } from "@/hooks/use-data-import";

const importSchema = z.object({
  company_id: z.string().min(1, "Selecciona una empresa"),
  type: z.enum(["pbr", "dore", "opex", "capex", "financial", "production", "revenue"]),
  data_type: z.enum(["actual", "budget"]),
  version: z.number().optional(),
  description: z.string().optional(),
  file: z.instanceof(File).refine((file) => file.size > 0, "Debes seleccionar un archivo"),
});

type ImportFormData = z.infer<typeof importSchema>;

interface ImportFormProps {
  onSuccess?: () => void;
}

export function ImportForm({ onSuccess }: ImportFormProps) {
  const { userCompanies, canEdit } = useAuth();
  const { importData, isImporting, importResult } = useDataImport();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Only show companies where user can edit (editor or admin role)
  const editableCompanies = userCompanies.filter((c) => canEdit(c.company_id));

  const form = useForm<ImportFormData>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      data_type: "actual",
    },
  });

  const dataType = form.watch("data_type");

  // Handle data_type changes: set version for budget, clear for actual
  useEffect(() => {
    if (dataType === "budget") {
      const currentVersion = form.getValues("version");
      if (!currentVersion) {
        form.setValue("version", 1);
      }
    } else if (dataType === "actual") {
      form.setValue("version", undefined);
    }
  }, [dataType, form]);

  const onSubmit = async (data: ImportFormData) => {
    if (!selectedFile) return;
    try {
      const result = await importData({
        file: selectedFile,
        type: data.type,
        data_type: data.data_type,
        company_id: parseInt(data.company_id, 10),
        // Only send version for budget data type
        version: data.data_type === "budget" ? data.version : undefined,
        description: data.description,
      });

      if (result.success) {
        toast.success(`${result.rows_inserted} filas importadas correctamente`);
        form.reset();
        setSelectedFile(null);
        onSuccess?.();
      } else {
        toast.error(`Error: ${result.rows_failed} filas fallaron`);
      }
    } catch (_error) {
      toast.error("Error al importar archivo");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="company_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {editableCompanies.map((company) => (
                      <SelectItem key={company.company_id} value={company.company_id.toString()}>
                        {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Datos</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pbr">PBR (Plan Beneficio Regional)</SelectItem>
                    <SelectItem value="dore">Dore</SelectItem>
                    <SelectItem value="opex">OPEX (Costos Operativos)</SelectItem>
                    <SelectItem value="capex">CAPEX (Capital)</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="data_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="actual">Actual</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {dataType === "budget" && (
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Versión</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      value={field.value ?? 1}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                    />
                  </FormControl>
                  <FormDescription>Ej: Budget v1, v2, v3...</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Budget ajustado Junio" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="file"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Archivo CSV</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        onChange(file);
                      }
                    }}
                    {...field}
                  />
                  {selectedFile && <span className="text-muted-foreground text-sm">{selectedFile.name}</span>}
                </div>
              </FormControl>
              <FormDescription>Solo archivos CSV. Primera fila debe contener headers.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {importResult && (
          <Alert variant={importResult.success ? "default" : "destructive"}>
            <div className="flex items-start gap-2">
              {importResult.success ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4" />
              )}
              <div className="flex-1">
                <AlertDescription>
                  {importResult.success ? (
                    <div>
                      <p className="font-semibold">Importación exitosa</p>
                      <p>
                        {importResult.rows_inserted} de {importResult.rows_total} filas importadas
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">Error en la importación</p>
                      <p>
                        {importResult.rows_failed} de {importResult.rows_total} filas fallaron
                      </p>
                      {importResult.errors.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="font-medium text-sm">Errores:</p>
                          <ul className="list-inside list-disc text-sm">
                            {importResult.errors.slice(0, 5).map((err) => (
                              <li key={`${err.row}-${err.column}-${err.error}`}>
                                Fila {err.row}, columna &quot;{err.column}&quot;: {err.error}
                              </li>
                            ))}
                            {importResult.errors.length > 5 && <li>... y {importResult.errors.length - 5} más</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        <Button type="submit" disabled={isImporting || !selectedFile} className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          {isImporting ? "Importando..." : "Importar Archivo"}
        </Button>
      </form>
    </Form>
  );
}
