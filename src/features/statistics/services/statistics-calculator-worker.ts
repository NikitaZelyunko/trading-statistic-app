import { postMessageFromWorker, type TMessageFromWorker } from '@/utils/web-worker/postMessageFromWorker';
import { createStatisticsCalculator, type TQuotesStatistic } from './statistics-calculator';
import { createInWorkerQuotesFlow } from '../api/create-quotes-flow';
import type { TQuouteData } from '../types/quote-data';

type TGetStatisticsEventName = 'get-statistics';
export type TStatisticsCalculatorWorkerEventData =
  | 'start-messages-processing'
  | 'stop-messages-processing'
  | TGetStatisticsEventName;

export type TGetStatisticsMessageFromWorker = TMessageFromWorker<TGetStatisticsEventName, TQuotesStatistic>;

const statisticsCalculator = createStatisticsCalculator();
const quotesFlowService = createInWorkerQuotesFlow();

onmessage = (event: MessageEvent<TStatisticsCalculatorWorkerEventData>) => {
  function processMessage(message: TQuouteData) {
    statisticsCalculator.processMessage(message.value);
  }

  if (event.data === 'start-messages-processing') {
    console.log('WORKER', 'start-message-processing');
    quotesFlowService.addMessageListener(processMessage);
    quotesFlowService.startMessagesFlow();
  } else if (event.data === 'get-statistics') {
    console.log('WORKER', 'get-statistics');
    const calculateStartMark = performance.now();
    const statistics = statisticsCalculator.getActualStatistics();
    const calculationTime = Math.floor(
      performance.measure('statistic-calculation', {
        start: calculateStartMark,
        end: performance.now(),
      }).duration,
    );
    console.log('CALCULATION_TIME', calculationTime);
    postMessageFromWorker(event.data, statistics);
  } else if (event.data === 'stop-messages-processing') {
    console.log('WORKER', 'stop-message-processing');
    quotesFlowService.removeMessageListener(processMessage);
    quotesFlowService.stopMessagesFlow();
  }
};
