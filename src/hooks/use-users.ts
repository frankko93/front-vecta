"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { companyAdminService, superAdminService } from "@/lib/api";
import type {
  AssignUserToCompanyRequest,
  CompanyRole,
  CreateCompanyUserRequest,
  CreateUserRequest,
  SystemPermission,
  UpdateUserRequest,
  User,
} from "@/lib/api/types";

// ==================== Super Admin Hook ====================

/**
 * Hook for Super Admin user management
 * Provides full access to all users across all companies
 */
export function useSuperAdminUsers() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  // Fetch all users
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "users", page, size],
    queryFn: () => superAdminService.listUsers(page, size),
  });

  // Create user
  const createMutation = useMutation({
    mutationFn: (userData: CreateUserRequest) => superAdminService.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  // Update user
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) => superAdminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  // Deactivate user
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => superAdminService.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  // Assign user to company
  const assignToCompanyMutation = useMutation({
    mutationFn: (data: AssignUserToCompanyRequest) => superAdminService.assignUserToCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  // Update user role in company
  const updateCompanyRoleMutation = useMutation({
    mutationFn: ({ userId, companyId, role }: { userId: number; companyId: number; role: CompanyRole }) =>
      superAdminService.updateUserCompanyRole(userId, companyId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  // Remove user from company
  const removeFromCompanyMutation = useMutation({
    mutationFn: ({ userId, companyId }: { userId: number; companyId: number }) =>
      superAdminService.removeUserFromCompany(userId, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  // Assign permissions
  const assignPermissionsMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: number; permissions: SystemPermission[] }) =>
      superAdminService.assignPermissions({ user_id: userId, permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  // Set user password (Super Admin only)
  const setPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) =>
      superAdminService.setUserPassword(userId, { new_password: newPassword }),
  });

  return {
    // Data
    users: data?.users || [],
    totalPages: data?.total_pages || 0,
    totalCount: data?.total || 0,
    page,
    size,
    setPage,
    setSize,

    // State
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,

    // Mutations
    createUser: createMutation.mutateAsync,
    updateUser: updateMutation.mutateAsync,
    deactivateUser: deactivateMutation.mutateAsync,
    assignToCompany: assignToCompanyMutation.mutateAsync,
    updateCompanyRole: updateCompanyRoleMutation.mutateAsync,
    removeFromCompany: removeFromCompanyMutation.mutateAsync,
    assignPermissions: assignPermissionsMutation.mutateAsync,
    setPassword: setPasswordMutation.mutateAsync,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
    isAssigningToCompany: assignToCompanyMutation.isPending,
    isUpdatingRole: updateCompanyRoleMutation.isPending,
    isRemovingFromCompany: removeFromCompanyMutation.isPending,
    isAssigningPermissions: assignPermissionsMutation.isPending,
    isSettingPassword: setPasswordMutation.isPending,
  };
}

// ==================== Company Admin Hook ====================

/**
 * Hook for Company Admin user management
 * Provides access to users within a specific company
 */
export function useCompanyAdminUsers(companyId: number | null) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  // Fetch company users
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["company", companyId, "users", page, size],
    queryFn: () => companyAdminService.listUsers(companyId as number, page, size),
    enabled: !!companyId,
  });

  // Create user in company
  const createMutation = useMutation({
    mutationFn: (userData: CreateCompanyUserRequest) => companyAdminService.createUser(companyId as number, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId, "users"] });
    },
  });

  // Update user
  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UpdateUserRequest }) =>
      companyAdminService.updateUser(companyId as number, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId, "users"] });
    },
  });

  // Deactivate user
  const deactivateMutation = useMutation({
    mutationFn: (userId: number) => companyAdminService.deactivateUser(companyId as number, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId, "users"] });
    },
  });

  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: CompanyRole }) =>
      companyAdminService.updateUserRole(companyId as number, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId, "users"] });
    },
  });

  // Remove user from company
  const removeUserMutation = useMutation({
    mutationFn: (userId: number) => companyAdminService.removeUser(companyId as number, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId, "users"] });
    },
  });

  return {
    // Data
    users: data?.users || [],
    totalPages: data?.total_pages || 0,
    totalCount: data?.total || 0,
    page,
    size,
    setPage,
    setSize,
    companyId,

    // State
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,

    // Mutations
    createUser: createMutation.mutateAsync,
    updateUser: updateMutation.mutateAsync,
    deactivateUser: deactivateMutation.mutateAsync,
    updateRole: updateRoleMutation.mutateAsync,
    removeUser: removeUserMutation.mutateAsync,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
    isUpdatingRole: updateRoleMutation.isPending,
    isRemovingUser: removeUserMutation.isPending,
  };
}

// ==================== Unified Users Hook ====================

/**
 * Unified hook that automatically uses the appropriate service
 * based on user's permissions (super_admin vs company_admin)
 */
export function useUsers() {
  const { isSuperAdmin, userManagementMode, selectedCompanyId, adminCompanies } = useAuth();

  // Use super admin hook if user is super admin
  const superAdminHook = useSuperAdminUsers();

  // Use company admin hook for non-super-admins
  // Default to first admin company or selected company
  const effectiveCompanyId =
    !isSuperAdmin && userManagementMode === "company_admin" ? adminCompanies[0]?.company_id || selectedCompanyId : null;

  const companyAdminHook = useCompanyAdminUsers(effectiveCompanyId);

  // Return appropriate hook based on mode
  if (isSuperAdmin) {
    return {
      ...superAdminHook,
      mode: "super_admin" as const,
      canAssignPermissions: true,
      canAssignToAnyCompany: true,
    };
  }

  if (userManagementMode === "company_admin") {
    return {
      ...companyAdminHook,
      mode: "company_admin" as const,
      canAssignPermissions: false,
      canAssignToAnyCompany: false,
      // Add stub functions for super admin features
      assignToCompany: async () => {
        throw new Error("Only super admins can assign users to companies");
      },
      updateCompanyRole: async () => {
        throw new Error("Only super admins can change roles across companies");
      },
      removeFromCompany: async () => {
        throw new Error("Only super admins can remove users from companies");
      },
      assignPermissions: async () => {
        throw new Error("Only super admins can assign system permissions");
      },
    };
  }

  // No admin access - return empty state
  return {
    users: [] as User[],
    totalPages: 0,
    totalCount: 0,
    page: 1,
    size: 10,
    setPage: () => {
      /* no-op mock */
    },
    setSize: () => {
      /* no-op mock */
    },
    isLoading: false,
    error: "No tienes permisos de administración",
    refetch: async () => {
      /* no-op mock */
    },
    mode: null as const,
    canAssignPermissions: false,
    canAssignToAnyCompany: false,
  };
}
