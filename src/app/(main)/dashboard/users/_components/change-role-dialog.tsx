"use client";

import { useState } from "react";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CompanyRole, User } from "@/lib/api/types";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  currentRole: CompanyRole | null;
  companyName: string;
  onSubmit: (data: { userId: number; role: CompanyRole }) => Promise<void>;
  isLoading: boolean;
}

const COMPANY_ROLES: { value: CompanyRole; label: string; description: string }[] = [
  { value: "viewer", label: "Viewer", description: "Solo puede ver datos y reportes" },
  { value: "editor", label: "Editor", description: "Puede importar datos y guardar reportes" },
  { value: "admin", label: "Admin", description: "Control total + gestión de usuarios de la compañía" },
];

const _ROLE_COLORS: Record<CompanyRole, string> = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  editor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  viewer: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export function ChangeRoleDialog({
  open,
  onOpenChange,
  user,
  currentRole,
  companyName,
  onSubmit,
  isLoading,
}: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<CompanyRole>(currentRole || "viewer");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) return;

    if (selectedRole === currentRole) {
      toast.info("El rol no ha cambiado");
      onOpenChange(false);
      return;
    }

    try {
      await onSubmit({ userId: user.id, role: selectedRole });
      toast.success(`Rol actualizado a ${selectedRole}`);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Error al cambiar rol");
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Cambiar Rol</DialogTitle>
          <DialogDescription>
            Modificar el rol de {user.first_name} {user.last_name} en {companyName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Label>Seleccionar Rol</Label>
            <RadioGroup value={selectedRole} onValueChange={(v) => setSelectedRole(v as CompanyRole)}>
              {COMPANY_ROLES.map((role) => (
                <div
                  key={role.value}
                  className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors ${
                    selectedRole === role.value ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <RadioGroupItem value={role.value} id={role.value} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={role.value} className="flex cursor-pointer items-center gap-2 font-medium">
                      {role.label}
                      {currentRole === role.value && (
                        <Badge variant="outline" className="text-xs">
                          Actual
                        </Badge>
                      )}
                    </Label>
                    <p className="text-muted-foreground text-sm">{role.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || selectedRole === currentRole}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
