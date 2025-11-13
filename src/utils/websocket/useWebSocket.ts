import { onScopeDispose, ref } from 'vue';
import { createWebSocketService, type TWebSocketServiceConfig, type TWebSocketStatus } from './webSocketService';

export type TUseWebSocketConfig = TWebSocketServiceConfig & {
  autoClose: boolean;
};

export function useWebSocket<T>(
  path: string,
  { immediate, autoClose, autoReconnect }: Partial<TUseWebSocketConfig> = {
    autoClose: true,
  },
) {
  const webSocketService = createWebSocketService<T>(path, { immediate, autoReconnect });

  const status = ref<TWebSocketStatus>(webSocketService.getStatus());
  webSocketService.addStatusListener((newStatus) => (status.value = newStatus));

  const lastMessage = ref<T | null>(null);
  webSocketService.addMessageListener((newMessage) => (lastMessage.value = newMessage));

  function destroyConnection() {
    webSocketService.removeMessageListener();
    webSocketService.removeStatusListener();
    webSocketService.destroy();
  }

  if (autoClose) {
    onScopeDispose(() => {
      destroyConnection();
    });
  }

  return {
    destroy: destroyConnection,
    start: webSocketService.start,
    flushConnectionAttemptsCount: webSocketService.flushConnectionAttemptsCount,
    lastMessage,
    status,
  };
}
