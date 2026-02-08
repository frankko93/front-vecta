"use client";

import { useEffect, useState } from "react";

import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useDataImport } from "@/hooks/use-data-import";
import type { CAPEXData, DataType, DoreData, FinancialData, ImportType, OPEXData, PBRData } from "@/lib/api/types";

type ImportHistoryItem = PBRData | DoreData | OPEXData | CAPEXData | FinancialData;

export function ImportHistory() {
  const { userCompanies } = useAuth();
  const { deleteData } = useDataImport();

  const [company, setCompany] = useState<number | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [type, setType] = useState<ImportType>("pbr");
  const [dataType, setDataType] = useState<DataType>("actual");
  const [data, setData] = useState<ImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!company) return;

    const load = async () => {
      setLoading(true);
      try {
        const { dataService } = await import("@/lib/api");
        const result = await dataService.list<ImportHistoryItem>(type, {
          company_id: company,
          year,
          data_type: dataType,
        });
        setData(result);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [company, year, type, dataType]);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este registro?")) return;

    try {
      await deleteData({ type, id });
      setData((prev) => prev.filter((item) => item.id !== id));
      toast.success("Eliminado");
    } catch {
      toast.error("Error");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Select value={company?.toString() || ""} onValueChange={(v) => setCompany(v ? Number(v) : null)}>
          <SelectTrigger>
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            {userCompanies.map((c) => (
              <SelectItem key={c.company_id} value={c.company_id.toString()}>
                {c.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={(v) => setType(v as ImportType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pbr">PBR</SelectItem>
            <SelectItem value="dore">Dore</SelectItem>
            <SelectItem value="opex">OPEX</SelectItem>
            <SelectItem value="capex">CAPEX</SelectItem>
            <SelectItem value="financial">Financial</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="actual">Actual</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !company ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto h-10 w-10 opacity-30" />
          <p className="mt-3 text-sm">Selecciona empresa para ver historial</p>
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto h-10 w-10 opacity-30" />
          <p className="mt-3 text-sm">Sin registros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Info header */}
          <div className="flex items-center justify-between px-1 text-muted-foreground text-xs">
            <span>
              {data.length} registro{data.length !== 1 ? "s" : ""} encontrado{data.length !== 1 ? "s" : ""}
            </span>
            <span>Versión: v{data[0]?.version || 1}</span>
          </div>

          {/* Data list */}
          <div className="space-y-1.5">
            {data.map((item) => {
              // Get key values based on type
              const getKeyValues = () => {
                switch (type) {
                  case "pbr": {
                    const pbr = item as PBRData;
                    return [
                      {
                        label: "Mineral",
                        value: pbr.ore_mined_t ? `${Number(pbr.ore_mined_t).toLocaleString()} t` : null,
                      },
                      {
                        label: "Procesado",
                        value: pbr.total_tonnes_processed
                          ? `${Number(pbr.total_tonnes_processed).toLocaleString()} t`
                          : null,
                      },
                    ];
                  }
                  case "dore": {
                    const dore = item as DoreData;
                    return [
                      {
                        label: "Doré",
                        value: dore.dore_produced_oz ? `${Number(dore.dore_produced_oz).toLocaleString()} oz` : null,
                      },
                      { label: "Ag%", value: dore.silver_grade_pct ? `${dore.silver_grade_pct}%` : null },
                    ];
                  }
                  case "opex": {
                    const opex = item as OPEXData;
                    return [
                      { label: "Centro", value: opex.cost_center },
                      { label: "Monto", value: opex.amount ? `$${Number(opex.amount).toLocaleString()}` : null },
                    ];
                  }
                  case "capex": {
                    const capex = item as CAPEXData;
                    return [
                      { label: "Proyecto", value: capex.project_name },
                      { label: "Monto", value: capex.amount ? `$${Number(capex.amount).toLocaleString()}` : null },
                    ];
                  }
                  case "financial": {
                    const fin = item as FinancialData;
                    return [
                      {
                        label: "Impuestos",
                        value: fin.sales_taxes_royalties
                          ? `$${Number(fin.sales_taxes_royalties).toLocaleString()}`
                          : null,
                      },
                    ];
                  }
                  default:
                    return [];
                }
              };

              const keyValues = getKeyValues().filter((kv) => kv.value);

              return (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-1 items-center gap-4 text-sm">
                    <span className="w-14 font-medium tabular-nums">
                      {new Date(item.date).toLocaleDateString("es", { day: "2-digit", month: "short" })}
                    </span>
                    <div className="flex gap-3 text-muted-foreground text-xs">
                      {keyValues.map((kv) => (
                        <span key={`${kv.label}-${kv.value}`}>
                          <span className="hidden sm:inline">{kv.label}: </span>
                          <span className="font-medium text-foreground">{kv.value}</span>
                        </span>
                      ))}
                    </div>
                    {item.description && (
                      <span className="ml-auto hidden text-muted-foreground text-xs lg:inline">{item.description}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
