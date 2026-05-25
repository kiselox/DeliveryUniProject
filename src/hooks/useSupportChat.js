// src/hooks/useSupportChat.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Custom React Query Hook for managing support chat messaging in real-time.
 * Polling interval is set to 3 seconds for responsive chat experience.
 */
export function useSupportChat(chatId) {
  const queryClient = useQueryClient();

  // 1. Fetch messages polling query (polled every 3 seconds)
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

  // 2. Send message mutation
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
