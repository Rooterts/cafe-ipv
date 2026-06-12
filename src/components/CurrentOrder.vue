<script setup lang="ts">
  import { computed } from 'vue';
  import type { ICartItem, IProductId } from '@/types';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Minus, Edit, Plus, Trash2, ShoppingCartIcon } from 'lucide-vue-next';
  import { cn } from '@/lib/utils';

  const props = defineProps<{
    items: ICartItem[];
    isEditing: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'increment', productId: IProductId): void;
    (e: 'decrement', productId: IProductId): void;
    (e: 'remove', productId: IProductId): void;
    (e: 'updateQuantity', productId: IProductId, quantity: number): void;
    (e: 'save'): void;
    (e: 'cancel'): void;
  }>();

  const total = computed(() => {
    let sum = 0;
    props.items.forEach((item) => {
      const price = item.price;
      sum += price * item.quantity;
    });
    return sum;
  });

  const handleQuantityInput = (productId: IProductId, event: Event) => {
    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);
    if (isNaN(value)) value = 0;
    if (value < 0) value = 0;
    emit('updateQuantity', productId, value);
  };
</script>

<template>
  <div class="flex flex-col space-y-4 overflow-y-auto">
    <h3
      :class="
        cn(
          'flex items-center font-medium',
          isEditing ? 'text-amber-600' : 'text-primary'
        )
      "
    >
      <Edit v-if="isEditing" />
      <ShoppingCartIcon v-else />
      <span class="ml-3">{{
        isEditing ? 'Editando pedido' : 'Nuevo pedido'
      }}</span>
    </h3>

    <div
      v-if="items.length === 0"
      class="text-muted-foreground grow py-4 text-center text-sm"
    >
      Carrito vacío
    </div>

    <div v-else class="flex grow flex-col space-y-2 overflow-y-auto">
      <div
        v-for="item in items"
        :key="item.productId"
        class="flex items-center justify-between border-b pb-2"
      >
        <span class="flex-1">{{ item.name }}</span>

        <!-- Units: increment/decrement buttons -->
        <div v-if="item.unitType === 'units'" class="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            class="size-6"
            @click="emit('decrement', item.productId)"
          >
            <Minus class="size-3" />
          </Button>
          <span class="w-8 text-center text-sm">{{ item.quantity }}</span>
          <Button
            variant="outline"
            size="icon"
            class="size-6"
            @click="emit('increment', item.productId)"
          >
            <Plus class="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="text-destructive size-6"
            @click="emit('remove', item.productId)"
          >
            <Trash2 class="size-3" />
          </Button>
        </div>

        <!-- Weighing: manual input + delete -->
        <div v-else class="flex items-center gap-2">
          <Input
            type="number"
            step="any"
            :value="item.quantity"
            @input="handleQuantityInput(item.productId, $event)"
            class="h-8 w-24 text-center"
          />
          <Button
            variant="ghost"
            size="icon"
            class="text-destructive size-6"
            @click="emit('remove', item.productId)"
          >
            <Trash2 class="size-3" />
          </Button>
        </div>
      </div>
    </div>

    <div class="flex items-end justify-between border-t pt-2 font-bold">
      <span>Total</span>
      <span class="text-2xl">{{ total.toFixed(2) }} CUP</span>
    </div>
    <div class="flex gap-2">
      <Button
        class="flex-1"
        @click="emit('save')"
        :disabled="items.length === 0"
      >
        {{ isEditing ? 'Actualizar' : 'Guardar pedido' }}
      </Button>
      <Button variant="outline" @click="emit('cancel')">Cancelar</Button>
    </div>
  </div>
</template>
