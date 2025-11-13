import { onScopeDispose, ref } from 'vue';

export function useWebWorker<M, D>(scriptUrl: URL, workerOptions?: WorkerOptions) {
  const worker = new Worker(scriptUrl, workerOptions);
  const data = ref<D | undefined>();

  function onWorkerMessage(event: MessageEvent<D>) {
    data.value = event.data;
  }
  worker.addEventListener('message', onWorkerMessage, {});

  function sendMessageToWorker(message: M) {
    worker.postMessage(message);
  }

  function terminateWorker() {
    worker.terminate();
  }

  onScopeDispose(() => {
    terminateWorker();
  });

  return {
    sendMessageToWorker,
    terminate: terminateWorker,
    data,
  };
}
