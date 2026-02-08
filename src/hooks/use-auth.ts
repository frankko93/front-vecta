"use client";

import { useCallback, useMemo } from "react";

import type { CompanyRole, SystemPermission, UserCompany } from "@/lib/api/types";
import { useAuthActions, useAuthStore } from "@/stores/auth/auth-provider";

/**
 * Authentication hook
 * Provides access to auth state, actions, and permission helpers
 */
export function useAuth() {
  // Get state from store
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const selectedCompanyId = useAuthStore((state) => state.selectedCompanyId);

  // Get permission helpers from store
  const hasCompanyAccessFn = useAuthStore((state) => state.hasCompanyAccess);
  const hasRoleFn = useAuthStore((state) => state.hasRole);
  const canViewFn = useAuthStore((state) => state.canView);
  const canEditFn = useAuthStore((state) => state.canEdit);
  const canDeleteFn = useAuthStore((state) => state.canDelete);
  const getSelectedCompanyFn = useAuthStore((state) => state.getSelectedCompany);
  const getUserCompaniesFn = useAuthStore((state) => state.getUserCompanies);
  const setSelectedCompanyIdFn = useAuthStore((state) => state.setSelectedCompanyId);

  // Get actions
  const { login, logout } = useAuthActions();

  // System permission checks (based on user.permissions array)
  const hasSystemPermission = useCallback(
    (permission: SystemPermission): boolean => {
      if (!user) return false;
      return (user.permissions as string[]).includes(permission);
    },
    [user],
  );

  // Super Admin - full system access
  const isSuperAdmin = useMemo(() => hasSystemPermission("super_admin"), [hasSystemPermission]);

  // Legacy permission checks (for backwards compatibility)
  const hasPermission = useCallback(
    (permission: "admin" | "editor" | "viewer"): boolean => {
      if (!user) return false;
      return user.permissions.includes(permission);
    },
    [user],
  );

  const isAdmin = useMemo(() => hasPermission("admin") || isSuperAdmin, [hasPermission, isSuperAdmin]);
  const isEditor = useMemo(() => hasPermission("editor") || isAdmin, [hasPermission, isAdmin]);
  const isViewer = useMemo(() => hasPermission("viewer") || isEditor, [hasPermission, isEditor]);

  // Company-specific permission checks
  const hasCompanyAccess = useCallback(
    (companyId: number): boolean => {
      return hasCompanyAccessFn(companyId);
    },
    [hasCompanyAccessFn],
  );

  const hasRole = useCallback(
    (companyId: number, requiredRole: CompanyRole): boolean => {
      return hasRoleFn(companyId, requiredRole);
    },
    [hasRoleFn],
  );

  const canView = useCallback(
    (companyId: number): boolean => {
      return canViewFn(companyId);
    },
    [canViewFn],
  );

  const canEdit = useCallback(
    (companyId: number): boolean => {
      return canEditFn(companyId);
    },
    [canEditFn],
  );

  const canDelete = useCallback(
    (companyId: number): boolean => {
      return canDeleteFn(companyId);
    },
    [canDeleteFn],
  );

  // Company helpers
  const selectedCompany = useMemo((): UserCompany | null => {
    return getSelectedCompanyFn();
  }, [getSelectedCompanyFn]); // eslint-disable-line react-hooks/exhaustive-deps

  const userCompanies = useMemo((): UserCompany[] => {
    return getUserCompaniesFn();
  }, [getUserCompaniesFn]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSelectedCompanyId = useCallback(
    (companyId: number | null) => {
      setSelectedCompanyIdFn(companyId);
    },
    [setSelectedCompanyIdFn],
  );

  // Convenience helpers for current selected company
  const canViewSelected = useMemo((): boolean => {
    if (!selectedCompanyId) return false;
    return canView(selectedCompanyId);
  }, [selectedCompanyId, canView]);

  const canEditSelected = useMemo((): boolean => {
    if (!selectedCompanyId) return false;
    return canEdit(selectedCompanyId);
  }, [selectedCompanyId, canEdit]);

  const canDeleteSelected = useMemo((): boolean => {
    if (!selectedCompanyId) return false;
    return canDelete(selectedCompanyId);
  }, [selectedCompanyId, canDelete]);

  // User management helpers

  /**
   * Check if current user can manage users in a specific company
   * True if: super_admin OR admin role in that company
   */
  const canManageCompanyUsers = useCallback(
    (companyId: number): boolean => {
      if (isSuperAdmin) return true;
      return hasRole(companyId, "admin");
    },
    [isSuperAdmin, hasRole],
  );

  /**
   * Check if current user can manage users in the selected company
   */
  const canManageSelectedCompanyUsers = useMemo((): boolean => {
    if (isSuperAdmin) return true;
    if (!selectedCompanyId) return false;
    return hasRole(selectedCompanyId, "admin");
  }, [isSuperAdmin, selectedCompanyId, hasRole]);

  /**
   * Get the admin mode for user management
   * - 'super_admin': Can manage all users across all companies
   * - 'company_admin': Can manage users within their admin companies
   * - null: No admin access
   */
  const userManagementMode = useMemo((): "super_admin" | "company_admin" | null => {
    if (isSuperAdmin) return "super_admin";
    // Check if user is admin in any company
    const adminCompanies = userCompanies.filter((c) => c.role === "admin");
    if (adminCompanies.length > 0) return "company_admin";
    return null;
  }, [isSuperAdmin, userCompanies]);

  /**
   * Get companies where user can manage users (is admin)
   */
  const adminCompanies = useMemo((): UserCompany[] => {
    if (isSuperAdmin) return userCompanies; // Super admin can manage all their companies
    return userCompanies.filter((c) => c.role === "admin");
  }, [isSuperAdmin, userCompanies]);

  return {
    // User state
    user,
    isLoading,
    error,
    isAuthenticated,

    // Actions
    login,
    logout,

    // System permissions (from user.permissions)
    hasSystemPermission,
    isSuperAdmin,

    // Legacy global permissions (for backwards compatibility)
    hasPermission,
    isAdmin,
    isEditor,
    isViewer,

    // Company state
    selectedCompanyId,
    selectedCompany,
    userCompanies,
    setSelectedCompanyId,

    // Company-specific permissions
    hasCompanyAccess,
    hasRole,
    canView,
    canEdit,
    canDelete,

    // Selected company shortcuts
    canViewSelected,
    canEditSelected,
    canDeleteSelected,

    // User management permissions
    canManageCompanyUsers,
    canManageSelectedCompanyUsers,
    userManagementMode,
    adminCompanies,
  };
}

/**
 * Hook to check permissions for a specific company
 * Useful when you need to check permissions for a company other than the selected one
 */
export function useCompanyPermissions(companyId: number | null) {
  const { hasCompanyAccess, hasRole, canView, canEdit, canDelete } = useAuth();

  return useMemo(() => {
    if (!companyId) {
      return {
        hasAccess: false,
        canView: false,
        canEdit: false,
        canDelete: false,
        hasRole: (_role: CompanyRole) => false,
      };
    }

    return {
      hasAccess: hasCompanyAccess(companyId),
      canView: canView(companyId),
      canEdit: canEdit(companyId),
      canDelete: canDelete(companyId),
      hasRole: (role: CompanyRole) => hasRole(companyId, role),
    };
  }, [companyId, hasCompanyAccess, hasRole, canView, canEdit, canDelete]);
}
