import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import orderServices from '../services/orders-services';

export function useOrders() {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderServices.getOrders(),
    refetchInterval: 3000
  });

  const createOrderMutation = useMutation({
    mutationFn: (newOrder) => orderServices.createOrder(newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

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
