"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { scenariosService } from "@/lib/api";
import type { SaveScenarioRequest } from "@/lib/api/types";

/**
 * Scenarios hook
 * Handles saving, listing and comparing scenarios
 */
export function useScenarios(company_id: number | null, year: number | null) {
  const queryClient = useQueryClient();

  // List saved scenarios
  const {
    data: scenarios,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["scenarios", company_id, year],
    queryFn: () => scenariosService.list(company_id as number, year as number),
    enabled: company_id !== null && year !== null,
  });

  // Save scenario mutation
  const saveMutation = useMutation({
    mutationFn: (data: SaveScenarioRequest) => scenariosService.save(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
    },
  });

  // Compare scenarios mutation
  const compareMutation = useMutation({
    mutationFn: (params: { report_ids: number[] }) => scenariosService.compare(params),
  });

  // Delete scenario mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => scenariosService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
    },
  });

  return {
    scenarios: scenarios || [],
    isLoading,
    error,
    refetch,
    saveScenario: saveMutation.mutateAsync,
    compareScenarios: compareMutation.mutateAsync,
    deleteScenario: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isComparing: compareMutation.isPending,
    isDeleting: deleteMutation.isPending,
    compareResult: compareMutation.data,
  };
}
