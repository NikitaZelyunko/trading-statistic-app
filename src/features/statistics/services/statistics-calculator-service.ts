import { onScopeDispose, watch } from 'vue';
import { createQuotesFlow } from '../api/create-quotes-flow';
import { useWebWorker } from '@/utils/web-worker/useWebWorker';
import type {
  TGetStatisticsMessageFromWorker,
  TStatisticsCalculatorWorkerEventData,
} from './statistics-calculator-worker';
import type { TQuotesStatistic } from './statistics-calculator';

function useStatisticCalculatorWorker() {
  const workerApi = useWebWorker<TStatisticsCalculatorWorkerEventData, TGetStatisticsMessageFromWorker>(
    new URL('./statistics-calculator-worker', import.meta.url),
    {
      type: 'module',
    },
  );

  function getStatistics() {
    const { resolve, promise } = Promise.withResolvers<TQuotesStatistic>();
    workerApi.sendMessageToWorker('get-statistics');

    const stopWatchMessage = watch(workerApi.data, (dataValue) => {
      if (dataValue?.eventName === 'get-statistics') {
        resolve(dataValue.data);
        stopWatchMessage();
      }
    });

    return promise;
  }

  function startValuesCollection() {
    workerApi.sendMessageToWorker('start-messages-processing');
  }

  function stopValuesCollection() {
    workerApi.sendMessageToWorker('stop-messages-processing');
  }

  function destroy() {
    workerApi.terminate();
  }

  return {
    startValuesCollection,
    stopValuesCollection,

    getStatistics,

    destroy,
  };
}

export type TActualQuotesStatistic = {
  statistics: TQuotesStatistic;
  calculationTime: number;
};

export function useStatisticsCalculatorService() {
  const statisticCalculatorWorkerApi = useStatisticCalculatorWorker();

  function start() {
    statisticCalculatorWorkerApi.startValuesCollection();
  }

  function stop() {
    statisticCalculatorWorkerApi.stopValuesCollection();
  }

  async function getActualStatistics(): Promise<TActualQuotesStatistic> {
    const calculateStartMark = performance.now();
    const statistics = await statisticCalculatorWorkerApi.getStatistics();
    const calculationTime = Math.floor(
      performance.measure('statistic-calculation', {
        start: calculateStartMark,
        end: performance.now(),
      }).duration,
    );
    return {
      statistics,
      calculationTime,
    };
  }

  onScopeDispose(() => {
    statisticCalculatorWorkerApi.destroy();
  });

  return {
    start,
    stop,

    getActualStatistics,
  };
}
