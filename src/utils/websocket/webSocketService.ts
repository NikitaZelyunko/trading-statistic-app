type TAutoReconnectConfig = {
  tryCount: number;
};

export type TWebSocketServiceConfig = {
  immediate: boolean;
  autoReconnect: TAutoReconnectConfig | false;
};

export type TWebSocketStatus = 'error' | 'pending' | 'closed';

export function createWebSocketService<T>(
  path: string,
  { immediate, autoReconnect }: Partial<TWebSocketServiceConfig> = {
    immediate: true,
    autoReconnect: false,
  },
) {
  let connection: WebSocket | null = null;

  let status: TWebSocketStatus = 'pending';

  let statusListener: ((status: TWebSocketStatus) => void) | null;
  function addStatusListener(listener: Exclude<typeof statusListener, null>) {
    statusListener = listener;
  }

  function removeStatusListener() {
    statusListener = null;
  }

  function changeStatus(newStatus: TWebSocketStatus) {
    status = newStatus;
    statusListener?.(status);
  }

  function getStatus() {
    return status;
  }

  function openHandler() {
    console.log('Connection opens');
  }

  let messageListener: ((message: T) => void) | null;
  function addMessageListener(listener: Exclude<typeof messageListener, null>) {
    messageListener = listener;
  }

  function removeMessageListener() {
    messageListener = null;
  }

  function messageHandler(event: MessageEvent<T>) {
    if (!messageListener) {
      return;
    }
    messageListener(event.data);
  }

  function closeHandler() {
    console.log('Connection closed');
  }

  let reconnectionAttemptsCount = 0;
  function errorHandler(error: Event) {
    if (autoReconnect && autoReconnect.tryCount > reconnectionAttemptsCount) {
      reconnectionAttemptsCount++;
      destroyConnection();
      createConnection();
      return;
    }
    changeStatus('error');
  }

  function flushConnectionAttemptsCount() {
    reconnectionAttemptsCount = 0;
  }

  function createConnection() {
    const newConnection = new WebSocket(path);

    newConnection.addEventListener('open', openHandler);
    newConnection.addEventListener('message', messageHandler);
    newConnection.addEventListener('close', closeHandler);
    newConnection.addEventListener('error', errorHandler);

    connection = newConnection;
    changeStatus('pending');
  }

  function closeConnection() {
    if (!connection) {
      return;
    }
    connection.close(1000);
    // TODO подумать нужно ли здесь убирать добавленные в connection листенеры
    connection = null;
    changeStatus('closed');
  }

  function beforeUnloadHandler() {
    closeConnection();
  }

  function registerBeforeUnloadHandler() {
    if (!globalThis.window) {
      return;
    }
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }

  function unregisterBeforeUnloadHandler() {
    if (!globalThis.window) {
      return;
    }
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  }

  function startConnection() {
    closeConnection();
    createConnection();
    registerBeforeUnloadHandler();
  }

  function destroyConnection() {
    closeConnection();
    unregisterBeforeUnloadHandler();
  }

  if (immediate) {
    startConnection();
  }

  return {
    addMessageListener,
    removeMessageListener,

    start: startConnection,

    flushConnectionAttemptsCount,

    addStatusListener,
    removeStatusListener,
    getStatus,

    destroy: destroyConnection,
  };
}
