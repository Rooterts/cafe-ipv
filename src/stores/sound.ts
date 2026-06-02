import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'v3:cafeteria-sound-enabled';

export const useSoundStore = defineStore('sound', () => {
  const enabled = ref(true);

  const load = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      enabled.value = saved === 'true';
    } else {
      enabled.value = true; // default enabled
    }
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, String(enabled.value));
  };

  const toggle = () => {
    enabled.value = !enabled.value;
    save();
  };

  const setEnabled = (value: boolean) => {
    enabled.value = value;
    save();
  };

  // Load on store initialization
  load();

  return {
    enabled,
    toggle,
    setEnabled,
  };
});
