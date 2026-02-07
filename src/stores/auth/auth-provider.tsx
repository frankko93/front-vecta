"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { type StoreApi, useStore } from "zustand";

import { authService, getAuthToken, removeAuthToken, setAuthToken } from "@/lib/api";
import type { LoginRequest } from "@/lib/api/types";
import { authStorage } from "@/lib/storage";

import { type AuthStoreState, createAuthStore } from "./auth-store";

const AuthStoreContext = createContext<StoreApi<AuthStoreState> | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider
 * Provides authentication state and actions to the entire app
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const _router = useRouter();
  const [store] = useState<StoreApi<AuthStoreState>>(() => {
    // Initialize with stored values
    const storedUser = authStorage.getUser();
    const storedToken = getAuthToken();
    const storedCompanyId = authStorage.getSelectedCompanyId();

    return createAuthStore({
      token: storedToken,
      user: storedUser,
      selectedCompanyId: storedCompanyId,
      isAuthenticated: !!storedToken && !!storedUser,
    });
  });

  // Track if initial auth check has been done
  const initialCheckDone = useRef(false);

  // Check authentication on mount
  useEffect(() => {
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;

    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        store.getState().setLoading(false);
        return;
      }

      try {
        // Validate token by getting current user
        const userData = await authService.getCurrentUser();

        // Update store with fresh user data
        store.getState().setAuth(token, userData);

        // Persist user data
        authStorage.setUser(userData);

        // If user has companies but no company selected, select first one
        if (userData.companies && userData.companies.length > 0 && !store.getState().selectedCompanyId) {
          const firstCompanyId = userData.companies[0].company_id;
          store.getState().setSelectedCompanyId(firstCompanyId);
          authStorage.setSelectedCompanyId(firstCompanyId);
        }
      } catch (_err) {
        // Token is invalid, clear auth
        store.getState().clearAuth();
        authStorage.clearAll();
        removeAuthToken();
      } finally {
        store.getState().setLoading(false);
      }
    };

    checkAuth();
  }, [store]);

  // Sync selectedCompanyId changes to storage
  useEffect(() => {
    return store.subscribe((state, prevState) => {
      if (state.selectedCompanyId !== prevState.selectedCompanyId && state.selectedCompanyId) {
        authStorage.setSelectedCompanyId(state.selectedCompanyId);
      }
    });
  }, [store]);

  return <AuthStoreContext.Provider value={store}>{children}</AuthStoreContext.Provider>;
}

/**
 * Hook to access auth store state
 */
export function useAuthStore<T>(selector: (state: AuthStoreState) => T): T {
  const store = useContext(AuthStoreContext);
  if (!store) throw new Error("useAuthStore must be used within AuthProvider");
  return useStore(store, selector);
}

/**
 * Hook to access the raw auth store (for actions)
 */
export function useAuthStoreApi(): StoreApi<AuthStoreState> {
  const store = useContext(AuthStoreContext);
  if (!store) throw new Error("useAuthStoreApi must be used within AuthProvider");
  return store;
}

/**
 * Hook with auth actions (login, logout)
 * Combines store state with navigation logic
 */
export function useAuthActions() {
  const router = useRouter();
  const store = useAuthStoreApi();

  const login = useCallback(
    async (credentials: LoginRequest): Promise<boolean> => {
      store.getState().setLoading(true);
      store.getState().setError(null);

      try {
        const response = await authService.login(credentials);

        // Set token (already done in auth service)
        setAuthToken(response.token);

        // Update store
        store.getState().setAuth(response.token, response.user);

        // Persist user data
        authStorage.setUser(response.user);

        // Select first company if available
        if (response.user.companies && response.user.companies.length > 0) {
          const firstCompanyId = response.user.companies[0].company_id;
          store.getState().setSelectedCompanyId(firstCompanyId);
          authStorage.setSelectedCompanyId(firstCompanyId);
        }

        router.push("/dashboard");
        return true;
      } catch (err: unknown) {
        const errorMessage =
          typeof err === "object" && err !== null && "response" in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        store.getState().setError(errorMessage ?? "Error al iniciar sesión");
        store.getState().setLoading(false);
        return false;
      }
    },
    [router, store],
  );

  const logout = useCallback(async (): Promise<boolean> => {
    store.getState().setLoading(true);
    store.getState().setError(null);

    try {
      await authService.logout();
    } catch (_err) {
      // Continue with logout even if request fails
    } finally {
      // Clear everything
      store.getState().clearAuth();
      authStorage.clearAll();
      removeAuthToken();
      router.push("/auth/login");
    }

    return true;
  }, [router, store]);

  return { login, logout };
}
