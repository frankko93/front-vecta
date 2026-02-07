import { apiClient } from "../client";
import type { CAPEXReport, DoreReport, OPEXReport, PBRReport, SummaryReport, SummaryReportParams } from "../types";

/**
 * Reports service
 * Handles report generation and retrieval
 */
export const reportsService = {
  /**
   * Get summary report (main report)
   * Compares actual vs budget with all calculated metrics
   */
  async getSummary(params: SummaryReportParams): Promise<SummaryReport> {
    const response = await apiClient.get<SummaryReport>("/reports/summary", {
      params: {
        company_id: params.company_id,
        year: params.year,
        ...(params.months && { months: params.months.join(",") }),
        ...(params.budget_version && { budget_version: params.budget_version }),
      },
    });

    return response.data;
  },

  /**
   * Get PBR detailed report
   * Mining and processing details with calculated ratios and variances
   */
  async getPBR(params: SummaryReportParams): Promise<PBRReport> {
    const response = await apiClient.get<PBRReport>("/reports/pbr", {
      params: {
        company_id: params.company_id,
        year: params.year,
        ...(params.months && { months: params.months.join(",") }),
        ...(params.budget_version && { budget_version: params.budget_version }),
      },
    });

    return response.data;
  },

  /**
   * Get Dore detailed report
   * Complete flow: Metal in Dore → Adjustments → Deductions → Payable → Revenue → NSR
   */
  async getDore(params: SummaryReportParams): Promise<DoreReport> {
    const response = await apiClient.get<DoreReport>("/reports/dore", {
      params: {
        company_id: params.company_id,
        year: params.year,
        ...(params.months && { months: params.months.join(",") }),
        ...(params.budget_version && { budget_version: params.budget_version }),
      },
    });

    return response.data;
  },

  /**
   * Get OPEX detailed report
   * Breakdown by Cost Center and Subcategory with aggregations
   */
  async getOPEX(params: SummaryReportParams): Promise<OPEXReport> {
    const response = await apiClient.get<OPEXReport>("/reports/opex", {
      params: {
        company_id: params.company_id,
        year: params.year,
        ...(params.months && { months: params.months.join(",") }),
        ...(params.budget_version && { budget_version: params.budget_version }),
      },
    });

    return response.data;
  },

  /**
   * Get CAPEX detailed report
   * Breakdown by Type and Category with aggregations
   */
  async getCAPEX(params: SummaryReportParams): Promise<CAPEXReport> {
    const response = await apiClient.get<CAPEXReport>("/reports/capex", {
      params: {
        company_id: params.company_id,
        year: params.year,
        ...(params.months && { months: params.months.join(",") }),
        ...(params.budget_version && { budget_version: params.budget_version }),
      },
    });

    return response.data;
  },
};
