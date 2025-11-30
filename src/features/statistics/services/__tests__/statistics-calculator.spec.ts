import { describe, it, expect } from 'vitest';

import { createStatisticsCalculator } from '../statistics-calculator';

describe('Statistics-calculator', () => {
  it.each([
    {
      messagesBlocks: [
        [3, 4, 5, 7, 7],
        [23, 10, 23, 15, 22, 7, 4, 15],
      ],
      expectedResult: {
        average: 11.15,
        median: 7,
        mode: 7,
        standardDeviation: 7.27,
        valuesCount: 13,
      },
    },
    {
      messagesBlocks: [
        [1, 8, 7, 3, 2],
        [4, 2, 6, 8, 4],
        [6, 5, 4],
      ],
      expectedResult: {
        average: 4.62,
        median: 4,
        mode: 4,
        standardDeviation: 2.2,
        valuesCount: 13,
      },
    },
    {
      messagesBlocks: [[6, 5, 1, 2, 3, 4, 2, 6]],
      expectedResult: {
        average: 3.63,
        median: 3.5,
        mode: 2,
        standardDeviation: 1.8,
        valuesCount: 8,
      },
    },
    {
      messagesBlocks: [[1], [3], [2], [2], [3], [3]],
      expectedResult: {
        average: 2.33,
        median: 2.5,
        mode: 3,
        standardDeviation: 0.75,
        valuesCount: 6,
      },
    },
  ])('Статистики корректно рассчитываются', ({ messagesBlocks, expectedResult }) => {
    const statisticsCalculator = createStatisticsCalculator();

    for (const messages of messagesBlocks) {
      messages.forEach((message) => statisticsCalculator.processMessage(message));
      statisticsCalculator.getActualStatistics();
    }

    const actualStatistic = statisticsCalculator.getActualStatistics();
    expect(actualStatistic.statistics.average.toFixed(2)).toEqual(expectedResult.average.toFixed(2));
    expect(actualStatistic.statistics.median).toEqual(expectedResult.median);
    expect(actualStatistic.statistics.mode).toEqual(expectedResult.mode);
    expect(actualStatistic.statistics.standardDeviation.toFixed(2)).toEqual(
      expectedResult.standardDeviation.toFixed(2),
    );
    expect(actualStatistic.statistics.valuesCount).toEqual(expectedResult.valuesCount);
  });
});
