export type TQuotesStatistic = {
  average: number;
  mode: number;
  median: number;
  standardDeviation: number;
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

  let currentMode = 0;
  let currentModeCount = 0;
  function recalcMode(newValue: number, newValueCount: number) {
    if (newValueCount > currentModeCount) {
      currentMode = newValue;
      currentModeCount = newValueCount;
    }
  }

  /**
   * Если у нас есть старая медиана, то вновь пришедшие значения можно с ней сравнивать.
   * Если значение меньше медианы, то индекс в плоском (т.е. виртуальный общий который мы не храним, но который восстановим по valuesCountMap)
   * массиве значений, значит индекс старой медианы (а точнее индекс элемента в sortedValuesCounts), которая теперь может и перестать
   * являться медианой смещается вправо, если значение больше, то индекс смещается вправо.
   */
  let hasOldMedian = false;
  let oldMedian = 0;
  let oldMedianValueCountIndex = 0;
  let oldMedianValueCountItemStartFlatIndex = 0;

  let needSort = false;
  let sortedValuesCounts: [number, TValueCountObj][] = [];

  /**
   * TODO Если не рассчитывать среднее, среднюю сумму квадратов, моду и т.п. в момент получения сообщения в processMessage,
   * то чтобы не проходить весь массив снова, то можно попробовать создать мапу которая будет собирать тоже самое что и valuesCountMap,
   * только не как она с самого начала, а с момента последнего рассчета средних и т.п. В этом случае можно будет воспользоваться теми же
   * формулами что и в recalcValuesAverage, и других (для моды тоже, да и для смещения медианы (об этом ниже)), но только не на всем списке,
   * а только на том который пришел с последнего рассчета средних. Возможно это повысит скорость обработки сообщений, хотя и потребление памяти
   * может вырости вдвое, в зависимости от того как часто будет запрашиваться актуальная статистика.
   *
   * TODO Если у нас есть медиана, то вновь пришедшие значения можно с ней сравнивать.
   * Если значение меньше медианы, то индекс в плоском (т.е. виртуальный общий который мы не храним, но который восстановим по valuesCountMap)
   * массиве значений, значит индекс старой медианы (а точнее индекс элемента в sortedValuesCounts), которая теперь может и перестать
   * являться медианой смещается вправо, если значение больше, то индекс смещается вправо.
   * Идея в том, что зная куда сместилась старая медиана, можно начинать поиск актуальной с элемента старой медианы в массиве sortedValuesCounts.
   * Т.к. список значений только растет, старая медиана из массива не пропадет. Зная направление смещения, и индекс актуальной медианы, можно
   * начинать поиск не с начала массива, а со старой медианы, что должно приводить к сокращению итераций.
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
      const newValueCount = { count: 1 };
      valuesCountMap.set(newValue, newValueCount);
      // Быстрее пересортировать этот массив, чем получать массив из valuesCountMap и сортировать его
      sortedValuesCounts.push([newValue, newValueCount]);
      needSort = true;
      if (hasOldMedian && newValue < oldMedian) {
        oldMedianValueCountIndex++;
        oldMedianValueCountItemStartFlatIndex++;
      }
    } else {
      valueCount.count++;
      if (hasOldMedian && newValue < oldMedian) {
        oldMedianValueCountItemStartFlatIndex++;
      }
    }

    // valuesCountMap.set(newValue, (valuesCountMap.get(newValue) ?? 0) + 1);

    recalcValuesAverage(valueDivCount, correctionFactor);
    recalcValuesQuadAverage(newValue, valueDivCount, correctionFactor);
    recalcMode(newValue, valueCount?.count ?? 0);
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
          if (count === 1 || medianIndex === valueIndexInFlatArray) {
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

  /**
   * Идея в том, что зная куда сместилась старая медиана, можно начинать поиск актуальной с элемента старой медианы в массиве sortedValuesCounts.
   * Т.к. список значений только растет, старая медиана из массива не пропадет. Зная направление смещения, и индекс актуальной медианы, можно
   * начинать поиск не с начала массива, а со старой медианы, что должно приводить к сокращению итераций.
   */
  function getMedian(
    sortedValuesCounts: [number, TValueCountObj][],
    valuesCount: number,
    oldMedianValueCountIndex: number,
    /**
     * Если представить, что [value, {count}] соответствует массиву [value, value, ..., value] длины count,
     * то это индекс первого элемента value в отсортированном полном (виртуальном) массиве значений
     */
    oldMedianValueCountItemStartFlatIndex: number,
  ) {
    const medianIndex = Math.floor(valuesCount / 2);
    const isEven = valuesCount % 2 === 0;
    let median = 0;
    let medianValueCountIndex = 0;

    let valueIndexInFlatArray = oldMedianValueCountItemStartFlatIndex;

    function processFoundedMedian(itemValue: number, itemCount: number, itemIndex: number) {
      if (isEven) {
        if (itemCount === 1 || medianIndex === valueIndexInFlatArray) {
          const prev = sortedValuesCounts[itemIndex - 1];
          if (!prev) {
            throw new Error('previous value with count not found');
          }
          const [prevItem] = prev;
          return (prevItem + itemValue) / 2;
        } else {
          return itemValue;
        }
      } else {
        return itemValue;
      }
    }

    let getNewValueIndexInFlatArray: (prevIndex: number, itemCount: number) => number;
    let medianFoundedCondition: (newIndex: number, medianIndex: number) => boolean;

    function stepMedianFind(valueCountIndex: number) {
      const item = sortedValuesCounts[valueCountIndex];
      if (!item) {
        throw new Error('value with count not found');
      }
      const [itemValue, { count: itemCount }] = item;
      const newValueIndexInFlatArray = getNewValueIndexInFlatArray(valueIndexInFlatArray, itemCount);

      if (medianFoundedCondition(newValueIndexInFlatArray, medianIndex)) {
        median = processFoundedMedian(itemValue, itemCount, valueCountIndex);
        medianValueCountIndex = valueCountIndex;
        return true;
      }
      valueIndexInFlatArray = newValueIndexInFlatArray;
      return false;
    }

    if (medianIndex < valueIndexInFlatArray) {
      getNewValueIndexInFlatArray = (prevIndex, itemCount) => prevIndex - itemCount;
      medianFoundedCondition = (newIndex, medianIndex) => newIndex <= medianIndex;

      for (let i = oldMedianValueCountIndex - 1; i >= 0; i--) {
        if (stepMedianFind(i)) {
          break;
        }
      }
    } else {
      getNewValueIndexInFlatArray = (prevIndex, itemCount) => prevIndex + itemCount;
      medianFoundedCondition = (newIndex, medianIndex) => newIndex > medianIndex;

      for (let i = oldMedianValueCountIndex; i < sortedValuesCounts.length; i++) {
        if (stepMedianFind(i)) {
          break;
        }
      }
    }

    return {
      median,
      medianValueCountIndex,
      medianValueCountItemStartFlatIndex: valueIndexInFlatArray,
    };
  }

  function iterateSortedValuesWithCounts(sortedValuesCounts: [number, TValueCountObj][], valuesCount: number) {
    // const { getResult: getAveragesResult, step: stepAverages } = getStepAverages(valuesCount);
    // const { getResult: getValuesAverageResult, step: stepAverage } = getStepAverage(valuesCount);

    // const { getResult: getValuesQuadsAverageResult, step: stepValuesQuadsAverage } =
    //   getStepValuesQuadsAverage(valuesCount);

    // const { getResult: getModeResult, step: stepMode } = getStepMode();

    // const { getResult: getMedianResult, step: stepMedian } = getStepMedian(valuesCount);

    // for (let i = 0; i < sortedValuesCounts.length; i++) {
    //   const valueWithCount = sortedValuesCounts[i];
    //   if (!valueWithCount) {
    //     throw new Error('value with count not found');
    //   }
    //   const [item, { count }] = valueWithCount;

    //   // stepAverages(item, count);
    //   // stepAverage(item, count);
    //   // stepValuesQuadsAverage(item, count);
    //   // stepMode(item, count);
    //   stepMedian(item, count, i, sortedValuesCounts);
    // }

    const medianFoundResult = getMedian(
      sortedValuesCounts,
      valuesCount,
      oldMedianValueCountIndex,
      oldMedianValueCountItemStartFlatIndex,
    );

    hasOldMedian = true;
    oldMedian = medianFoundResult.median;
    oldMedianValueCountIndex = medianFoundResult.medianValueCountIndex;
    oldMedianValueCountItemStartFlatIndex = medianFoundResult.medianValueCountItemStartFlatIndex;

    // const { valuesAverage, valuesQuadsAverage } = getAveragesResult();
    const standartDeviation = Math.sqrt(valuesQuadsAverage - Math.pow(valuesAverage, 2));
    // const valuesAverage = getValuesAverageResult();
    // const standartDeviation = Math.sqrt(getValuesQuadsAverageResult() - Math.pow(valuesAverage, 2));
    const result: TQuotesStatistic = {
      average: valuesAverage,
      // median: getMedianResult(),
      median: medianFoundResult.median,
      // mode: getModeResult(),
      mode: currentMode,
      standardDeviation: standartDeviation,
      valuesCount,
    };
    return result;
  }

  function getActualStatistics(): TQuotesStatistic {
    // console.log('Statistics', Array.from(valuesCountMap.entries()));

    const calculateStartMark = performance.now();

    if (needSort) {
      /** Отсутствие пересоздания массива и его сортировки с нуля приводит к ускорению сортировки */
      sortedValuesCounts.sort(([a], [b]) => {
        return a - b;
      });
      // sortedValuesCounts = Array.from(valuesCountMap.entries()).sort(([a], [b]) => {
      //   return a - b;
      // });
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

    return iterateSortedValuesWithCounts(sortedValuesCounts, valuesCount);
  }

  return {
    processMessage,
    getActualStatistics,
  };
}
