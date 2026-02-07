"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { companiesService } from "@/lib/api";
import type { CreateCompanyRequest } from "@/lib/api/types";

/**
 * Companies hook
 * Handles company data fetching and mutations
 */
export function useCompanies() {
  const queryClient = useQueryClient();

  // Fetch all companies
  const {
    data: companies,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesService.list(),
  });

  // Create company mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateCompanyRequest) => companiesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  // Assign minerals mutation
  const assignMineralsMutation = useMutation({
    mutationFn: ({ id, mineralIds }: { id: number; mineralIds: number[] }) =>
      companiesService.assignMinerals(id, mineralIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  // Update company mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCompanyRequest> }) =>
      companiesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  // Delete company mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => companiesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  return {
    companies: companies || [],
    isLoading,
    error,
    refetch,
    createCompany: createMutation.mutateAsync,
    updateCompany: updateMutation.mutateAsync,
    deleteCompany: deleteMutation.mutateAsync,
    assignMinerals: assignMineralsMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAssigningMinerals: assignMineralsMutation.isPending,
  };
}

/**
 * Single company hook
 * Fetches detailed company data by ID
 */
export function useCompany(id: number | null) {
  const {
    data: company,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["company", id],
    queryFn: () => companiesService.getById(id ?? 0),
    enabled: id !== null,
  });

  return {
    company,
    isLoading,
    error,
    refetch,
  };
}
