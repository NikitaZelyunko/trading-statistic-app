import { onScopeDispose, watch } from 'vue';
import { createQuotesFlow } from '../api/create-quotes-flow';
import { useWebWorker } from '@/utils/web-worker/useWebWorker';
import type {
  TGetStatisticsMessageFromWorker,
  TStatisticsCalculatorWorkerEventData,
} from './statistics-calculator-worker';
import type { TQuotesStatistic, TQuotesStatisticWithCalculationTimeInfo } from './statistics-calculator';

function useStatisticCalculatorWorker() {
  const workerApi = useWebWorker<TStatisticsCalculatorWorkerEventData, TGetStatisticsMessageFromWorker>(
    new URL('./statistics-calculator-worker', import.meta.url),
    {
      type: 'module',
    },
  );

  function getStatisticsWithCalculationTime() {
    const { resolve, promise } = Promise.withResolvers<TQuotesStatisticWithCalculationTimeInfo>();
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

    getStatisticsWithCalculationTime,

    destroy,
  };
}

type TCalculationTimeInfo = {
  statisticsCalculationTime: number;
  fullWaitingTime: number;
};
export type TActualQuotesStatistic = {
  statistics: TQuotesStatistic;
  calculationTimeInfo: TCalculationTimeInfo;
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
    const statisticsResult = await statisticCalculatorWorkerApi.getStatisticsWithCalculationTime();
    const fullWaitingTime = Math.floor(
      performance.measure('statistic-calculation', {
        start: calculateStartMark,
        end: performance.now(),
      }).duration,
    );
    return {
      statistics: statisticsResult.statistics,

      calculationTimeInfo: {
        fullWaitingTime,
        statisticsCalculationTime:
          statisticsResult.calculationTime.sortingTime + statisticsResult.calculationTime.medianFindTime,
      },
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
