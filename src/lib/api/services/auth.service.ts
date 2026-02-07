import { apiClient, removeAuthToken, setAuthToken } from "../client";
import type { AuthResponse, ChangePasswordRequest, LoginRequest, MessageResponse, User } from "../types";

/**
 * Authentication service
 * Handles login, logout, and user session
 * Uses Bearer token authentication
 */
export const authService = {
  /**
   * Login user with DNI and password
   * Stores token in localStorage
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", credentials);

    // Store token for future requests
    if (response.data.token) {
      setAuthToken(response.data.token);
    }

    return response.data;
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },

  /**
   * Logout user
   * Removes token from storage
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      // Always remove token, even if request fails
      removeAuthToken();
    }
  },

  /**
   * Change own password (authenticated user)
   * After changing password, all sessions are invalidated
   * User must login again
   */
  async changePassword(data: ChangePasswordRequest): Promise<MessageResponse> {
    const response = await apiClient.put<MessageResponse>("/auth/password", data);
    return response.data;
  },
};
