"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { BarChart3, Building2, Calendar, FileStack } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import type { SummaryReportParams } from "@/lib/api/types";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";

const filterSchema = z.object({
  company_id: z.string().min(1, "Selecciona una empresa"),
  year: z.number(),
  months: z.array(z.number()).optional(),
  budget_version: z.number().optional(),
});

type FilterFormData = z.infer<typeof filterSchema>;

interface ReportFiltersProps {
  onFilter: (params: SummaryReportParams) => void;
}

const MONTHS = [
  { value: 1, label: "Ene" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Abr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Ago" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dic" },
];

export function ReportFilters({ onFilter }: ReportFiltersProps) {
  const { userCompanies } = useAuth();
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      year: storage.getLastYear(),
      budget_version: storage.getLastBudgetVersion(),
    },
  });

  useEffect(() => {
    if (userCompanies.length > 0 && !form.getValues("company_id")) {
      const lastCompany = storage.getLastCompany();
      if (lastCompany && userCompanies.find((c) => c.company_id === lastCompany)) {
        form.setValue("company_id", lastCompany.toString());
      } else {
        form.setValue("company_id", userCompanies[0].company_id.toString());
      }
    }
  }, [userCompanies, form]);

  const onSubmit = (data: FilterFormData) => {
    const params = {
      company_id: parseInt(data.company_id, 10),
      year: data.year,
      months: selectedMonths.length > 0 ? selectedMonths : undefined,
      budget_version: data.budget_version,
    };

    storage.setLastCompany(params.company_id);
    storage.setLastYear(params.year);
    storage.setLastBudgetVersion(params.budget_version || 1);

    onFilter(params);
  };

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month].sort((a, b) => a - b),
    );
  };

  const selectAllMonths = () => setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const clearAllMonths = () => setSelectedMonths([]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Main filters row */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Company selector */}
          <FormField
            control={form.control}
            name="company_id"
            render={({ field }) => (
              <FormItem className="min-w-[180px] flex-1">
                <div className="mb-1.5 flex items-center gap-2 text-muted-foreground text-xs">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Empresa</span>
                </div>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecciona empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {userCompanies.map((company) => (
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

          {/* Year selector */}
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem className="w-[100px]">
                <div className="mb-1.5 flex items-center gap-2 text-muted-foreground text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Año</span>
                </div>
                <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Budget version selector */}
          <FormField
            control={form.control}
            name="budget_version"
            render={({ field }) => (
              <FormItem className="w-[140px]">
                <div className="mb-1.5 flex items-center gap-2 text-muted-foreground text-xs">
                  <FileStack className="h-3.5 w-3.5" />
                  <span>Budget</span>
                </div>
                <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">v1 - Original</SelectItem>
                    <SelectItem value="2">v2 - Ajustado</SelectItem>
                    <SelectItem value="3">v3 - Actual</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Generate button */}
          <Button type="submit" className="h-9 px-6">
            <BarChart3 className="mr-2 h-4 w-4" />
            Generar
          </Button>
        </div>

        {/* Months selector - compact pills */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
          <span className="mr-1 text-muted-foreground text-xs">Meses:</span>

          {/* Month pills */}
          <div className="flex flex-wrap gap-1">
            {MONTHS.map((month) => {
              const isSelected = selectedMonths.includes(month.value);
              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => toggleMonth(month.value)}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-medium text-xs transition-all",
                    "border hover:border-primary/50",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {month.label}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={selectAllMonths}
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                selectedMonths.length === 12 ? "text-muted-foreground" : "text-primary hover:bg-primary/10",
              )}
            >
              Todos
            </button>
            <span className="text-muted-foreground/50">|</span>
            <button
              type="button"
              onClick={clearAllMonths}
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                selectedMonths.length === 0 ? "text-muted-foreground" : "text-primary hover:bg-primary/10",
              )}
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Selected months indicator */}
        {selectedMonths.length > 0 && selectedMonths.length < 12 && (
          <div className="text-muted-foreground text-xs">
            {selectedMonths.length} {selectedMonths.length === 1 ? "mes seleccionado" : "meses seleccionados"}
          </div>
        )}
      </form>
    </Form>
  );
}
