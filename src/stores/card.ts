import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ICard } from '@/types';
import { createId } from '@/lib/id';

const STORAGE_KEY = 'v3:cafeteria-cards';

export const useCardStore = defineStore('cards', () => {
  const cards = ref<ICard[]>([]);

  const loadCards = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cards.value = JSON.parse(stored);
    }
  };

  const saveCards = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards.value));
  };

  const addCard = async (cardData: Omit<ICard, 'id' | 'createdAt'>) => {
    const newCard: ICard = {
      id: createId(),
      ...cardData,
      createdAt: Date.now(),
    };
    cards.value.unshift(newCard);
    saveCards();
    return newCard;
  };

  const updateCard = async (
    id: string,
    updates: Partial<Omit<ICard, 'id' | 'createdAt'>>
  ) => {
    const index = cards.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      cards.value[index] = { ...cards.value[index]!, ...updates };
      saveCards();
    }
  };

  const deleteCard = async (id: string) => {
    cards.value = cards.value.filter((c) => c.id !== id);
    saveCards();
  };

  return {
    cards,
    loadCards,
    addCard,
    updateCard,
    deleteCard,
  };
});
