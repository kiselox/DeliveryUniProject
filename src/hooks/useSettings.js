// src/hooks/useSettings.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Custom React Query Hook for managing Global Settings and Rates
 * Handles settings query polling every 5 seconds and updates settings mutation.
 */
export function useSettings() {
  const queryClient = useQueryClient();

  // 1. Live settings polling query (polled every 5 seconds)
  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    },
    refetchInterval: 5000
  });

  // 2. Update settings mutation (weather, pricePerKm, etc.)
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates) => {
      const res = await api.post('/settings', updates);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });

  return {
    settings,
    isLoading,
    isError,
    refetch,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending
  };
}
