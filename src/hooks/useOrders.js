// src/hooks/useOrders.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import orderServices from '../services/orders-services';

/**
 * Custom React Query Hook for managing Orders
 * Handles orders query polling every 3 seconds and mutate functions.
 */
export function useOrders() {
  const queryClient = useQueryClient();

  // 1. Live orders polling query (polled every 3 seconds)
  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderServices.getOrders(),
    refetchInterval: 3000
  });

  // 2. Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (newOrder) => orderServices.createOrder(newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  // 3. Update order mutation (status updates, surge coefficient, etc.)
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, updates }) => orderServices.updateOrder(orderId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  return {
    orders,
    isLoading,
    isError,
    refetch,
    createOrder: createOrderMutation.mutateAsync,
    isCreating: createOrderMutation.isPending,
    updateOrder: updateOrderMutation.mutateAsync,
    isUpdating: updateOrderMutation.isPending
  };
}
