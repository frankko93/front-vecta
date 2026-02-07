import { apiClient } from "../client";
import type {
  CAPEXData,
  DataListParams,
  DoreData,
  FinancialData,
  ImportParams,
  ImportResponse,
  ImportType,
  OPEXData,
  PBRData,
} from "../types";

/**
 * Data import service
 * Handles CSV import and data management for PBR, Dore, OPEX, CAPEX, Financial
 */
export const dataService = {
  /**
   * Import CSV file
   * Supports: PBR, Dore, OPEX, CAPEX, Financial, Production, Revenue
   */
  async import(params: ImportParams): Promise<ImportResponse> {
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("type", params.type);
    formData.append("data_type", params.data_type);
    formData.append("company_id", params.company_id.toString());

    if (params.version !== undefined) {
      formData.append("version", params.version.toString());
    }

    if (params.description) {
      formData.append("description", params.description);
    }

    const response = await apiClient.post<ImportResponse>("/data/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  /**
   * List imported data by type
   * Generic method that works for all data types
   */
  async list<T = unknown>(type: ImportType, params: DataListParams): Promise<T[]> {
    const response = await apiClient.get<T[]>(`/data/${type}/list`, {
      params: {
        company_id: params.company_id,
        year: params.year,
        data_type: params.data_type,
        ...(params.version && { version: params.version }),
      },
    });

    return response.data;
  },

  /**
   * List PBR data
   */
  async listPBR(params: DataListParams): Promise<PBRData[]> {
    return this.list<PBRData>("pbr", params);
  },

  /**
   * List Dore data
   */
  async listDore(params: DataListParams): Promise<DoreData[]> {
    return this.list<DoreData>("dore", params);
  },

  /**
   * List OPEX data
   */
  async listOPEX(params: DataListParams): Promise<OPEXData[]> {
    return this.list<OPEXData>("opex", params);
  },

  /**
   * List CAPEX data
   */
  async listCAPEX(params: DataListParams): Promise<CAPEXData[]> {
    return this.list<CAPEXData>("capex", params);
  },

  /**
   * List Financial data
   */
  async listFinancial(params: DataListParams): Promise<FinancialData[]> {
    return this.list<FinancialData>("financial", params);
  },

  /**
   * Delete data row (soft delete)
   */
  async delete(type: ImportType, id: number): Promise<void> {
    await apiClient.delete(`/data/${type}/${id}`);
  },
};
