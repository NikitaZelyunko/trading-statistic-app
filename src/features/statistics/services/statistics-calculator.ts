export type TQuotesStatistic = {
  average: number;
  mode: number;
  median: number;
  standardDeviation: number;
  valuesCount: number;
};

export type TQuotesStatisticWithCalculationTimeInfo = {
  statistics: TQuotesStatistic;
  calculationTime: {
    sortingTime: number;
    medianFindTime: number;
  };
};

type TValueCountObj = { count: number };

type TMedianFindResult = {
  median: number;
  medianValueCountIndex: number;
  medianValueCountItemStartFlatIndex: number;
};

type TValuesCountsList = [number, TValueCountObj][];
type TValuesCountsListInfo = {
  needSort: boolean;
  list: TValuesCountsList;
};
type TSortValuesCountsListResult = {
  valuesCountsListInfo: TValuesCountsListInfo;
  calculationTime: number;
};

export function createStatisticsCalculator() {
  // TODO возможно здесь нужен big int
  let valuesCount = 0;
  // Храним объекты чтобы можно было не создавать отсортированный массив значений из мапы.
  const valuesCountMap = new Map<number, TValueCountObj>();

  let valuesCountsListInfo: TValuesCountsListInfo = {
    needSort: false,
    list: [],
  };

  function recalcValuesCounts({ newValue }: { newValue: number }) {
    const valueCount = valuesCountMap.get(newValue);
    const valueIsNotExistBefore = typeof valueCount === 'undefined';
    if (valueIsNotExistBefore) {
      const newValueCount = { count: 1 };
      valuesCountMap.set(newValue, newValueCount);

      // Быстрее пересортировать этот массив, чем получать массив из valuesCountMap и сортировать его
      valuesCountsListInfo.list.push([newValue, newValueCount]);
      valuesCountsListInfo.needSort = true;
    } else {
      valueCount.count++;
    }

    return { valueCount, valueIsNotExistBefore };
  }

  function sortValuesCountsListInfo(valuesCountsListInfo: TValuesCountsListInfo): TSortValuesCountsListResult {
    const calculateStartMark = performance.now();

    if (valuesCountsListInfo.needSort) {
      /** Отсутствие пересоздания массива и его сортировки с нуля приводит к ускорению сортировки */
      valuesCountsListInfo.list.sort(([a], [b]) => {
        return a - b;
      });
      valuesCountsListInfo.needSort = false;
    }

    const calculationTime = Math.floor(
      performance.measure('values-count-map-sorting', {
        start: calculateStartMark,
        end: performance.now(),
      }).duration,
    );

    return {
      valuesCountsListInfo,
      calculationTime,
    };
  }

  let valuesAverage = 0;
  function recalcValuesAverage({
    valueDivCount,
    correctionFactor,
  }: {
    valueDivCount: number;
    correctionFactor: number;
  }) {
    valuesAverage = valuesAverage * correctionFactor + valueDivCount;
  }

  let valuesQuadsAverage = 0;
  function recalcValuesQuadAverage({
    newValue,
    valueDivCount,
    correctionFactor,
  }: {
    newValue: number;
    valueDivCount: number;
    correctionFactor: number;
  }) {
    valuesQuadsAverage = valuesQuadsAverage * correctionFactor + valueDivCount * newValue;
  }

  let currentMode = 0;
  let currentModeCount = 0;
  function recalcMode({ newValue, newValueCount }: { newValue: number; newValueCount: number }) {
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
  let oldMedianInfo = {
    hasOldMedian: false,
    oldMedian: 0,
    oldMedianValueCountIndex: 0,
    oldMedianValueCountItemStartFlatIndex: 0,
  };

  function recalcOldMedianInfo({
    newValue,
    valueIsNotExistBefore,
  }: {
    newValue: number;
    valueIsNotExistBefore: boolean;
  }) {
    if (!oldMedianInfo.hasOldMedian || newValue >= oldMedianInfo.oldMedian) {
      return;
    }

    if (valueIsNotExistBefore) {
      oldMedianInfo.oldMedianValueCountIndex++;
    }

    oldMedianInfo.oldMedianValueCountItemStartFlatIndex++;
  }

  /**
   * TODO Если не рассчитывать среднее, среднюю сумму квадратов, моду и т.п. в момент получения сообщения в processMessage,
   * то чтобы не проходить весь массив снова, то можно попробовать создать мапу которая будет собирать тоже самое что и valuesCountMap,
   * только не как она с самого начала, а с момента последнего рассчета средних и т.п. В этом случае можно будет воспользоваться теми же
   * формулами что и в recalcValuesAverage, и других (для моды тоже, да и для смещения медианы (об этом ниже)), но только не на всем списке,
   * а только на том который пришел с последнего рассчета средних. Возможно это повысит скорость обработки сообщений, хотя и потребление памяти
   * может вырости вдвое, в зависимости от того как часто будет запрашиваться актуальная статистика.
   *
   * TODO Есть предположение, что на больших количествах уникальных значений сортировку можно ускорить за счет использования односвязного(или двусвязного) списка
   * для аналогичных целей что и массив sortedValuesCounts. Идея в том, что новые (именно новые уникальные, а не просто увеличение количества существующих)
   * значения помещать в буфер, который в последствии будет отсортирован и путем прохода по списку значения займут свои места и список останется отсортированным.
   * Это предположение, т.к. не ясно будет ли такая вставка в список эффективнее пересортировки, видимо всё зависит от того сколько необработанных значений будет.
   */

  function processMessage(newValue: number) {
    const newValuesCount = valuesCount + 1;
    const correctionFactor = valuesCount / newValuesCount;
    const valueDivCount = newValue / newValuesCount;
    valuesCount = newValuesCount;

    const { valueCount, valueIsNotExistBefore } = recalcValuesCounts({ newValue });

    recalcOldMedianInfo({ newValue, valueIsNotExistBefore });

    recalcValuesAverage({ valueDivCount, correctionFactor });
    recalcValuesQuadAverage({ newValue, valueDivCount, correctionFactor });
    recalcMode({ newValue, newValueCount: valueCount?.count ?? 0 });
  }

  /**
   * Идея в том, что зная куда сместилась старая медиана, можно начинать поиск актуальной с элемента старой медианы в массиве sortedValuesCounts.
   * Т.к. список значений только растет, старая медиана из массива не пропадет. Зная направление смещения, и индекс актуальной медианы, можно
   * начинать поиск не с начала массива, а со старой медианы, что должно приводить к сокращению итераций.
   */
  function getMedian({
    sortedValuesCounts,
    valuesCount,
    oldMedianValueCountIndex,
    oldMedianValueCountItemStartFlatIndex,
  }: {
    sortedValuesCounts: TValuesCountsList;
    valuesCount: number;
    oldMedianValueCountIndex: number;
    /**
     * Если представить, что [value, {count}] соответствует массиву [value, value, ..., value] длины count,
     * то это индекс первого элемента value в отсортированном полном (виртуальном) массиве значений
     */
    oldMedianValueCountItemStartFlatIndex: number;
  }): TMedianFindResult {
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

  function getActualMedian(sortedValuesCounts: TValuesCountsList, valuesCount: number) {
    const calculateStartMark = performance.now();

    const medianFoundResult = getMedian({
      sortedValuesCounts,
      valuesCount,
      oldMedianValueCountIndex: oldMedianInfo.oldMedianValueCountIndex,
      oldMedianValueCountItemStartFlatIndex: oldMedianInfo.oldMedianValueCountItemStartFlatIndex,
    });

    oldMedianInfo = {
      hasOldMedian: true,
      oldMedian: medianFoundResult.median,
      oldMedianValueCountIndex: medianFoundResult.medianValueCountIndex,
      oldMedianValueCountItemStartFlatIndex: medianFoundResult.medianValueCountItemStartFlatIndex,
    };

    const calculationTime = Math.floor(
      performance.measure('median-finding', {
        start: calculateStartMark,
        end: performance.now(),
      }).duration,
    );
    return {
      median: medianFoundResult.median,
      calculationTime,
    };
  }

  function getActualStandartDeviation({
    valuesQuadsAverage,
    valuesAverage,
  }: {
    valuesQuadsAverage: number;
    valuesAverage: number;
  }) {
    return Math.sqrt(valuesQuadsAverage - Math.pow(valuesAverage, 2));
  }

  function getActualStatistics(): TQuotesStatisticWithCalculationTimeInfo {
    const valuesCountsSortResult = sortValuesCountsListInfo(valuesCountsListInfo);

    const medianFindResult = getActualMedian(valuesCountsSortResult.valuesCountsListInfo.list, valuesCount);
    const statistics: TQuotesStatistic = {
      average: valuesAverage,
      median: medianFindResult.median,
      mode: currentMode,
      standardDeviation: getActualStandartDeviation({ valuesQuadsAverage, valuesAverage }),
      valuesCount,
    };

    const uniqueValuesCount = valuesCountsSortResult.valuesCountsListInfo.list.length;
    setTimeout(() => {
      console.log('SORTING_TIME:', valuesCountsSortResult.calculationTime);
      console.log('MEDIAN_FIND_TIME:', medianFindResult.calculationTime);
      console.log('UNIQUE_VALUES_COUNT', uniqueValuesCount);
    });

    return {
      statistics,
      calculationTime: {
        sortingTime: valuesCountsSortResult.calculationTime,
        medianFindTime: medianFindResult.calculationTime,
      },
    };
  }

  return {
    processMessage,
    getActualStatistics,
  };
}
