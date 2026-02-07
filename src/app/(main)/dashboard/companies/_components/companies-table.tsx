"use client";

import { useEffect, useState } from "react";

import { Building2, Mail, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useCompanies } from "@/hooks/use-companies";
import type { Company } from "@/lib/api/types";

import { CompanyContactDialog } from "./company-contact-dialog";

interface CompaniesTableProps {
  companies: Company[];
}

export function CompaniesTable({ companies }: CompaniesTableProps) {
  const { isAdmin } = useAuth();
  const { deleteCompany } = useCompanies();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [contactCompany, setContactCompany] = useState<Company | null>(null);
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [enrichedCompanies, setEnrichedCompanies] = useState<Company[]>(companies);

  // Load full details for each company
  useEffect(() => {
    const loadDetails = async () => {
      const { companiesService } = await import("@/lib/api");

      const detailedCompanies = await Promise.all(
        companies.map(async (company) => {
          // Skip if already has details
          if (company.settings && company.minerals) {
            return company;
          }

          try {
            return await companiesService.getById(company.id);
          } catch {
            return company; // Return original if fetch fails
          }
        }),
      );

      setEnrichedCompanies(detailedCompanies);
    };

    if (companies.length > 0) {
      loadDetails();
    }
  }, [companies]);

  const handleViewContact = async (company: Company) => {
    // If company already has settings/minerals, use it
    if (company.settings && company.minerals) {
      setContactCompany(company);
      return;
    }

    // Otherwise fetch full details
    setIsLoadingContact(true);
    try {
      const { companiesService } = await import("@/lib/api");
      const fullCompany = await companiesService.getById(company.id);
      setContactCompany(fullCompany);
    } catch (_error) {
      toast.error("Error al cargar detalles de empresa");
    } finally {
      setIsLoadingContact(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    try {
      await deleteCompany(deleteId);
      toast.success("Empresa eliminada correctamente");
    } catch (_error) {
      toast.error("Error al eliminar empresa");
    } finally {
      setDeleteId(null);
    }
  };

  if (companies.length === 0) {
    return (
      <div className="py-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-semibold text-lg">No hay empresas</h3>
        <p className="mt-2 text-muted-foreground text-sm">Comienza creando una nueva empresa minera</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Razón Social</TableHead>
            <TableHead>CUIT</TableHead>
            <TableHead>Minerales</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Regalías</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrichedCompanies.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>{company.legal_name}</TableCell>
              <TableCell>
                <code className="text-xs">{company.tax_id}</code>
              </TableCell>
              <TableCell>
                {company.minerals && company.minerals.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {company.minerals.map((mineral) => (
                      <Badge key={mineral.id} variant="secondary" className="text-[10px]">
                        {mineral.code}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                {company.settings?.mining_type ? (
                  <Badge variant="outline" className="text-[10px]">
                    {company.settings.mining_type === "open_pit"
                      ? "Cielo Abierto"
                      : company.settings.mining_type === "underground"
                        ? "Subterránea"
                        : "Ambas"}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                {company.settings?.royalty_percentage !== undefined ? (
                  <span className="font-medium text-sm">{company.settings.royalty_percentage}%</span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={company.active ? "default" : "secondary"}>
                  {company.active ? "Activa" : "Inactiva"}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewContact(company)}
                  disabled={isLoadingContact}
                >
                  <Mail className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <>
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(company.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CompanyContactDialog
        company={contactCompany}
        open={contactCompany !== null}
        onOpenChange={(open) => !open && setContactCompany(null)}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la empresa y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
