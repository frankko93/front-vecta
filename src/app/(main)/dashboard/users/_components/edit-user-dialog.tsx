"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UpdateUserRequest, User } from "@/lib/api/types";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSubmit: (
    data: { id: number; data: UpdateUserRequest } | { userId: number; data: UpdateUserRequest },
  ) => Promise<void>;
  isLoading: boolean;
}

export function EditUserDialog({ open, onOpenChange, user, onSubmit, isLoading }: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    work_area: "",
  });
  const [error, setError] = useState<string | null>(null);

  // Sync form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        work_area: user.work_area || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) return;

    // Build update data (only include changed fields)
    const updateData: UpdateUserRequest = {};
    if (formData.first_name !== user.first_name) {
      updateData.first_name = formData.first_name;
    }
    if (formData.last_name !== user.last_name) {
      updateData.last_name = formData.last_name;
    }
    if (formData.work_area !== (user.work_area || "")) {
      updateData.work_area = formData.work_area;
    }

    // Check if there are changes
    if (Object.keys(updateData).length === 0) {
      toast.info("No hay cambios para guardar");
      onOpenChange(false);
      return;
    }

    try {
      await onSubmit({ id: user.id, data: updateData });
      toast.success("Usuario actualizado exitosamente");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Error al actualizar usuario");
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modificar información de {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_first_name">Nombre</Label>
              <Input
                id="edit_first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_last_name">Apellido</Label>
              <Input
                id="edit_last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Pérez"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_work_area">Área de Trabajo</Label>
            <Input
              id="edit_work_area"
              value={formData.work_area}
              onChange={(e) => setFormData({ ...formData, work_area: e.target.value })}
              placeholder="Operaciones, Finanzas, IT..."
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="text-muted-foreground">
              <strong>DNI:</strong> {user.dni}
            </p>
            <p className="text-muted-foreground">
              <strong>Estado:</strong> {user.active ? "Activo" : "Inactivo"}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
