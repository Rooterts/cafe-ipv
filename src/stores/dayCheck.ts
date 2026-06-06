import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useDayStore } from './day';
import type { IDayId } from '@/types';
import { toLocalISOString } from '@/lib/utils';

export const useDayCheckStore = defineStore('dayCheck', () => {
  const showWarning = ref(false);
  const warningType = ref<'new' | 'resume' | null>(null);
  const dayStore = useDayStore();

  const checkCurrentDay = async () => {
    const today = toLocalISOString().split('T')[0];
    const todayId = `day-${today}` as IDayId;

    // Verificar si existe el día de hoy
    const dayExists = dayStore.daysList.includes(todayId);

    if (!dayExists) {
      warningType.value = 'new';
      showWarning.value = true;
    } else {
      // Verificar si el día seleccionado actualmente es hoy
      const currentDayIsToday = dayStore.currentDayId === todayId;

      if (!currentDayIsToday) {
        warningType.value = 'resume';
        showWarning.value = true;
      }
    }
  };

  const startNewDay = async () => {
    const today = new Date();
    await dayStore.createDay(today, null);
    await dayStore.setCurrentDay(
      `day-${toLocalISOString(today).split('T')[0]}` as IDayId
    );
    showWarning.value = false;
    warningType.value = null;
  };

  const resumeCurrentDay = async () => {
    const today = toLocalISOString().split('T')[0];
    const todayId = `day-${today}` as IDayId;
    await dayStore.setCurrentDay(todayId);
    showWarning.value = false;
    warningType.value = null;
  };

  const cancel = () => {
    showWarning.value = false;
    warningType.value = null;
  };

  return {
    showWarning,
    warningType,
    checkCurrentDay,
    startNewDay,
    resumeCurrentDay,
    cancel,
  };
});
