"use client";

import { useState } from "react";

import { Building2, Edit, Key, MoreHorizontal, Plus, RefreshCw, Shield, Trash2, UserCog } from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyAdminUsers, useSuperAdminUsers } from "@/hooks/use-users";
import type { CompanyRole, UpdateUserRequest, User, UserCompany } from "@/lib/api/types";

import { AssignCompanyDialog } from "./_components/assign-company-dialog";
import { ChangeRoleDialog } from "./_components/change-role-dialog";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { DeactivateUserDialog } from "./_components/deactivate-user-dialog";
import { EditUserDialog } from "./_components/edit-user-dialog";
import { SetPasswordDialog } from "./_components/set-password-dialog";

const PERMISSION_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const PERMISSION_COLORS: Record<string, string> = {
  super_admin: "bg-purple-500/10 text-purple-500",
  admin: "bg-red-500/10 text-red-500",
  editor: "bg-blue-500/10 text-blue-500",
  viewer: "bg-gray-500/10 text-gray-500",
};

const ROLE_COLORS: Record<CompanyRole, string> = {
  admin: "bg-red-500/10 text-red-500",
  editor: "bg-blue-500/10 text-blue-500",
  viewer: "bg-gray-500/10 text-gray-500",
};

export default function UsersPage() {
  const { isSuperAdmin, userManagementMode, selectedCompanyId, adminCompanies } = useAuth();

  // Use appropriate hook based on mode
  const superAdminHook = useSuperAdminUsers();
  const companyAdminHook = useCompanyAdminUsers(
    userManagementMode === "company_admin" ? adminCompanies[0]?.company_id : null,
  );

  // Select the active hook
  const activeHook = isSuperAdmin ? superAdminHook : companyAdminHook;
  const { users, isLoading, error, refetch, page, setPage, totalPages, totalCount } = activeHook;

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignCompanyDialogOpen, setAssignCompanyDialogOpen] = useState(false);
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [setPasswordDialogOpen, setSetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Get current role for company admin mode
  const getCurrentUserRole = (user: User): CompanyRole | null => {
    if (!selectedCompanyId || !user.companies) return null;
    const company = user.companies.find((c) => c.company_id === selectedCompanyId);
    return company?.role || null;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPermissionBadges = (permissions: string[] | undefined) => {
    if (!permissions || permissions.length === 0) {
      return <Badge variant="outline">Sin permisos</Badge>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {permissions.map((perm) => (
          <Badge key={perm} variant="outline" className={PERMISSION_COLORS[perm] || ""}>
            {PERMISSION_LABELS[perm] || perm}
          </Badge>
        ))}
      </div>
    );
  };

  const getCompanyBadges = (companies: UserCompany[] | undefined) => {
    if (!companies || companies.length === 0) {
      return <span className="text-muted-foreground text-xs">Sin compañías</span>;
    }
    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-1">
          {companies.slice(0, 2).map((company) => (
            <Tooltip key={company.company_id}>
              <TooltipTrigger>
                <Badge variant="outline" className={ROLE_COLORS[company.role]}>
                  {company.company_name.length > 15 ? `${company.company_name.slice(0, 15)}...` : company.company_name}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {company.company_name} - {company.role}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
          {companies.length > 2 && <Badge variant="outline">+{companies.length - 2} más</Badge>}
        </div>
      </TooltipProvider>
    );
  };

  // Handle actions
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleAssignCompany = (user: User) => {
    setSelectedUser(user);
    setAssignCompanyDialogOpen(true);
  };

  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setChangeRoleDialogOpen(true);
  };

  const handleDeactivate = (user: User) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  };

  const handleSetPassword = (user: User) => {
    setSelectedUser(user);
    setSetPasswordDialogOpen(true);
  };

  // No access message
  if (!userManagementMode) {
    return (
      <AuthGuard requiredPermission="can_manage_users">
        <div className="space-y-4">
          <div>
            <h1 className="font-semibold text-3xl tracking-tight">Usuarios</h1>
            <p className="text-muted-foreground text-sm">Gestión de usuarios del sistema</p>
          </div>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              No tienes permisos para gestionar usuarios. Contacta a un administrador si necesitas acceso.
            </AlertDescription>
          </Alert>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredPermission="can_manage_users">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-3xl tracking-tight">Usuarios</h1>
            <p className="text-muted-foreground text-sm">
              {isSuperAdmin
                ? "Gestión de todos los usuarios del sistema"
                : `Usuarios de ${adminCompanies[0]?.company_name || "tu compañía"}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Mode indicator */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={isSuperAdmin ? PERMISSION_COLORS.super_admin : PERMISSION_COLORS.admin}>
            {isSuperAdmin ? "Modo Super Admin" : "Modo Admin de Compañía"}
          </Badge>
          {!isSuperAdmin && adminCompanies.length > 0 && (
            <Badge variant="secondary">
              <Building2 className="mr-1 h-3 w-3" />
              {adminCompanies[0].company_name}
            </Badge>
          )}
          <span className="text-muted-foreground text-sm">
            {totalCount} usuario{totalCount !== 1 ? "s" : ""}
          </span>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios Registrados</CardTitle>
            <CardDescription>
              {isSuperAdmin ? "Personal autorizado para acceder al sistema" : "Usuarios con acceso a esta compañía"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Área</TableHead>
                  {isSuperAdmin && <TableHead>Permisos</TableHead>}
                  <TableHead>Compañías</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="w-[70px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((id) => (
                    <TableRow key={id}>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      )}
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 8 : 7} className="h-24 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-muted-foreground text-xs">ID: {user.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-xs">{user.dni}</code>
                      </TableCell>
                      <TableCell>{user.work_area || "-"}</TableCell>
                      {isSuperAdmin && <TableCell>{getPermissionBadges(user.permissions)}</TableCell>}
                      <TableCell>{getCompanyBadges(user.companies)}</TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "default" : "secondary"}>
                          {user.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {isSuperAdmin ? (
                              <>
                                <DropdownMenuItem onClick={() => handleAssignCompany(user)}>
                                  <Building2 className="mr-2 h-4 w-4" />
                                  Gestionar Compañías
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSetPassword(user)}>
                                  <Key className="mr-2 h-4 w-4" />
                                  Cambiar Contraseña
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                                <UserCog className="mr-2 h-4 w-4" />
                                Cambiar Rol
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeactivate(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Desactivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages || isLoading}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <CreateUserDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={isSuperAdmin ? superAdminHook.createUser : companyAdminHook.createUser}
          isLoading={isSuperAdmin ? superAdminHook.isCreating : companyAdminHook.isCreating}
          mode={isSuperAdmin ? "super_admin" : "company_admin"}
          companyName={!isSuperAdmin ? adminCompanies[0]?.company_name : undefined}
        />

        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUser}
          onSubmit={
            isSuperAdmin
              ? (data) => superAdminHook.updateUser(data as { id: number; data: UpdateUserRequest })
              : (data) => companyAdminHook.updateUser(data as { userId: number; data: UpdateUserRequest })
          }
          isLoading={isSuperAdmin ? superAdminHook.isUpdating : companyAdminHook.isUpdating}
        />

        {isSuperAdmin && (
          <>
            <AssignCompanyDialog
              open={assignCompanyDialogOpen}
              onOpenChange={setAssignCompanyDialogOpen}
              user={selectedUser}
              onAssign={superAdminHook.assignToCompany}
              onUpdateRole={superAdminHook.updateCompanyRole}
              onRemove={superAdminHook.removeFromCompany}
              isLoading={
                superAdminHook.isAssigningToCompany ||
                superAdminHook.isUpdatingRole ||
                superAdminHook.isRemovingFromCompany
              }
            />

            <SetPasswordDialog
              open={setPasswordDialogOpen}
              onOpenChange={setSetPasswordDialogOpen}
              user={selectedUser}
              onSubmit={superAdminHook.setPassword}
              isLoading={superAdminHook.isSettingPassword}
            />
          </>
        )}

        {!isSuperAdmin && (
          <ChangeRoleDialog
            open={changeRoleDialogOpen}
            onOpenChange={setChangeRoleDialogOpen}
            user={selectedUser}
            currentRole={selectedUser ? getCurrentUserRole(selectedUser) : null}
            companyName={adminCompanies[0]?.company_name || ""}
            onSubmit={companyAdminHook.updateRole}
            isLoading={companyAdminHook.isUpdatingRole}
          />
        )}

        <DeactivateUserDialog
          open={deactivateDialogOpen}
          onOpenChange={setDeactivateDialogOpen}
          user={selectedUser}
          onConfirm={isSuperAdmin ? superAdminHook.deactivateUser : companyAdminHook.deactivateUser}
          isLoading={isSuperAdmin ? superAdminHook.isDeactivating : companyAdminHook.isDeactivating}
        />
      </div>
    </AuthGuard>
  );
}
