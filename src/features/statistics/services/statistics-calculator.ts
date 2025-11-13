export type TQuotesStatistic = {
  average: number;
  mode: number;
  median: number;
  standartDeviation: number;
  valuesCount: number;
};

export function createStatisticsCalculator() {
  let valuesCount = 0; // переделать на big int
  const statisticsMap = new Map<number, number>();

  function processMessage(value: number) {
    valuesCount++;
    statisticsMap.set(value, (statisticsMap.get(value) ?? 0) + 1);
  }

  function calculateAverage() {
    let averageResult = 0;
    for (const [value, count] of statisticsMap.entries()) {
      averageResult += (value * count) / valuesCount;
    }

    return averageResult;
  }

  function getActualStatistics(): TQuotesStatistic {
    const result: TQuotesStatistic = {
      average: calculateAverage(),
      mode: 0,
      median: 0,
      standartDeviation: 0,
      valuesCount,
    };
    return result;
  }

  return {
    processMessage,
    getActualStatistics,
  };
}
