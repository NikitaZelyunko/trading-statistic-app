import { watch } from 'vue';
import { createQuotesFlow } from '../api/create-quotes-flow';

export type TQuotesStatistic = {
  average: number;
  mode: number;
  median: number;
  standartDeviation: number;
};

export type TActualQuotesStatistic = {
  statistic: TQuotesStatistic;
  valuesCount: number;
  calculationTime: number;
};

export function createStatisticsCalculator() {
  const messageFlow = createQuotesFlow();

  function destroy() {
    messageFlow.destroy();
  }

  watch(messageFlow.lastMessage, (newMessage) => {
    processMessage(newMessage.value);
  });

  let messagesCount = 0; // переделать на big int
  const statisticsMap = new Map<number, number>();

  function processMessage(value: number) {
    messagesCount++;
    statisticsMap.set(value, (statisticsMap.get(value) ?? 0) + 1);
  }

  function calculateAverage() {
    let averageResult = 0;
    for (const [value, count] of statisticsMap.entries()) {
      averageResult += (value * count) / messagesCount;
    }

    return averageResult;
  }

  function getActualStatistics(): TActualQuotesStatistic {
    const calculateStartMark = performance.now();
    const result: TQuotesStatistic = {
      average: calculateAverage(),
      mode: 0,
      median: 0,
      standartDeviation: 0,
    };
    const calculationTime = Math.floor(
      performance.measure('statistic-calculation', {
        start: calculateStartMark,
        end: performance.now(),
      }).duration,
    );

    return {
      statistic: result,
      valuesCount: messagesCount,
      calculationTime,
    };
  }

  return {
    getActualStatistics,
    destroy,
  };
}
