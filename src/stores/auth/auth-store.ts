import { createStore } from "zustand/vanilla";

import type { CompanyRole, User, UserCompany } from "@/lib/api/types";
import { ROLE_LEVELS } from "@/lib/api/types";

export interface AuthStoreState {
  // State
  token: string | null;
  user: User | null;
  selectedCompanyId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setSelectedCompanyId: (companyId: number | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setUser: (user: User | null) => void;

  // Permission helpers
  hasCompanyAccess: (companyId: number) => boolean;
  hasRole: (companyId: number, requiredRole: CompanyRole) => boolean;
  canView: (companyId: number) => boolean;
  canEdit: (companyId: number) => boolean;
  canDelete: (companyId: number) => boolean;
  getSelectedCompany: () => UserCompany | null;
  getUserCompanies: () => UserCompany[];
}

export type AuthStoreInit = Partial<Pick<AuthStoreState, "token" | "user" | "selectedCompanyId" | "isAuthenticated">>;

/**
 * Creates the auth store with Zustand
 * Handles authentication state and permission checking
 */
export const createAuthStore = (init?: AuthStoreInit) =>
  createStore<AuthStoreState>()((set, get) => ({
    // Initial state
    token: init?.token ?? null,
    user: init?.user ?? null,
    selectedCompanyId: init?.selectedCompanyId ?? null,
    isAuthenticated: init?.isAuthenticated ?? false,
    isLoading: true,
    error: null,

    // Actions
    setAuth: (token: string, user: User) => {
      // Auto-select first company if user has companies and none selected
      const selectedCompanyId =
        get().selectedCompanyId ?? (user.companies && user.companies.length > 0 ? user.companies[0].company_id : null);

      set({
        token,
        user,
        selectedCompanyId,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    },

    clearAuth: () => {
      set({
        token: null,
        user: null,
        selectedCompanyId: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    },

    setSelectedCompanyId: (companyId: number | null) => {
      set({ selectedCompanyId: companyId });
    },

    setLoading: (isLoading: boolean) => {
      set({ isLoading });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    setUser: (user: User | null) => {
      set({ user });
    },

    // Permission helpers

    /**
     * Check if user has any access to a company
     */
    hasCompanyAccess: (companyId: number): boolean => {
      const { user } = get();
      if (!user || !user.companies) return false;
      return user.companies.some((c) => c.company_id === companyId);
    },

    /**
     * Check if user has at least the required role in a company
     * Roles are hierarchical: admin > editor > viewer
     */
    hasRole: (companyId: number, requiredRole: CompanyRole): boolean => {
      const { user } = get();
      if (!user || !user.companies) return false;

      const company = user.companies.find((c) => c.company_id === companyId);
      if (!company) return false;

      return ROLE_LEVELS[company.role] >= ROLE_LEVELS[requiredRole];
    },

    /**
     * Check if user can view data for a company (viewer role or higher)
     */
    canView: (companyId: number): boolean => {
      return get().hasRole(companyId, "viewer");
    },

    /**
     * Check if user can edit data for a company (editor role or higher)
     */
    canEdit: (companyId: number): boolean => {
      return get().hasRole(companyId, "editor");
    },

    /**
     * Check if user can delete data for a company (admin role only)
     */
    canDelete: (companyId: number): boolean => {
      return get().hasRole(companyId, "admin");
    },

    /**
     * Get the currently selected company
     */
    getSelectedCompany: (): UserCompany | null => {
      const { user, selectedCompanyId } = get();
      if (!user || !user.companies || !selectedCompanyId) return null;
      return user.companies.find((c) => c.company_id === selectedCompanyId) ?? null;
    },

    /**
     * Get all companies the user has access to
     */
    getUserCompanies: (): UserCompany[] => {
      const { user } = get();
      if (!user || !user.companies) return [];
      return user.companies;
    },
  }));
