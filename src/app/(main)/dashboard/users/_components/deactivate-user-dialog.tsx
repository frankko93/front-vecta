"use client";

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
import type { User } from "@/lib/api/types";

interface DeactivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: (id: number) => Promise<void>;
  isLoading: boolean;
}

export function DeactivateUserDialog({ open, onOpenChange, user, onConfirm, isLoading }: DeactivateUserDialogProps) {
  const handleConfirm = async () => {
    if (!user) return;

    try {
      await onConfirm(user.id);
      toast.success("Usuario desactivado exitosamente");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg ?? "Error al desactivar usuario");
    }
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desactivar usuario?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de desactivar a{" "}
            <strong>
              {user.first_name} {user.last_name}
            </strong>{" "}
            (DNI: {user.dni}).
            <br />
            <br />
            El usuario no podrá acceder al sistema hasta que sea reactivado. Esta acción puede ser revertida.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Desactivando..." : "Desactivar Usuario"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
