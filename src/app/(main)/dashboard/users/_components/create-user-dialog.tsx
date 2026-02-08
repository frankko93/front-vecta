"use client";

import { useState } from "react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CreateCompanyUserRequest, CreateUserRequest, SystemPermission } from "@/lib/api/types";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserRequest | CreateCompanyUserRequest) => Promise<unknown>;
  isLoading: boolean;
  mode: "super_admin" | "company_admin";
  companyName?: string;
}

const SYSTEM_PERMISSIONS: { value: SystemPermission; label: string }[] = [
  { value: "viewer", label: "Viewer - Solo lectura" },
  { value: "editor", label: "Editor - Crear y editar datos" },
  { value: "admin", label: "Admin - Gestión completa" },
];

export function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  mode,
  companyName,
}: CreateUserDialogProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    dni: "",
    birth_date: "",
    work_area: "",
    password: "",
    permission: "viewer" as SystemPermission,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.dni || !formData.password) {
      setError("Por favor completa todos los campos requeridos");
      return;
    }

    try {
      // Convert date to ISO 8601 format if provided (YYYY-MM-DD -> YYYY-MM-DDTHH:MM:SSZ)
      const birthDateISO = formData.birth_date ? `${formData.birth_date}T00:00:00Z` : "";

      if (mode === "super_admin") {
        // Super admin can set permissions
        await onSubmit({
          first_name: formData.first_name,
          last_name: formData.last_name,
          dni: formData.dni,
          birth_date: birthDateISO,
          work_area: formData.work_area,
          password: formData.password,
          permissions: [formData.permission],
        } as CreateUserRequest);
      } else {
        // Company admin creates user without permissions
        await onSubmit({
          first_name: formData.first_name,
          last_name: formData.last_name,
          dni: formData.dni,
          birth_date: birthDateISO,
          work_area: formData.work_area,
          password: formData.password,
        } as CreateCompanyUserRequest);
      }

      toast.success("Usuario creado exitosamente");
      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Error al crear usuario");
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      dni: "",
      birth_date: "",
      work_area: "",
      password: "",
      permission: "viewer",
    });
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          <DialogDescription>
            {mode === "company_admin" && companyName
              ? `El usuario será asignado automáticamente a ${companyName} con rol Viewer`
              : "Ingresa los datos del nuevo usuario del sistema"}
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
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Juan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Pérez"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dni">DNI *</Label>
              <Input
                id="dni"
                value={formData.dni}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                placeholder="12345678"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="work_area">Área de Trabajo</Label>
            <Input
              id="work_area"
              value={formData.work_area}
              onChange={(e) => setFormData({ ...formData, work_area: e.target.value })}
              placeholder="Operaciones, Finanzas, IT..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          {mode === "super_admin" && (
            <div className="space-y-2">
              <Label htmlFor="permission">Permisos del Sistema</Label>
              <Select
                value={formData.permission}
                onValueChange={(value) => setFormData({ ...formData, permission: value as SystemPermission })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar permisos" />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_PERMISSIONS.map((perm) => (
                    <SelectItem key={perm.value} value={perm.value}>
                      {perm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">Los permisos determinan las acciones globales del usuario</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
