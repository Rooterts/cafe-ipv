import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IDay, IDayId } from '@/types';
import { DAY_EXPORT_KEY, exportedDaySchema } from '@/types/schemas';
import { toLocalISOString } from '@/lib/utils';

export const STORAGE_PREFIX = 'v3:cafeteria-';
export const DAY_PREFIX = STORAGE_PREFIX + 'day-';
export const DAYS_LIST_KEY = STORAGE_PREFIX + 'days-indexes';
export const CURRENT_DAY_KEY = STORAGE_PREFIX + 'current-day';

let loaded = false;

export const useDayStore = defineStore('days', () => {
  const daysList = ref<IDayId[]>([]);
  const currentDayId = ref<IDayId>(null as never);
  const currentDay = ref<IDay>(null as never);
  const isLoading = ref(true);

  const setCurrentDay = async (dayId: IDayId) => {
    isLoading.value = true;
    const day = await loadDay(dayId);
    isLoading.value = false;

    if (!day) throw new Error('"IDayId:' + dayId + '" not found');

    currentDay.value = day;
    currentDayId.value = dayId;

    // Persistir el día actual
    localStorage.setItem(CURRENT_DAY_KEY, dayId);
  };

  const saveDaysList = async () => {
    localStorage.setItem(DAYS_LIST_KEY, JSON.stringify(daysList.value));
  };

  const loadDay = async (dayId: IDayId) => {
    const key = DAY_PREFIX + dayId;
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as IDay) : null;
  };

  const exportDayData = async (dayId: IDayId) => {
    const key = DAY_PREFIX + dayId;
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    return JSON.stringify(
      {
        createdAt: Date.now(),
        exportId: DAY_EXPORT_KEY,
        export: JSON.parse(stored),
      },
      null,
      2
    );
  };

  const importDayData = async (
    data: string | Record<string, unknown>,
    dayId?: IDayId
  ) => {
    const { export: parsed } = exportedDaySchema.parse(
      typeof data === 'string' ? JSON.parse(data) : data
    );

    if (dayId) parsed.id = dayId;

    await saveDay(parsed);
  };

  const saveDay = async (day: IDay) => {
    const key = DAY_PREFIX + day.id;
    localStorage.setItem(key, JSON.stringify(day));

    // force update
    if (day.id === currentDayId.value) {
      currentDay.value = { ...day };
    }
    if (!daysList.value.includes(day.id)) {
      daysList.value = [...daysList.value, day.id];
      await sortDaysList();
    }
  };

  const deleteDay = async (dayId: IDayId) => {
    const key = DAY_PREFIX + dayId;
    localStorage.removeItem(key);
    const index = daysList.value.indexOf(dayId);
    if (index !== -1) {
      daysList.value.splice(index, 1);
      await saveDaysList();
    }
    if (currentDayId.value === dayId) {
      if (daysList.value.length > 0) {
        await setCurrentDay(daysList.value[0]!);
      } else {
        const newDay = await createDay(new Date(), null);
        await setCurrentDay(newDay.id);
      }
    }
  };

  const updateDayDate = async (oldId: IDayId, newDate: string) => {
    const newId = `day-${newDate}` as IDayId;
    if (oldId === newId) return;

    if (daysList.value.includes(newId)) {
      throw new Error('Ya existe un día con esa fecha');
    }

    const day = await loadDay(oldId);
    if (!day) throw new Error('Día no encontrado');

    day.id = newId;
    day.date = newDate;

    const newKey = DAY_PREFIX + newId;
    localStorage.setItem(newKey, JSON.stringify(day));

    const oldKey = DAY_PREFIX + oldId;
    localStorage.removeItem(oldKey);

    const index = daysList.value.indexOf(oldId);
    if (index !== -1) {
      daysList.value.splice(index, 1, newId);
      await sortDaysList();
    }

    if (currentDayId.value === oldId) {
      currentDayId.value = newId;
      currentDay.value = day;
      localStorage.setItem(CURRENT_DAY_KEY, newId);
    }
  };

  const sortDaysList = async () => {
    daysList.value.sort((a, b) => {
      const dateA = a.replace('day-', '');
      const dateB = b.replace('day-', '');
      return dateB.localeCompare(dateA);
    });
    await saveDaysList();
  };

  const createDay = async (
    date: Date,
    prevDay: IDay | IDayId | null = null
  ) => {
    let products: IDay['products'] = [];

    if (typeof prevDay === 'string') prevDay = await loadDay(prevDay);
    if (prevDay) {
      products = prevDay.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        daily: {
          inicio: p.daily.final,
          entrada: 0,
          salida: 0,
          total: p.daily.final,
          vendido: 0,
          importe: 0,
          final: p.daily.final,
        },
      }));
    }

    const newDay: IDay = {
      id: ('day-' + toLocalISOString(date).split('T')[0]!) as IDayId,
      date: toLocalISOString(date).split('T')[0]!,
      products,
      orders: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveDay(newDay);

    await sortDaysList();

    return newDay;
  };

  const init = async () => {
    if (loaded) return;

    isLoading.value = true;
    const stored = localStorage.getItem(DAYS_LIST_KEY);
    daysList.value = stored ? JSON.parse(stored) : [];

    if (daysList.value.length === 0) {
      const newDay = await createDay(new Date(), null);
      await setCurrentDay(newDay.id);
      await saveDaysList();
    } else {
      const savedCurrentDayId = localStorage.getItem(
        CURRENT_DAY_KEY
      ) as IDayId | null;

      if (savedCurrentDayId && daysList.value.includes(savedCurrentDayId)) {
        await setCurrentDay(savedCurrentDayId);
      } else {
        await setCurrentDay(daysList.value[0]!);
      }
    }
    isLoading.value = false;
    loaded = true;
  };

  return {
    // state
    daysList,
    currentDayId,
    currentDay,

    init,
    isLoading,
    createDay,
    setCurrentDay,

    updateDayDate,
    deleteDay,

    importDayData,
    exportDayData,

    loadDay,
    saveDay,
    getDay: async (dayId?: IDayId) => {
      if (!dayId) return currentDay.value;

      const day = await loadDay(dayId);
      if (!day) throw new Error(`"IDayId:${dayId} not exists`);
      return day;
    },
  };
});
