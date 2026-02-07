"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import type { CompanyRole } from "@/lib/api/types";

/**
 * Permission types for route protection
 * - "can_view": User has at least one company (viewer+)
 * - "can_edit": User can edit in at least one company (editor+)
 * - "can_manage_users": User can manage users (company admin or super_admin)
 * - "super_admin": Only super_admin users
 */
export type RoutePermission = "can_view" | "can_edit" | "can_manage_users" | "super_admin";

interface AuthGuardProps {
  children: React.ReactNode;
  /** Require specific role for the selected company */
  requiredRole?: CompanyRole;
  /** Require specific permission */
  requiredPermission?: RoutePermission;
  /** Custom fallback when user doesn't have required role */
  fallback?: React.ReactNode;
}

/**
 * Auth Guard - Protects routes requiring authentication
 * Optionally checks for company-specific role requirements or general permissions
 */
export function AuthGuard({ children, requiredRole, requiredPermission, fallback }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, selectedCompanyId, hasRole, userCompanies, isSuperAdmin, canManageCompanyUsers } =
    useAuth();

  // Check if user has at least one company where they can view/edit
  const hasAnyViewAccess = userCompanies.length > 0;
  const hasAnyEditAccess = userCompanies.some((c) => c.role === "editor" || c.role === "admin");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 text-center">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="text-muted-foreground text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Check permission requirement if specified
  if (requiredPermission) {
    let hasPermission = false;

    switch (requiredPermission) {
      case "can_view":
        hasPermission = hasAnyViewAccess;
        break;
      case "can_edit":
        hasPermission = hasAnyEditAccess;
        break;
      case "can_manage_users":
        hasPermission = canManageCompanyUsers || isSuperAdmin;
        break;
      case "super_admin":
        hasPermission = isSuperAdmin;
        break;
    }

    if (!hasPermission) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return <AccessDenied />;
    }
  }

  // Check role requirement if specified (legacy support)
  if (requiredRole && selectedCompanyId) {
    if (!hasRole(selectedCompanyId, requiredRole)) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}

/**
 * Access Denied component - shown when user doesn't have permission
 */
function AccessDenied() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <title>Error</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-lg">Acceso denegado</p>
          <p className="mt-1 text-muted-foreground text-sm">
            No tienes permisos suficientes para acceder a esta página.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-primary text-sm hover:underline"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

interface RoleGuardProps {
  children: React.ReactNode;
  /** Company ID to check role for (defaults to selected company) */
  companyId?: number;
  /** Required role */
  role: CompanyRole;
  /** Fallback to show when user doesn't have the required role */
  fallback?: React.ReactNode;
}

/**
 * Role Guard - Shows content only if user has required role for a company
 * Useful for conditionally showing UI elements based on permissions
 */
export function RoleGuard({ children, companyId, role, fallback = null }: RoleGuardProps) {
  const { selectedCompanyId, hasRole } = useAuth();

  const targetCompanyId = companyId ?? selectedCompanyId;

  if (!targetCompanyId) {
    return <>{fallback}</>;
  }

  if (!hasRole(targetCompanyId, role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface CanEditGuardProps {
  children: React.ReactNode;
  /** Company ID to check (defaults to selected company) */
  companyId?: number;
  /** Fallback to show when user can't edit */
  fallback?: React.ReactNode;
}

/**
 * Can Edit Guard - Shows content only if user can edit (editor or admin)
 */
export function CanEditGuard({ children, companyId, fallback = null }: CanEditGuardProps) {
  return (
    <RoleGuard companyId={companyId} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

interface CanDeleteGuardProps {
  children: React.ReactNode;
  /** Company ID to check (defaults to selected company) */
  companyId?: number;
  /** Fallback to show when user can't delete */
  fallback?: React.ReactNode;
}

/**
 * Can Delete Guard - Shows content only if user can delete (admin only)
 */
export function CanDeleteGuard({ children, companyId, fallback = null }: CanDeleteGuardProps) {
  return (
    <RoleGuard companyId={companyId} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
