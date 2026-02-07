import { apiClient } from "../client";
import type {
  AdminUsersResponse,
  AssignPermissionsRequest,
  AssignUserToCompanyRequest,
  CreateCompanyUserRequest,
  CreateUserRequest,
  MessageResponse,
  SetUserPasswordRequest,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  User,
} from "../types";

// ==================== Super Admin Service ====================

/**
 * Super Admin service
 * Requires 'super_admin' permission
 * Full access to all users and companies
 */
export const superAdminService = {
  /**
   * List all users in the system
   */
  async listUsers(page = 1, size = 10): Promise<AdminUsersResponse> {
    const response = await apiClient.get<AdminUsersResponse>("/admin/users", {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Get a specific user by ID
   */
  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/admin/users/${id}`);
    return response.data;
  },

  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<User>("/admin/users", data);
    return response.data;
  },

  /**
   * Update a user
   */
  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<User>(`/admin/users/${id}`, data);
    return response.data;
  },

  /**
   * Deactivate a user (soft delete)
   */
  async deactivateUser(id: number): Promise<MessageResponse> {
    const response = await apiClient.delete<MessageResponse>(`/admin/users/${id}`);
    return response.data;
  },

  /**
   * Assign user to a company with a specific role
   */
  async assignUserToCompany(data: AssignUserToCompanyRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>("/admin/users/companies", data);
    return response.data;
  },

  /**
   * Update user's role in a company
   */
  async updateUserCompanyRole(
    userId: number,
    companyId: number,
    data: UpdateUserRoleRequest,
  ): Promise<MessageResponse> {
    const response = await apiClient.put<MessageResponse>(`/admin/users/${userId}/companies/${companyId}`, data);
    return response.data;
  },

  /**
   * Remove user from a company
   */
  async removeUserFromCompany(userId: number, companyId: number): Promise<MessageResponse> {
    const response = await apiClient.delete<MessageResponse>(`/admin/users/${userId}/companies/${companyId}`);
    return response.data;
  },

  /**
   * Assign system permissions to a user
   */
  async assignPermissions(data: AssignPermissionsRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>("/admin/users/permissions", data);
    return response.data;
  },

  /**
   * Set user password (Super Admin only - no current password required)
   */
  async setUserPassword(userId: number, data: SetUserPasswordRequest): Promise<MessageResponse> {
    const response = await apiClient.put<MessageResponse>(`/admin/users/${userId}/password`, data);
    return response.data;
  },
};

// ==================== Company Admin Service ====================

/**
 * Company Admin service
 * Requires 'admin' role in the specific company
 * Can only manage users within their assigned companies
 */
export const companyAdminService = {
  /**
   * List users in a specific company
   */
  async listUsers(companyId: number, page = 1, size = 10): Promise<AdminUsersResponse> {
    const response = await apiClient.get<AdminUsersResponse>(`/company/${companyId}/users`, {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Get a specific user in a company
   */
  async getUser(companyId: number, userId: number): Promise<User> {
    const response = await apiClient.get<User>(`/company/${companyId}/users/${userId}`);
    return response.data;
  },

  /**
   * Create a new user (automatically assigned to the company with 'viewer' role)
   */
  async createUser(companyId: number, data: CreateCompanyUserRequest): Promise<User> {
    const response = await apiClient.post<User>(`/company/${companyId}/users`, data);
    return response.data;
  },

  /**
   * Update a user in a company
   */
  async updateUser(companyId: number, userId: number, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<User>(`/company/${companyId}/users/${userId}`, data);
    return response.data;
  },

  /**
   * Deactivate a user in a company
   */
  async deactivateUser(companyId: number, userId: number): Promise<MessageResponse> {
    const response = await apiClient.delete<MessageResponse>(`/company/${companyId}/users/${userId}`);
    return response.data;
  },

  /**
   * Update user's role in the company
   */
  async updateUserRole(companyId: number, userId: number, data: UpdateUserRoleRequest): Promise<MessageResponse> {
    const response = await apiClient.put<MessageResponse>(`/company/${companyId}/users/${userId}/role`, data);
    return response.data;
  },

  /**
   * Remove user from the company
   */
  async removeUser(companyId: number, userId: number): Promise<MessageResponse> {
    const response = await apiClient.delete<MessageResponse>(`/company/${companyId}/users/${userId}`);
    return response.data;
  },
};
