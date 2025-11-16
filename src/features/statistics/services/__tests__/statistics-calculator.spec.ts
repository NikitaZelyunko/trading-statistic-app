import { describe, it, expect } from 'vitest';

import { createStatisticsCalculator } from '../statistics-calculator';

describe('Statistics-calculator', () => {
  it.each([
    {
      messages: [3, 4, 5, 7, 7, 23, 10, 23, 15, 22, 7, 4, 15],
      expectedResult: {
        average: 11.15,
        median: 7,
        mode: 7,
        standartDeviation: 7.27,
        valuesCount: 13,
      },
    },
    {
      messages: [1, 8, 7, 3, 2, 4, 2, 6, 8, 4, 6, 5, 4],
      expectedResult: {
        average: 4.62,
        median: 4,
        mode: 4,
        standartDeviation: 2.2,
        valuesCount: 13,
      },
    },
    {
      messages: [6, 5, 1, 2, 3, 4, 2, 6],
      expectedResult: {
        average: 3.63,
        median: 3.5,
        mode: 2,
        standartDeviation: 1.8,
        valuesCount: 8,
      },
    },
  ])('Статистики корректно рассчитываются', ({ messages, expectedResult }) => {
    const statisticsCalculator = createStatisticsCalculator();

    messages.forEach((message) => statisticsCalculator.processMessage(message));

    const actualStatistic = statisticsCalculator.getActualStatistics();
    expect(actualStatistic.average.toFixed(2)).toEqual(expectedResult.average.toFixed(2));
    expect(actualStatistic.median).toEqual(expectedResult.median);
    expect(actualStatistic.mode).toEqual(expectedResult.mode);
    expect(actualStatistic.standartDeviation.toFixed(2)).toEqual(expectedResult.standartDeviation.toFixed(2));
    expect(actualStatistic.valuesCount).toEqual(expectedResult.valuesCount);
  });
});
