"use client";

import { useState } from "react";

import { Eye, EyeOff, Key } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/api";

interface ChangePasswordDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

/**
 * Dialog for authenticated user to change their own password
 * After changing, all sessions are invalidated and user must login again
 */
export function ChangePasswordDialog({ trigger, onSuccess }: ChangePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password length
    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // Validate not same as current
    if (newPassword === currentPassword) {
      setError("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    setIsLoading(true);

    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      toast.success("Contraseña cambiada exitosamente. Por favor inicia sesión nuevamente.");
      setOpen(false);
      resetForm();

      // Callback for logout/redirect
      if (onSuccess) {
        onSuccess();
      } else {
        // Default: redirect to login after a short delay
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 1500);
      }
    } catch (err: unknown) {
      const res =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { status?: number; data?: { message?: string } } }).response
          : undefined;
      const status = res?.status;
      const message = res?.data?.message;
      if (status === 401) {
        setError("La contraseña actual es incorrecta");
      } else if (status === 400) {
        setError(message ?? "La nueva contraseña no cumple los requisitos");
      } else {
        setError(message ?? "Error al cambiar contraseña");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Cambiar Contraseña
          </DialogTitle>
          <DialogDescription>Ingresa tu contraseña actual y la nueva contraseña</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="current_password">Contraseña Actual</Label>
            <div className="relative">
              <Input
                id="current_password"
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password_self">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="new_password_self"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">Mínimo 6 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password_self">Confirmar Nueva Contraseña</Label>
            <Input
              id="confirm_password_self"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="rounded-lg bg-amber-500/10 p-3 text-amber-600 text-sm dark:text-amber-400">
            <p>
              <strong>Importante:</strong> Después de cambiar tu contraseña, deberás iniciar sesión nuevamente.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Cambiando..." : "Cambiar Contraseña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
