import { ref } from 'vue';
import { useSoundStore } from '@/stores/sound';
import addProductSound from '@/assets/add-product.mp3';
import incrementSound from '@/assets/increment.mp3';
import decrementSound from '@/assets/decrement.mp3';
import trashSound from '@/assets/trash.mp3';
import cashRegisterSound from '@/assets/cash-register.mp3';

const addAudio = ref<HTMLAudioElement | null>(null);
const incrementAudio = ref<HTMLAudioElement | null>(null);
const decrementAudio = ref<HTMLAudioElement | null>(null);
const trashAudio = ref<HTMLAudioElement | null>(null);
const cashRegisterAudio = ref<HTMLAudioElement | null>(null);

export function useSoundEffect() {
  const soundStore = useSoundStore();

  const play = (audio: HTMLAudioElement | null) => {
    if (!soundStore.enabled) return;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch((e) => console.warn('Sound play failed:', e));
  };

  const playAdd = () => {
    if (!addAudio.value) addAudio.value = new Audio(addProductSound);
    play(addAudio.value);
  };

  const playIncrement = () => {
    if (!incrementAudio.value) incrementAudio.value = new Audio(incrementSound);
    play(incrementAudio.value);
  };

  const playDecrement = () => {
    if (!decrementAudio.value) decrementAudio.value = new Audio(decrementSound);
    play(decrementAudio.value);
  };

  const playTrash = () => {
    if (!trashAudio.value) trashAudio.value = new Audio(trashSound);
    play(trashAudio.value);
  };

  const playCashRegister = () => {
    if (!cashRegisterAudio.value)
      cashRegisterAudio.value = new Audio(cashRegisterSound);
    play(cashRegisterAudio.value);
  };

  return {
    playAdd,
    playIncrement,
    playDecrement,
    playTrash,
    playCashRegister,
  };
}
