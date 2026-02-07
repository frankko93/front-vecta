"use client";

import { useQuery } from "@tanstack/react-query";

import { configService } from "@/lib/api";

/**
 * Config hook
 * Fetches configuration data (minerals, units)
 */
export function useConfig() {
  // Fetch minerals
  const {
    data: minerals,
    isLoading: isLoadingMinerals,
    error: mineralsError,
  } = useQuery({
    queryKey: ["config", "minerals"],
    queryFn: () => configService.getMinerals(),
  });

  // Fetch units
  const {
    data: unitsResponse,
    isLoading: isLoadingUnits,
    error: unitsError,
  } = useQuery({
    queryKey: ["config", "units"],
    queryFn: () => configService.getUnits(),
  });

  return {
    minerals: minerals || [],
    units: unitsResponse?.data || [],
    isLoading: isLoadingMinerals || isLoadingUnits,
    error: mineralsError || unitsError,
  };
}
