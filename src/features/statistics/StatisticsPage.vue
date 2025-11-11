<script setup lang="ts">
import UiButton from '@/ui/UiButton.vue';
import { ref } from 'vue';
import { createStatisticsCalculator, type TActualQuotesStatistic } from './services/statistics-calculator';

let currentConnection = ref<ReturnType<typeof createStatisticsCalculator> | null>(null);
function onStart() {
  currentConnection.value?.destroy();
  currentConnection.value = createStatisticsCalculator();
}

function onStop() {
  currentConnection.value?.destroy();
}

const lastStatistic = ref<TActualQuotesStatistic | null>(null);
// TODO нужен блокер от спама
function onShowStatistic() {
  lastStatistic.value = currentConnection.value?.getActualStatistics() ?? null;
}
</script>

<template>
  <div class="wrapper">
    <h1>Статистика:</h1>

    <div v-if="lastStatistic">
      <div>
        <span>Среднее:</span>
        <span>{{ lastStatistic.statistic.average }}</span>
      </div>
      <div>
        <span>Время рассчета:</span>
        <span>{{ lastStatistic.calculationTime }}ms</span>
      </div>
      <div>
        <span>Количество значений:</span>
        <span>{{ lastStatistic.valuesCount }}</span>
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
