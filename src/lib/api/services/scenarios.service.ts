import { apiClient } from "../client";
import type { CompareScenarioResponse, SavedScenario, SaveScenarioRequest } from "../types";

/**
 * Scenarios service
 * Handles saving and comparing different report scenarios
 */
export const scenariosService = {
  /**
   * Save a report scenario
   */
  async save(data: SaveScenarioRequest): Promise<SavedScenario> {
    const response = await apiClient.post<SavedScenario>("/reports/save", data);
    return response.data;
  },

  /**
   * List saved scenarios
   */
  async list(company_id: number, year: number): Promise<SavedScenario[]> {
    const response = await apiClient.get<SavedScenario[]>("/reports/saved", {
      params: { company_id, year },
    });
    return response.data;
  },

  /**
   * Compare multiple scenarios
   * Requires only report_ids (minimum 2, maximum 5)
   */
  async compare(params: { report_ids: number[] }): Promise<CompareScenarioResponse> {
    const response = await apiClient.post<CompareScenarioResponse>("/reports/compare", {
      report_ids: params.report_ids,
    });
    return response.data;
  },

  /**
   * Delete a saved scenario
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/reports/saved/${id}`);
  },
};
