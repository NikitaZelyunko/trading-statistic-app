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
  // const { lastMessage, destroy } = emulateManyQuoutes();

  const emulatedLastMessage = ref<TQuouteData>({ id: '', value: 0 });

  const trillion = 1000000000000;
  const milliard = 1000000000;
  const million = 1000000;
  const thousand = 1000;
  let counter = 0;
  function createTimeout() {
    console.log('COUNTER: ', counter);
    if (counter === million) {
      console.log('END OF MESSAGES');
      return;
    }
    setTimeout(() => {
      counter++;
      for (let i = 1; i < 10001; i++) {
        emulatedLastMessage.value = {
          id: '12345678',
          // value: Math.floor(10000 * Math.random())
          value: i,
        };
      }

      createTimeout();
    });
  }

  createTimeout();

  return {
    lastMessage: emulatedLastMessage,
    destroy: () => {},
  };
}

type TMessageListener<M> = (message: M) => void;

export function createInWorkerQuotesFlow() {
  let messageListener: TMessageListener<TQuouteData> | null = null;

  function addMessageListener(listener: TMessageListener<TQuouteData>) {
    messageListener = listener;
  }

  function removeMessageListener(listener: TMessageListener<TQuouteData>) {
    messageListener = null;
  }

  let messagesGenerationIsActive = false;
  let actualTimerId: number;
  function initMessagesGeneration({ messagesPerTask }: { messagesPerTask: number }) {
    function createTimeout() {
      actualTimerId = setTimeout(() => {
        if (!messagesGenerationIsActive || !messageListener) {
          return;
        }
        console.log('START MESSAGES CHUNK');
        for (let i = 1; i < messagesPerTask; i++) {
          messageListener({ id: '-1', value: Math.round(10000 * Math.random()) });
        }

        createTimeout();
      });
    }

    createTimeout();
  }

  function startMessagesFlow() {
    messagesGenerationIsActive = true;
    clearTimeout(actualTimerId);
    initMessagesGeneration({ messagesPerTask: 1000000 });
  }

  function stopMessagesFlow() {
    messagesGenerationIsActive = false;
    clearTimeout(actualTimerId);
  }

  return {
    addMessageListener,
    removeMessageListener,

    startMessagesFlow,
    stopMessagesFlow,
  };
}
