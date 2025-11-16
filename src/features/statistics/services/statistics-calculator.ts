export type TQuotesStatistic = {
  average: number;
  mode: number;
  median: number;
  standartDeviation: number;
  valuesCount: number;
};

type TValueCountObj = { count: number };

export function createStatisticsCalculator() {
  let valuesCount = 0; // переделать на big int
  const valuesCountMap = new Map<number, TValueCountObj>();

  let valuesAverage = 0;
  function recalcValuesAverage(valueDivCount: number, correctionFactor: number) {
    valuesAverage = valuesAverage * correctionFactor + valueDivCount;
  }

  let valuesQuadsAverage = 0;
  function recalcValuesQuadAverage(newValue: number, valueDivCount: number, correctionFactor: number) {
    valuesQuadsAverage = valuesQuadsAverage * correctionFactor + valueDivCount * newValue;
  }
  let needSort = true;
  let sortedValuesCounts: [number, TValueCountObj][] = [];

  /**
   * TODO Если не рассчитывать среднее, среднюю сумму квадратов, моду и т.п. в момент получения сообщения в processMessage,
   * то чтобы не проходить весь массив снова, то можно попробовать создать мапу которая будет собирать тоже самое что и valuesCountMap,
   * только не как она с самого начала, а с момента последнего рассчета средних и т.п. В этом случае можно будет воспользоваться теми же
   * формулами что и в recalcValuesAverage, и других (для моды тоже, да и для смещения медианы (об этом ниже)), но только не на всем списке,
   * а только на том который пришел с последнего рассчета средних. Возможно это повысит скорость обработки сообщений, хотя и потребление памяти
   * может вырости вдвое, в зависимости от того как часто будет запрашиваться актуальная статистика.
   *
   * TODO Моду можно рассчитывать тоже при появлении каждого нового значения.
   * Если у нас есть текущая мода (значение и количество), то можно проверить какое значение count у пришедшего
   * значения, если больше чем у текущей моды, то это новая мода, если меньше, то мода остается старой.
   * Если новое значение совпадает со значением моды, значит количество соответствующее моде нужно увеличить.
   *
   * TODO Если у нас есть медиана, то вновь пришедшие значения можно с ней сравнивать.
   * Если значение меньше медианы, то индекс в плоском (т.е. виртуальный общий который мы не храним, но который восстановим по valuesCountMap)
   * массиве значений, значит индекс старой медианы (а точнее индекс элемента в sortedValuesCounts), которая теперь может и перестать
   * являться медианой смещается вправо, если значение больше, то индекс смещается вправо.
   * Идея в том, что зная куда сместилась старая медиана, можно начинать поиск актуальной с элемента старой медианы в массиве sortedValuesCounts.
   * Т.к. список значений только растет, старая медиана из массива не пропадет. Зная направление смещения, и индекс актуальной медианы, можно
   * начинать поиск не с начала массива, а со старой медианы, что должно приводить к сокращению итераций.
   *
   * TODO Есть предположение, что если вставлять новые элементы которые не попали в прошлый отсортированный массив sortedValuesCounts ему в конец, а затем
   * отсортировать его же (а не получать его из valuesCountMap), то это может быть быстрее чем создание массива с нуля и его последующая сортировка.
   *
   * TODO Есть предположение, что на больших количествах уникальных значений сортировку можно ускорить за счет использования односвязного(или двусвязного) списка
   * для аналогичных целей что и массив sortedValuesCounts. Идея в том, что новые (именно новые уникальные, а не просто увеличение количества существующих)
   * значения помещать в буфер, который в последствии будет отсортирован и путем прохода по списку значения займут свои места и список останется отсортированным.
   * Это предположение, т.к. не ясно будет ли такая вставка в список эффективнее пересортировки.
   */

  function processMessage(newValue: number) {
    const newValuesCount = valuesCount + 1;
    const correctionFactor = valuesCount / newValuesCount;
    const valueDivCount = newValue / newValuesCount;
    valuesCount = newValuesCount;
    // valuesCount++;

    const valueCount = valuesCountMap.get(newValue);
    if (typeof valueCount === 'undefined') {
      valuesCountMap.set(newValue, { count: 1 });
      needSort = true;
    } else {
      valueCount.count++;
    }

    // valuesCountMap.set(newValue, (valuesCountMap.get(newValue) ?? 0) + 1);

    recalcValuesAverage(valueDivCount, correctionFactor);
    recalcValuesQuadAverage(newValue, valueDivCount, correctionFactor);
  }

  function getStepAverages(itemsCount: number) {
    let valuesAverage = 0;
    let valuesQuadsAverage = 0;

    function step(item: number, count: number) {
      const itemSumAverage = (item * count) / itemsCount;
      valuesAverage += itemSumAverage;
      valuesQuadsAverage += itemSumAverage * item;
    }

    function getResult() {
      return {
        valuesAverage,
        valuesQuadsAverage,
      };
    }

    return {
      step,
      getResult,
    };
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

    function step(item: number, count: number, itemIndex: number, items: [number, TValueCountObj][]) {
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

  function iterateSortedValuesWithCounts(sortedValuesCounts: [number, TValueCountObj][], valuesCount: number) {
    // const { getResult: getAveragesResult, step: stepAverages } = getStepAverages(valuesCount);
    // const { getResult: getValuesAverageResult, step: stepAverage } = getStepAverage(valuesCount);

    // const { getResult: getValuesQuadsAverageResult, step: stepValuesQuadsAverage } =
    //   getStepValuesQuadsAverage(valuesCount);

    const { getResult: getModeResult, step: stepMode } = getStepMode();

    const { getResult: getMedianResult, step: stepMedian } = getStepMedian(valuesCount);

    for (let i = 0; i < sortedValuesCounts.length; i++) {
      const valueWithCount = sortedValuesCounts[i];
      if (!valueWithCount) {
        throw new Error('value with count not found');
      }
      const [item, { count }] = valueWithCount;

      // stepAverages(item, count);
      // stepAverage(item, count);
      // stepValuesQuadsAverage(item, count);
      stepMode(item, count);
      stepMedian(item, count, i, sortedValuesCounts);
    }

    // const { valuesAverage, valuesQuadsAverage } = getAveragesResult();
    const standartDeviation = Math.sqrt(valuesQuadsAverage - Math.pow(valuesAverage, 2));
    // const valuesAverage = getValuesAverageResult();
    // const standartDeviation = Math.sqrt(getValuesQuadsAverageResult() - Math.pow(valuesAverage, 2));
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
    // console.log('Statistics', Array.from(valuesCountMap.entries()));

    const calculateStartMark = performance.now();

    if (needSort) {
      sortedValuesCounts = Array.from(valuesCountMap.entries()).sort(([a], [b]) => {
        return a - b;
      });
      needSort = false;
    }

    const calculationTime = Math.floor(
      performance.measure('values-count-map-sorting', {
        start: calculateStartMark,
        end: performance.now(),
      }).duration,
    );

    setTimeout(() => {
      console.log('SORTING_TIME:', calculationTime);
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
