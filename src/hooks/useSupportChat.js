import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export function useSupportChat(chatId) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['supportMessages', chatId],
    queryFn: async () => {
      if (!chatId) return [];
      const res = await api.get(`/support/messages/${chatId}`);
      return res.data;
    },
    enabled: !!chatId,
    refetchInterval: 3000
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const res = await api.post('/support/messages', messageData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportMessages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['supportChats'] });
    }
  });

  return {
    messages,
    isLoading,
    isError,
    refetch,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending
  };
}
