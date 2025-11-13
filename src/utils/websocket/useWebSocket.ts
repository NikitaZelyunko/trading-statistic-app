import { onScopeDispose, ref } from 'vue';

type TAutoReconnectConfig = {
  tryCount: number;
};

// type THeartBeatConfig = {
//   message: string;
//   interval: number;
//   // pongTimeout: number;
// };

export type TUseWebSocketConfig = {
  immediate: boolean;
  autoClose: boolean;
  autoReconnect: TAutoReconnectConfig | false;
  // heartbeat: THeartBeatConfig | false; // TODO нужно посмотреть нужно это или нет
};

export function useWebSocket<T>(
  path: string,
  { immediate, autoClose, autoReconnect }: Partial<TUseWebSocketConfig> = {
    immediate: true,
    autoClose: true,
    autoReconnect: false,
    // heartbeat: false,
  },
) {
  const connection = ref<WebSocket | null>(null);

  const status = ref<'error' | 'pending' | 'closed'>('pending');

  function openHandler() {
    console.log('Connection opens');
  }

  const lastMessage = ref<T | null>(null);
  // let lastMessageDerivedTime = 0;

  function messageHandler(event: MessageEvent<T>) {
    // console.log('Message:', event); // event.data
    lastMessage.value = event.data;
    // lastMessageDerivedTime = Date.now();
  }

  function closeHandler() {
    console.log('Connection closed');
  }

  let reconnectionAttemptsCount = 0;
  function errorHandler(error: Event) {
    console.log('Websocket error:', error);
    if (autoReconnect && autoReconnect.tryCount > reconnectionAttemptsCount) {
      reconnectionAttemptsCount++;
      destroyConnection();
      createConnection();
      return;
    }
    status.value = 'error';
  }

  function flushConnectionAttemptsCount() {
    reconnectionAttemptsCount = 0;
  }

  // function messageToConnection(message: string) {
  //   connection.value?.send(message);
  // }

  // let heartbeatConnectionIntervalId: number | undefined;
  // function registerHeartbeatConnection(config: THeartBeatConfig) {
  //   heartbeatConnectionIntervalId = setInterval(() => {
  //     if (lastMessageDerivedTime === 0) {
  //       return;
  //     }
  //     const currentTime = Date.now();
  //     if (currentTime > lastMessageDerivedTime + config.interval) {
  //       messageToConnection(config.message);
  //     }
  //   }, config.interval);
  // }

  // function unregisterHeartbeatConnection() {
  //   clearInterval(heartbeatConnectionIntervalId);
  // }

  function createConnection() {
    const newConnection = new WebSocket(path);

    newConnection.addEventListener('open', openHandler);
    newConnection.addEventListener('message', messageHandler);
    newConnection.addEventListener('close', closeHandler);
    newConnection.addEventListener('error', errorHandler);

    connection.value = newConnection;
    status.value = 'pending';
  }

  function closeConnection() {
    if (!connection.value) {
      return;
    }
    connection.value.close(1000);
    // TODO подумать нужно ли здесь убирать добавленные в connection листенеры
    connection.value = null;
    status.value = 'closed';
  }

  function beforeUnloadHandler() {
    closeConnection();
  }

  function registerBeforeUnloadHandler() {
    if (!window) {
      return;
    }
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }

  function unregisterBeforeUnloadHandler() {
    if (!window) {
      return;
    }
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  }

  function startConnection() {
    closeConnection();
    createConnection();
    registerBeforeUnloadHandler();
    // if (heartbeat) {
    //   registerHeartbeatConnection(heartbeat);
    // }
  }

  function destroyConnection() {
    // lastMessageDerivedTime = 0;
    closeConnection();
    unregisterBeforeUnloadHandler();
    // unregisterHeartbeatConnection();
  }

  if (autoClose) {
    onScopeDispose(() => {
      destroyConnection();
    });
  }

  if (immediate) {
    startConnection();
  }

  return {
    destroy: destroyConnection,
    start: startConnection,
    flushConnectionAttemptsCount,
    lastMessage,
    status,
  };
}
