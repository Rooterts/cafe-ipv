import { defineStore } from 'pinia';
import { useDayStore } from './day';
import type { IDayId, IProduct, IProductId } from '@/types';
import { computed } from 'vue';

export const useProductStore = defineStore('products', () => {
  const dayStore = useDayStore();

  const getProductMap = async (dayId?: IDayId) => {
    const day = await dayStore.getDay(dayId);
    return new Map(day.products.map((p) => [p.id, p]));
  };

  const currentProducts = computed(() => dayStore.currentDay?.products ?? []);

  const addProduct = async (
    dayId: IDayId,
    name: string,
    price: number,
    unitType: 'units' | 'weighing' = 'units',
    index = 0
  ) => {
    const day = await dayStore.getDay(dayId);

    const newProduct: IProduct = {
      id: crypto.randomUUID() as IProductId,
      name: name,
      price: price,
      unitType: unitType,
      daily: {
        inicio: 0,
        entrada: 0,
        salida: 0,
        total: 0,
        vendido: 0,
        importe: 0,
        final: 0,
      },
    };

    day.products.splice(index, 0, newProduct);
    day.updatedAt = Date.now();
    await dayStore.saveDay(day);
  };

  const updateProduct = async (
    dayId: IDayId,
    productId: string,
    updates: Partial<
      Pick<IProduct, 'name' | 'price' | 'unitType'> & { index: number }
    >
  ) => {
    const day = await dayStore.getDay(dayId);

    const productIndex = day.products.findIndex((p) => p.id === productId);
    const product = day.products[productIndex];
    if (!product) return;

    if (updates.name) {
      product.name = updates.name;
    }
    if (updates.unitType) {
      product.unitType = updates.unitType;
    }
    if (updates.price && updates.price !== product.price) {
      const hasOrders = day.orders.some((order) =>
        order.items.some((item) => item.productId === productId)
      );

      if (hasOrders)
        throw new Error(
          'No es posible actualizar el precio de este producto. Ya hay pedidos asociados a él. Por favor, cree un nuevo producto con un nombre similar'
        );
      product.price = updates.price;
      product.daily.importe = product.daily.vendido * product.price;
    }
    if (updates.index !== undefined) {
      day.products.splice(updates.index, 0, product);
      day.products.splice(
        // handle overflow
        updates.index < productIndex ? productIndex + 1 : productIndex,
        1
      );
    }

    day.updatedAt = Date.now();
    await dayStore.saveDay(day);
  };

  const deleteProduct = async (dayId: IDayId, productId: string) => {
    const day = await dayStore.getDay(dayId);

    const hasOrders = day.orders.some((order) =>
      order.items.some((item) => item.productId === productId)
    );

    if (hasOrders) {
      throw new Error(
        'Este producto ya se ha vendido a varios clientes, no se puede eliminar'
      );
    }

    day.products = day.products.filter((p) => p.id !== productId);
    day.updatedAt = Date.now();
    await dayStore.saveDay(day);
  };

  return {
    // getters
    getProductMap,
    currentProducts,

    // mutations
    addProduct,
    updateProduct,
    deleteProduct,
  };
});
