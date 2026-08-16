import { defineStore } from 'pinia';
import { useDayStore } from './day';
import type { ICartItem, IDayId, IOrder, IOrderId } from '@/types';
import { computed } from 'vue';
import { createId } from '@/lib/id';

export const useOrderStore = defineStore('orders', () => {
  const dayStore = useDayStore();

  const currentOrders = computed(() => dayStore.currentDay?.orders ?? []);

  const getOrderById = async (dayId: IDayId, orderId: IOrderId) => {
    return (
      (await dayStore.getDay(dayId)).orders.find((o) => o.id === orderId) ||
      null
    );
  };

  const createOrder = async (dayId: IDayId, items: ICartItem[]) => {
    const day = await dayStore.getDay(dayId);

    const newOrder: IOrder = {
      id: createId() as IOrderId,
      items,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    console.log(newOrder);
    day.orders.unshift(newOrder);
    day.updatedAt = Date.now();

    await dayStore.saveDay(day);

    return newOrder;
  };

  const updateOrder = async (
    dayId: IDayId,
    orderId: string,
    items: ICartItem[]
  ) => {
    const day = await dayStore.getDay(dayId);

    const index = day.orders.findIndex((o) => o.id === orderId);
    if (index === -1) return;

    day.orders[index] = {
      ...day.orders[index]!,
      items: items.map((item) => ({ ...item })),
      updatedAt: Date.now(),
    };
    day.updatedAt = Date.now();

    await dayStore.saveDay(day);
  };

  const deleteOrder = async (dayId: IDayId, orderId: IOrderId) => {
    const day = await dayStore.getDay(dayId);

    day.orders = day.orders.filter((o) => o.id !== orderId);
    day.updatedAt = Date.now();

    await dayStore.saveDay(day);
  };

  const calculateOrderTotal = (
    order: IOrder,
    productMap: Map<string, number>
  ) => {
    return order.items.reduce((sum, item) => {
      const price = productMap.get(item.productId) || 0;
      return sum + price * item.quantity;
    }, 0);
  };

  return {
    // getters
    getOrderById,
    currentOrders,

    // mutations
    createOrder,
    updateOrder,
    deleteOrder,

    // utils
    calculateOrderTotal,
  };
});
