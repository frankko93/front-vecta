"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dataService } from "@/lib/api";
import type { DataListParams, ImportParams, ImportType } from "@/lib/api/types";

/**
 * Data import hook
 * Handles CSV import and data listing
 */
export function useDataImport() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  // Import data mutation
  const importMutation = useMutation({
    mutationFn: (params: ImportParams) => dataService.import(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data"] });
      setUploadProgress(0);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  // Delete data mutation
  const deleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: ImportType; id: number }) => dataService.delete(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data"] });
    },
  });

  return {
    importData: importMutation.mutateAsync,
    deleteData: deleteMutation.mutateAsync,
    isImporting: importMutation.isPending,
    isDeleting: deleteMutation.isPending,
    importError: importMutation.error,
    importResult: importMutation.data,
    uploadProgress,
  };
}

/**
 * Data list hook
 * Fetches imported data by type
 */
export function useDataList<T = unknown>(type: ImportType, params: DataListParams | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["data", type, params],
    queryFn: () => dataService.list<T>(type, params as DataListParams),
    enabled: params !== null,
  });

  return {
    data: data || [],
    isLoading,
    error,
    refetch,
  };
}
