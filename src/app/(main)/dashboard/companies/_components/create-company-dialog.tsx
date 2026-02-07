"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanies } from "@/hooks/use-companies";
import { useConfig } from "@/hooks/use-config";

const companySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  legal_name: z.string().min(1, "La razón social es requerida"),
  tax_id: z.string().min(1, "El CUIT es requerido"),
  address: z.string().min(1, "La dirección es requerida"),
  contact_email: z.string().email("Email inválido"),
  contact_phone: z.string().min(1, "El teléfono es requerido"),
  mining_type: z.enum(["open_pit", "underground", "both"]).default("open_pit"),
  country: z.string().default("Argentina"),
  royalty_percentage: z.number().min(0).max(100).default(3.5),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCompanyDialog({ open, onOpenChange }: CreateCompanyDialogProps) {
  const { createCompany } = useCompanies();
  const { minerals, isLoading: isLoadingMinerals } = useConfig();
  const [selectedMinerals, setSelectedMinerals] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      legal_name: "",
      tax_id: "",
      address: "",
      contact_email: "",
      contact_phone: "",
      mining_type: "open_pit",
      country: "Argentina",
      royalty_percentage: 3.5,
    },
  });

  const { assignMinerals } = useCompanies();

  const onSubmit = async (data: CompanyFormData) => {
    setIsLoading(true);
    try {
      // 1. Create company
      const newCompany = await createCompany(data);

      // 2. Assign minerals if any selected
      if (selectedMinerals.length > 0 && newCompany?.id) {
        await assignMinerals({ id: newCompany.id, mineralIds: selectedMinerals });
      }

      toast.success("Empresa creada correctamente");
      form.reset();
      setSelectedMinerals([]);
      onOpenChange(false);
    } catch (_error) {
      toast.error("Error al crear empresa");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMineral = (mineralId: number) => {
    setSelectedMinerals((prev) =>
      prev.includes(mineralId) ? prev.filter((id) => id !== mineralId) : [...prev, mineralId],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Empresa Minera</DialogTitle>
          <DialogDescription>Completa los datos de la nueva empresa</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Cerro Moro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legal_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón Social</FormLabel>
                    <FormControl>
                      <Input placeholder="Cerro Moro S.A." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CUIT</FormLabel>
                    <FormControl>
                      <Input placeholder="20-12345678-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+54 261 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@cerromoro.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Principal 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <Input placeholder="Argentina" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="royalty_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regalías (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="mining_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Minería</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="open_pit">Cielo Abierto</SelectItem>
                      <SelectItem value="underground">Subterránea</SelectItem>
                      <SelectItem value="both">Ambas</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Tipo de operación minera</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Minerales Selection */}
            <div className="space-y-3">
              <FormLabel>Minerales que Produce</FormLabel>
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                {isLoadingMinerals ? (
                  <p className="col-span-2 text-muted-foreground text-sm">Cargando minerales...</p>
                ) : minerals.length === 0 ? (
                  <p className="col-span-2 text-muted-foreground text-sm">No hay minerales disponibles</p>
                ) : (
                  minerals
                    .filter((m) => m.active)
                    .map((mineral) => (
                      <div key={mineral.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mineral-${mineral.id}`}
                          checked={selectedMinerals.includes(mineral.id)}
                          onCheckedChange={() => toggleMineral(mineral.id)}
                        />
                        <label
                          htmlFor={`mineral-${mineral.id}`}
                          className="cursor-pointer font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {mineral.name} ({mineral.code})
                        </label>
                      </div>
                    ))
                )}
              </div>
              <FormDescription>Selecciona los minerales que esta empresa produce</FormDescription>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creando..." : "Crear Empresa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
