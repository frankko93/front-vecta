"use client";

import { useQuery } from "@tanstack/react-query";

import { reportsService } from "@/lib/api";
import type { SummaryReportParams } from "@/lib/api/types";

/**
 * Reports hook
 * Handles report data fetching
 */
export function useSummaryReport(params: SummaryReportParams | null) {
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["report", "summary", params],
    queryFn: () => reportsService.getSummary(params as SummaryReportParams),
    enabled: params !== null && params.company_id > 0,
    retry: false,
  });

  return {
    report,
    isLoading,
    error,
    refetch,
  };
}

/**
 * PBR detailed report hook
 */
export function usePBRReport(params: SummaryReportParams | null) {
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["report", "pbr", params],
    queryFn: () => reportsService.getPBR(params as SummaryReportParams),
    enabled: params !== null && params.company_id > 0,
  });

  return {
    report,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Dore detailed report hook
 */
export function useDoreReport(params: SummaryReportParams | null) {
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["report", "dore", params],
    queryFn: () => reportsService.getDore(params as SummaryReportParams),
    enabled: params !== null && params.company_id > 0,
  });

  return {
    report,
    isLoading,
    error,
    refetch,
  };
}

/**
 * OPEX detailed report hook
 */
export function useOPEXReport(params: SummaryReportParams | null) {
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["report", "opex", params],
    queryFn: () => reportsService.getOPEX(params as SummaryReportParams),
    enabled: params !== null && params.company_id > 0,
  });

  return {
    report,
    isLoading,
    error,
    refetch,
  };
}

/**
 * CAPEX detailed report hook
 */
export function useCAPEXReport(params: SummaryReportParams | null) {
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["report", "capex", params],
    queryFn: () => reportsService.getCAPEX(params as SummaryReportParams),
    enabled: params !== null && params.company_id > 0,
  });

  return {
    report,
    isLoading,
    error,
    refetch,
  };
}
