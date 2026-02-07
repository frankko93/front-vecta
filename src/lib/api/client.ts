import axios from "axios";

import { ENV } from "@/config/env";

const API_URL = ENV.API_URL;
const API_VERSION = ENV.API_VERSION;

// Token storage key
const TOKEN_KEY = "vecta_auth_token";

/**
 * Get stored authentication token
 */
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Save authentication token
 */
export const setAuthToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Remove authentication token
 */
export const removeAuthToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Main API client with Bearer token authentication
 */
export const apiClient = axios.create({
  baseURL: `${API_URL}/api/${API_VERSION}`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor to add Bearer token
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add Bearer token if available
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (ENV.NODE_ENV === "development") {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  statusText: string;
  data: unknown;

  constructor(status: number, statusText: string, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

// Error message for 403 Forbidden
export const FORBIDDEN_ERROR_MESSAGE = "No tienes permisos para realizar esta acción";

/**
 * Response interceptor for global error handling
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const statusText = error.response?.statusText || "";
    const message = error.response?.data?.message || error.message || "Error de conexión";
    const data = error.response?.data;

    // Handle 401 Unauthorized - redirect to login
    // Don't log 401 errors as they are expected when token expires
    if (status === 401) {
      removeAuthToken();
      if (typeof window !== "undefined") {
        // Clear auth storage
        try {
          localStorage.removeItem("vecta_user");
          localStorage.removeItem("vecta_selected_company_id");
        } catch {
          // Ignore storage errors
        }

        // Only redirect if not already on login page
        if (!window.location.pathname.includes("/auth/login")) {
          window.location.href = "/auth/login";
        }
      }
      // Return early without logging - 401 is expected behavior
      return Promise.reject(error);
    }

    // Handle 403 Forbidden - show permission error
    if (status === 403) {
      // Log 403 errors in development
      if (ENV.NODE_ENV === "development") {
        console.warn("[API 403 Forbidden]", {
          url: error.config?.url,
          method: error.config?.method,
          message: FORBIDDEN_ERROR_MESSAGE,
        });
      }

      // Create enhanced error with user-friendly message
      const forbiddenError = new ApiError(403, "Forbidden", FORBIDDEN_ERROR_MESSAGE, data);
      return Promise.reject(forbiddenError);
    }

    // Log other errors in development (skip network errors during initial auth check)
    if (ENV.NODE_ENV === "development") {
      // Check if this is a network error (no response)
      const isNetworkError = !error.response && error.code;

      if (isNetworkError) {
        console.warn("[API Network Error]", {
          url: error.config?.url,
          method: error.config?.method,
          code: error.code,
          message: error.message || "No se pudo conectar al servidor",
        });
      } else if (status) {
        // Only log if we have a status (actual server response)
        console.error("[API Error]", {
          url: error.config?.url,
          method: error.config?.method,
          status,
          statusText,
          message,
          data,
        });
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Health check client (no authentication required)
 */
export const healthClient = axios.create({
  baseURL: API_URL,
});
