import { apiClient } from "../client";
import type { Mineral, UnitsResponse } from "../types";

/**
 * Configuration service
 * Handles minerals, units, and other config data
 */
export const configService = {
  /**
   * List all minerals
   */
  async getMinerals(): Promise<Mineral[]> {
    const response = await apiClient.get<Mineral[]>("/config/minerals");
    return response.data;
  },

  /**
   * Get available units of measure
   */
  async getUnits(): Promise<UnitsResponse> {
    const response = await apiClient.get<UnitsResponse>("/config/units");
    return response.data;
  },
};
