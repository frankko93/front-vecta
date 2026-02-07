import { healthClient } from "../client";
import type { HealthResponse, VersionResponse } from "../types";

/**
 * Health service
 * Handles health checks and version info
 */
export const healthService = {
  /**
   * Check API readiness
   */
  async checkReadiness(): Promise<boolean> {
    try {
      const response = await healthClient.get<HealthResponse>("/api/health/readiness");
      return response.status === 200;
    } catch {
      return false;
    }
  },

  /**
   * Get API version
   */
  async getVersion(): Promise<string> {
    try {
      const response = await healthClient.get<VersionResponse>("/version");
      return response.data.version;
    } catch {
      return "unknown";
    }
  },
};
