import { apiClient } from "../client";
import type { Company, CompanyDetail, CreateCompanyRequest } from "../types";

/**
 * Companies service
 * Handles company management
 */
export const companiesService = {
  /**
   * List all companies
   */
  async list(): Promise<Company[]> {
    const response = await apiClient.get<Company[]>("/config/companies");
    return response.data;
  },

  /**
   * Get company by ID with full details (minerals, settings)
   */
  async getById(id: number): Promise<CompanyDetail> {
    const response = await apiClient.get<CompanyDetail>(`/config/companies/${id}`);
    return response.data;
  },

  /**
   * Create new company (admin only)
   */
  async create(data: CreateCompanyRequest): Promise<Company> {
    const response = await apiClient.post<Company>("/config/companies", data);
    return response.data;
  },

  /**
   * Update company (admin only)
   */
  async update(id: number, data: Partial<CreateCompanyRequest>): Promise<Company> {
    const response = await apiClient.put<Company>(`/config/companies/${id}`, data);
    return response.data;
  },

  /**
   * Delete company (admin only)
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/config/companies/${id}`);
  },

  /**
   * Assign minerals to company (admin only)
   */
  async assignMinerals(id: number, mineralIds: number[]): Promise<void> {
    await apiClient.put(`/config/companies/${id}/minerals`, {
      mineral_ids: mineralIds,
    });
  },
};
