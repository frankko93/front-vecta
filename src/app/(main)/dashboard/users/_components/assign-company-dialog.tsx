"use client";

import { useState } from "react";

import { Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCompanies } from "@/hooks/use-companies";
import type { Company, CompanyRole, User, UserCompany } from "@/lib/api/types";

interface AssignCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onAssign: (data: { user_id: number; company_id: number; role: CompanyRole }) => Promise<void>;
  onUpdateRole: (data: { userId: number; companyId: number; role: CompanyRole }) => Promise<void>;
  onRemove: (data: { userId: number; companyId: number }) => Promise<void>;
  isLoading: boolean;
}

const COMPANY_ROLES: { value: CompanyRole; label: string; description: string }[] = [
  { value: "viewer", label: "Viewer", description: "Solo puede ver datos" },
  { value: "editor", label: "Editor", description: "Puede importar y editar datos" },
  { value: "admin", label: "Admin", description: "Control total + gestión de usuarios" },
];

const ROLE_COLORS: Record<CompanyRole, string> = {
  admin: "bg-red-500/10 text-red-500",
  editor: "bg-blue-500/10 text-blue-500",
  viewer: "bg-gray-500/10 text-gray-500",
};

export function AssignCompanyDialog({
  open,
  onOpenChange,
  user,
  onAssign,
  onUpdateRole,
  onRemove,
  isLoading,
}: AssignCompanyDialogProps) {
  const { companies } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<CompanyRole>("viewer");
  const [error, setError] = useState<string | null>(null);

  // Get companies not yet assigned to user
  const availableCompanies = companies.filter(
    (company: Company) => !user?.companies?.some((uc: UserCompany) => uc.company_id === company.id),
  );

  const handleAssign = async () => {
    if (!user || !selectedCompanyId) return;
    setError(null);

    try {
      await onAssign({
        user_id: user.id,
        company_id: parseInt(selectedCompanyId, 10),
        role: selectedRole,
      });
      toast.success("Usuario asignado a la compañía");
      setSelectedCompanyId("");
      setSelectedRole("viewer");
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Error al asignar usuario");
    }
  };

  const handleUpdateRole = async (companyId: number, newRole: CompanyRole) => {
    if (!user) return;
    setError(null);

    try {
      await onUpdateRole({
        userId: user.id,
        companyId,
        role: newRole,
      });
      toast.success("Rol actualizado");
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Error al actualizar rol");
    }
  };

  const handleRemove = async (companyId: number) => {
    if (!user) return;
    setError(null);

    try {
      await onRemove({
        userId: user.id,
        companyId,
      });
      toast.success("Usuario removido de la compañía");
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Error al remover usuario");
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gestionar Compañías</DialogTitle>
          <DialogDescription>
            Asignar o modificar las compañías de {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current assignments */}
          <div className="space-y-2">
            <Label>Compañías Asignadas</Label>
            {user.companies && user.companies.length > 0 ? (
              <div className="space-y-2">
                {user.companies.map((company: UserCompany) => (
                  <div key={company.company_id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{company.company_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={company.role}
                        onValueChange={(value) => handleUpdateRole(company.company_id, value as CompanyRole)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(company.company_id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">El usuario no está asignado a ninguna compañía</p>
            )}
          </div>

          <Separator />

          {/* Add new assignment */}
          <div className="space-y-3">
            <Label>Agregar Nueva Compañía</Label>
            {availableCompanies.length > 0 ? (
              <div className="flex gap-2">
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar compañía" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map((company: Company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as CompanyRole)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssign} disabled={!selectedCompanyId || isLoading}>
                  Asignar
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                El usuario ya está asignado a todas las compañías disponibles
              </p>
            )}
          </div>

          {/* Role descriptions */}
          <div className="rounded-lg bg-muted p-3">
            <p className="mb-2 font-medium text-sm">Descripción de Roles:</p>
            <div className="space-y-1 text-muted-foreground text-xs">
              {COMPANY_ROLES.map((role) => (
                <p key={role.value}>
                  <Badge variant="outline" className={ROLE_COLORS[role.value]}>
                    {role.label}
                  </Badge>{" "}
                  - {role.description}
                </p>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
