import { apiClient } from "../client";
import type { PaginatedResponse, User } from "../types";

/**
 * Users service
 * Handles user management (admin only)
 */
export const userService = {
  /**
   * List all users (admin only)
   */
  async list(page = 1, size = 10): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<PaginatedResponse<User>>("/users", {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Get user by ID (admin only)
   */
  async getById(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  /**
   * Create new user (admin only)
   */
  async create(userData: Partial<User>): Promise<User> {
    const response = await apiClient.post<User>("/users", userData);
    return response.data;
  },

  /**
   * Update user (admin only)
   */
  async update(id: number, userData: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}`, userData);
    return response.data;
  },

  /**
   * Delete user (admin only)
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
