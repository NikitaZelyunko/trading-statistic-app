import { useWebSocket } from '@/utils/websocket/useWebSocket';
import { ref, watch } from 'vue';
import type { TQuouteData } from '../types/quote-data';

function emulateManyQuoutes() {
  const currentConnection = ref<ReturnType<typeof useWebSocket> | null>(null);

  const lastMessage = ref<TQuouteData>({ id: '', value: 0 });

  let lastTimerId: number = 0;
  function updateCurrentConnection() {
    const newConnection = useWebSocket<string>('wss://trade.termplat.com:8800/?password=1234');
    currentConnection.value = newConnection;

    let lastMessageTime = 0;
    const watchUpdateClose = watch(newConnection.lastMessage, (newMessage) => {
      if (!newMessage) {
        return;
      }
      lastMessage.value = JSON.parse(newMessage);
      lastMessageTime = Date.now();
    });

    function destroyCurrentConnection() {
      watchUpdateClose();
      newConnection.destroy();
    }

    function createSilenceTimeout() {
      lastTimerId = setTimeout(() => {
        const timeNotExpired = !lastMessageTime || Date.now() < lastMessageTime + 1000;
        const restartTimerCondition = timeNotExpired && newConnection.status.value === 'pending';
        if (restartTimerCondition) {
          createSilenceTimeout();
          return;
        }
        destroyCurrentConnection();
        updateCurrentConnection();
      }, 1000);
    }

    createSilenceTimeout();
  }

  updateCurrentConnection();

  function destroy() {
    clearTimeout(lastTimerId);
    currentConnection.value?.destroy();
  }

  return {
    lastMessage,
    destroy,
  };
}

export function createQuotesFlow() {
  // const connection = useWebSocket('wss://trade.termplat.com:8800/?password=1234');
  const { lastMessage, destroy } = emulateManyQuoutes();

  watch(lastMessage, (message) => {
    console.log('HELLO', message);
  });

  return {
    lastMessage,
    destroy,
  };
}
