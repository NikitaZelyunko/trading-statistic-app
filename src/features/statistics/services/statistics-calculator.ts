export type TQuotesStatistic = {
  average: number;
  mode: number;
  median: number;
  standartDeviation: number;
  valuesCount: number;
};

export function createStatisticsCalculator() {
  let valuesCount = 0; // переделать на big int
  const valuesCountMap = new Map<number, number>();

  // let valuesAverage = 0;
  // function recalcValuesAverage(valueDivCount: number, correctionFactor: number) {
  //   valuesAverage = valuesAverage * correctionFactor + valueDivCount;
  // }

  // let valuesQuadAverage = 0;
  // function recalcValuesQuadAverage(newValue: number, valueDivCount: number, correctionFactor: number) {
  //   valuesQuadAverage = valuesQuadAverage * correctionFactor + valueDivCount * newValue;
  // }

  function processMessage(newValue: number) {
    // const newValuesCount = valuesCount + 1;
    // const correctionFactor = valuesCount / newValuesCount;
    // const valueDivCount = newValue / newValuesCount;
    // valuesCount = newValuesCount;
    valuesCount++;

    valuesCountMap.set(newValue, (valuesCountMap.get(newValue) ?? 0) + 1);

    // recalcValuesAverage(valueDivCount, correctionFactor);
    // recalcValuesQuadAverage(newValue, valueDivCount, correctionFactor);
  }

  function calculateMode() {
    let maxCount = 0;
    let mode = 0;
    for (let [item, count] of valuesCountMap.entries()) {
      if (count > maxCount) {
        mode = item;
        maxCount = count;
      }
    }
    return mode;
  }

  function getStepAverage(itemsCount: number) {
    let average = 0;

    function step(item: number, count: number) {
      average += (item * count) / itemsCount;
    }

    function getResult() {
      return average;
    }

    return {
      step,
      getResult,
    };
  }

  function getStepValuesQuadsAverage(itemsCount: number) {
    let valuesQuadsAverage = 0;

    function step(item: number, count: number) {
      valuesQuadsAverage += (Math.pow(item, 2) * count) / itemsCount;
    }

    function getResult() {
      return valuesQuadsAverage;
    }

    return {
      step,
      getResult,
    };
  }

  function getStepMode() {
    let mode = 0;
    let modeCount = 0;

    function step(item: number, count: number) {
      if (count > modeCount) {
        modeCount = count;
        mode = item;
      }
    }

    function getResult() {
      return mode;
    }

    return {
      step,
      getResult,
    };
  }

  function getStepMedian(valuesCount: number) {
    const medianIndex = Math.floor(valuesCount / 2);
    const isEven = valuesCount % 2 === 0;
    let median = 0;
    let medianFound = false;

    let valueIndexInFlatArray = 0;

    function step(item: number, count: number, itemIndex: number, items: [number, number][]) {
      if (medianFound) {
        return;
      }
      const newValueIndexInFlatArray = valueIndexInFlatArray + count;

      if (newValueIndexInFlatArray > medianIndex) {
        if (isEven) {
          if (count === 1) {
            const prev = items[itemIndex - 1];
            if (!prev) {
              throw new Error('previous value with count not found');
            }
            const [prevItem] = prev;
            median = (prevItem + item) / 2;
          } else {
            median = item;
          }
        } else {
          median = item;
        }
        medianFound = true;
      }
      valueIndexInFlatArray = newValueIndexInFlatArray;
    }

    function getResult() {
      return median;
    }

    return {
      step,
      getResult,
    };
  }

  function iterateSortedValuesWithCounts(sortedValuesCounts: [number, number][], valuesCount: number) {
    const { getResult: getValuesAverageResult, step: stepAverage } = getStepAverage(valuesCount);

    const { getResult: getValuesQuadsAverageResult, step: stepValuesQuadsAverage } =
      getStepValuesQuadsAverage(valuesCount);

    const { getResult: getModeResult, step: stepMode } = getStepMode();

    const { getResult: getMedianResult, step: stepMedian } = getStepMedian(valuesCount);

    for (let i = 0; i < sortedValuesCounts.length; i++) {
      const valueWithCount = sortedValuesCounts[i];
      if (!valueWithCount) {
        throw new Error('value with count not found');
      }
      const [item, count] = valueWithCount;

      stepAverage(item, count);
      stepValuesQuadsAverage(item, count);
      stepMode(item, count);
      stepMedian(item, count, i, sortedValuesCounts);
    }

    const valuesAverage = getValuesAverageResult();
    const standartDeviation = Math.sqrt(getValuesQuadsAverageResult() - Math.pow(valuesAverage, 2));
    const result: TQuotesStatistic = {
      average: valuesAverage,
      median: getMedianResult(),
      mode: getModeResult(),
      standartDeviation: standartDeviation,
      valuesCount,
    };
    return result;
  }

  function getActualStatistics(): TQuotesStatistic {
    console.log('Statistics', Array.from(valuesCountMap.entries()));

    const sortedValuesCounts = Array.from(valuesCountMap.entries()).sort(([a], [b]) => {
      return a - b;
    });

    // function getDifference(expectedResult: TQuotesStatistic, calculatedResult: TQuotesStatistic): TQuotesStatistic {
    //   return {
    //     average: expectedResult.average - calculatedResult.average,
    //     median: expectedResult.median - calculatedResult.median,
    //     mode: expectedResult.mode - calculatedResult.mode,
    //     standartDeviation: expectedResult.standartDeviation - calculatedResult.standartDeviation,
    //     valuesCount: expectedResult.valuesCount - calculatedResult.valuesCount,
    //   };
    // }

    // const firstTestValues: [number, number][] = [
    //   [3, 1],
    //   [4, 2],
    //   [5, 1],
    //   [7, 3],
    //   [10, 1],
    //   [15, 2],
    //   [22, 1],
    //   [23, 2],
    // ];
    // const firstTestValuesCount = 13;
    // const firstResult: TQuotesStatistic = {
    //   average: firstTestValues.reduce((acc, [item, count]) => acc + item * count, 0) / firstTestValuesCount,
    //   median: 7,
    //   mode: 7,
    //   standartDeviation: 7.27,
    //   valuesCount: firstTestValuesCount,
    // };

    // console.log(
    //   'FIRST',
    //   getDifference(firstResult, iterateSortedValuesWithCounts(firstTestValues, firstTestValuesCount)),
    // );

    // const secondTestValues: [number, number][] = [
    //   [1, 1],
    //   [2, 2],
    //   [3, 1],
    //   [4, 3],
    //   [5, 1],
    //   [6, 2],
    //   [7, 1],
    //   [8, 2],
    // ];
    // const secondTestValuesCount = 13;
    // const secondResult: TQuotesStatistic = {
    //   average: secondTestValues.reduce((acc, [item, count]) => acc + item * count, 0) / secondTestValuesCount,
    //   median: 4,
    //   mode: 4,
    //   standartDeviation: 2.2,
    //   valuesCount: secondTestValuesCount,
    // };
    // console.log(
    //   'SECOND',
    //   getDifference(secondResult, iterateSortedValuesWithCounts(secondTestValues, secondTestValuesCount)),
    // );

    // const thirdTestValues: [number, number][] = [
    //   [1, 1],
    //   [2, 2],
    //   [3, 1],
    //   [4, 1],
    //   [5, 1],
    //   [6, 2],
    // ];
    // const thirdTestValuesCount = 8;
    // const thirdResult: TQuotesStatistic = {
    //   average: thirdTestValues.reduce((acc, [item, count]) => acc + item * count, 0) / thirdTestValuesCount,
    //   median: 3.5,
    //   mode: 2,
    //   standartDeviation: 1.8,
    //   valuesCount: thirdTestValuesCount,
    // };
    // console.log(
    //   'THIRD',
    //   getDifference(thirdResult, iterateSortedValuesWithCounts(thirdTestValues, thirdTestValuesCount)),
    // );

    return iterateSortedValuesWithCounts(sortedValuesCounts, valuesCount);
  }

  return {
    processMessage,
    getActualStatistics,
  };
}
