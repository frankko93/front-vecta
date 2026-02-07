"use client";

import { Globe, Mail, MapPin, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Company } from "@/lib/api/types";

interface CompanyContactDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyContactDialog({ company, open, onOpenChange }: CompanyContactDialogProps) {
  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{company.name}</DialogTitle>
          <DialogDescription>{company.legal_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="font-semibold text-muted-foreground text-sm">Información de Contacto</h4>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-xs">Teléfono</p>
                <p className="font-medium text-sm">{company.contact_phone || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Mail className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium text-sm">{company.contact_email || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-xs">Dirección</p>
                <p className="font-medium text-sm">{company.address || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
                <Globe className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-xs">País</p>
                <p className="font-medium text-sm">{company.settings?.country || "-"}</p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">CUIT</span>
              <span className="font-medium">{company.tax_id}</span>
            </div>
            {company.settings && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tipo de Minería</span>
                  <Badge variant="outline" className="text-[10px]">
                    {company.settings.mining_type === "open_pit"
                      ? "Cielo Abierto"
                      : company.settings.mining_type === "underground"
                        ? "Subterránea"
                        : "Ambas"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Regalías</span>
                  <span className="font-medium">{company.settings.royalty_percentage}%</span>
                </div>
              </>
            )}
            {company.minerals && company.minerals.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Minerales</span>
                <div className="flex gap-1">
                  {company.minerals.map((m) => (
                    <Badge key={m.id} variant="secondary" className="text-[10px]">
                      {m.code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
