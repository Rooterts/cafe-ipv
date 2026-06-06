<script setup lang="ts">
  import type { ICartItem } from '@/types';
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
  import { ScrollArea } from '@/components/ui/scroll-area';
  import { ShoppingCart } from 'lucide-vue-next';

  defineProps<{
    items: ICartItem[];
    total: number;
  }>();
</script>

<template>
  <Card class="border-primary/20 sticky top-20 shadow-md">
    <CardHeader class="pb-3">
      <CardTitle class="flex items-center gap-2 text-base">
        <ShoppingCart class="text-primary size-4" />
        Carrito
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ScrollArea class="h-[calc(100vh-280px)] pr-3 md:h-96">
        <div
          v-if="items.length === 0"
          class="text-muted-foreground py-8 text-center text-sm"
        >
          Carrito vacío
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="item in items"
            :key="item.productId"
            class="flex justify-between border-b pb-2 text-sm last:border-0"
          >
            <span class="flex-1"
              >{{ item.name }}
              <span class="text-muted-foreground"
                >x{{ item.quantity }}</span
              ></span
            >
            <span class="font-mono font-medium"
              >{{ item.price * item.quantity }} CUP</span
            >
          </div>
        </div>
      </ScrollArea>
      <div class="mt-4 flex justify-between border-t pt-4 font-bold">
        <span>Total</span>
        <span class="text-primary">{{ total }} CUP</span>
      </div>
    </CardContent>
  </Card>
</template>
