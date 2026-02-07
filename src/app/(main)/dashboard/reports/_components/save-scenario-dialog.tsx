"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useScenarios } from "@/hooks/use-scenarios";
import type { SummaryReportParams } from "@/lib/api/types";

const scenarioSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres"),
});

type ScenarioFormData = z.infer<typeof scenarioSchema>;

interface SaveScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportParams: SummaryReportParams;
}

export function SaveScenarioDialog({ open, onOpenChange, reportParams }: SaveScenarioDialogProps) {
  const { saveScenario, isSaving } = useScenarios(reportParams.company_id, reportParams.year);

  const form = useForm<ScenarioFormData>({
    resolver: zodResolver(scenarioSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: ScenarioFormData) => {
    try {
      await saveScenario({
        name: data.name,
        description: data.description,
        company_id: reportParams.company_id,
        year: reportParams.year,
        budget_version: reportParams.budget_version || 1,
      });
      toast.success("✅ Escenario guardado correctamente");
      form.reset();
      onOpenChange(false);
    } catch (_error) {
      toast.error("Error al guardar escenario");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar Escenario</DialogTitle>
          <DialogDescription>Guarda este reporte como escenario para compararlo después con otros</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Escenario</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Escenario Optimista 2025" {...field} />
                  </FormControl>
                  <FormDescription>Nombre descriptivo para identificar este escenario</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Usando budget v1 con precios conservadores" {...field} />
                  </FormControl>
                  <FormDescription>Detalles adicionales sobre este escenario</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Año:</span>
                  <span className="font-medium">{reportParams.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versión Budget:</span>
                  <span className="font-medium">v{reportParams.budget_version || 1}</span>
                </div>
                {reportParams.months && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meses:</span>
                    <span className="font-medium">{reportParams.months.length} seleccionados</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Escenario"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
