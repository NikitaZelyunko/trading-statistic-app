<script setup lang="ts">
import UiButton from '@/ui/UiButton.vue';
import { ref } from 'vue';
import { useStatisticsCalculatorService, type TActualQuotesStatistic } from './services/statistics-calculator-service';

const statisticsCalculatorService = useStatisticsCalculatorService();
function onStart() {
  statisticsCalculatorService.start();
}

function onStop() {
  statisticsCalculatorService.stop();
}

const lastStatistic = ref<TActualQuotesStatistic | null>(null);
// TODO нужен блокер от спама
async function onShowStatistic() {
  lastStatistic.value = (await statisticsCalculatorService.getActualStatistics()) ?? null;
}
</script>

<template>
  <div class="wrapper">
    <h1>Статистика:</h1>

    <div v-if="lastStatistic">
      <div>
        <span>Среднее:</span>
        <span>{{ lastStatistic.statistics.average }}</span>
      </div>
      <div>
        <span>Мода:</span>
        <span>{{ lastStatistic.statistics.mode }}</span>
      </div>
      <div>
        <span>Медиана:</span>
        <span>{{ lastStatistic.statistics.median }}</span>
      </div>
      <div>
        <span>Стандартное отклонение:</span>
        <span>{{ lastStatistic.statistics.standardDeviation }}</span>
      </div>
      <div>
        <span>Время рассчета:</span>
        <span>{{ lastStatistic.calculationTimeInfo.statisticsCalculationTime }}ms</span>
      </div>
      <div>
        <span>Полное время ожидания ответа:</span>
        <span>{{ lastStatistic.calculationTimeInfo.fullWaitingTime }}ms</span>
      </div>
      <div>
        <span>Количество значений:</span>
        <span>{{ lastStatistic.statistics.valuesCount }}</span>
      </div>
    </div>

    <div class="buttons-wrapper">
      <UiButton @click="onStart">Старт</UiButton>
      <UiButton @click="onStop">Стоп</UiButton>
      <!-- Нужно заблокировать кнопку пока нет активного подключения -->
      <UiButton @click="onShowStatistic">Статистика</UiButton>
    </div>
  </div>
</template>

<style lang="css" scoped>
.buttons-wrapper {
  display: flex;
  justify-content: flex-end;

  & > * {
    margin-right: 0.5em;
  }
}
</style>
