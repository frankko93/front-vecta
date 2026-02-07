import type { User } from "@/lib/api/types";

/**
 * Local storage utilities for persisting user preferences
 */

const STORAGE_KEYS = {
  LAST_COMPANY: "vecta_last_company",
  LAST_YEAR: "vecta_last_year",
  LAST_BUDGET_VERSION: "vecta_last_budget_version",
} as const;

export const storage = {
  // Company
  getLastCompany(): number | null {
    if (typeof window === "undefined") return null;
    const value = localStorage.getItem(STORAGE_KEYS.LAST_COMPANY);
    return value ? parseInt(value, 10) : null;
  },
  setLastCompany(companyId: number): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.LAST_COMPANY, companyId.toString());
  },

  // Year
  getLastYear(): number {
    if (typeof window === "undefined") return new Date().getFullYear();
    const value = localStorage.getItem(STORAGE_KEYS.LAST_YEAR);
    return value ? parseInt(value, 10) : new Date().getFullYear();
  },
  setLastYear(year: number): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.LAST_YEAR, year.toString());
  },

  // Budget version
  getLastBudgetVersion(): number {
    if (typeof window === "undefined") return 1;
    const value = localStorage.getItem(STORAGE_KEYS.LAST_BUDGET_VERSION);
    return value ? parseInt(value, 10) : 1;
  },
  setLastBudgetVersion(version: number): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.LAST_BUDGET_VERSION, version.toString());
  },

  // Clear all
  clearAll(): void {
    if (typeof window === "undefined") return;
    for (const key of Object.values(STORAGE_KEYS)) localStorage.removeItem(key);
  },
};

// ==================== Auth Storage ====================

const AUTH_STORAGE_KEYS = {
  USER: "vecta_user",
  SELECTED_COMPANY_ID: "vecta_selected_company_id",
} as const;

/**
 * Auth storage utilities for persisting authentication data
 */
export const authStorage = {
  // User
  getUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
      const value = localStorage.getItem(AUTH_STORAGE_KEYS.USER);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  setUser(user: User): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
  },

  removeUser(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
  },

  // Selected Company ID
  getSelectedCompanyId(): number | null {
    if (typeof window === "undefined") return null;
    const value = localStorage.getItem(AUTH_STORAGE_KEYS.SELECTED_COMPANY_ID);
    return value ? parseInt(value, 10) : null;
  },

  setSelectedCompanyId(companyId: number): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTH_STORAGE_KEYS.SELECTED_COMPANY_ID, companyId.toString());
  },

  removeSelectedCompanyId(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(AUTH_STORAGE_KEYS.SELECTED_COMPANY_ID);
  },

  // Clear all auth data
  clearAll(): void {
    if (typeof window === "undefined") return;
    for (const key of Object.values(AUTH_STORAGE_KEYS)) localStorage.removeItem(key);
  },
};
