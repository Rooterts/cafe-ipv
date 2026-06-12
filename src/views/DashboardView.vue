<script setup lang="ts">
  import { ref, computed, onMounted, watchEffect } from 'vue';
  import { useDayStore } from '@/stores/day';
  import { useProductStore } from '@/stores/product';
  import { useOrderStore } from '@/stores/order';
  import { useTableStore } from '@/stores/table';
  import { useCardStore } from '@/stores/card';
  import { useSoundEffect } from '@/composable/useSoundEffect';
  import CurrentOrder from '@/components/CurrentOrder.vue';
  import OrderList from '@/components/OrderList.vue';
  import QRSelectorSheet from '@/components/QRSelectorSheet.vue';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
  import {
    Eye,
    Plus,
    Minus,
    CreditCard,
    List,
    Filter,
    X,
    Trash2,
  } from 'lucide-vue-next';
  import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
  } from '@/components/ui/sheet';
  import type { ICartItem, IOrderId, IProductId } from '@/types';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
  import CardManager from '@/components/CardManager.vue';
  import type { ICard } from '@/types';
  import QRDialog from '@/components/QRDialog.vue';
  import { useBreakpoints } from '@/composable/useBreakpoints';

  const dayStore = useDayStore();
  const productStore = useProductStore();
  const orderStore = useOrderStore();
  const tableStore = useTableStore();
  const cardStore = useCardStore();
  const { playAdd, playIncrement, playCashRegister, playDecrement, playTrash } =
    useSoundEffect();
  const { isMobile } = useBreakpoints();

  onMounted(() => {
    console.log('Init!!');
    dayStore.init();
    cardStore.loadCards();
  });

  // Mobile sheet states
  const showOrdersSheet = ref(false);
  const showProductSheet = ref(false);
  const searchQuery = ref('');
  const showCardManager = ref(false);
  const showQRSelector = ref(false);
  const showQRDialog = ref(false);
  const selectedCardForQR = ref<ICard | null>(null);

  // Check if there are cards
  const hasCards = computed(() => cardStore.cards.length > 0);
  const cardsCount = computed(() => cardStore.cards.length);

  // Function to show QR
  const showQRForCard = (card: ICard) => {
    selectedCardForQR.value = card;
    showQRDialog.value = true;
  };

  const handleQRButtonClick = () => {
    if (cardsCount.value === 1) {
      showQRForCard(cardStore.cards[0]!);
    } else if (cardsCount.value > 1) {
      showQRSelector.value = true;
    }
  };

  const filteredProducts = computed(() => {
    if (!searchQuery.value) return productStore.currentProducts;
    const q = searchQuery.value.toLowerCase();
    return productStore.currentProducts.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
  });

  // Current order
  const currentOrderItems = ref<ICartItem[]>([]);
  const editingOrderId = ref<string | null>(null);

  const addToCurrentOrder = (productId: IProductId) => {
    const existing = currentOrderItems.value.find(
      (item) => item.productId === productId
    );
    if (existing) {
      existing.quantity++;
      playAdd();
    } else {
      const product = productStore.currentProducts.find(
        (p) => p.id === productId
      )!;
      currentOrderItems.value.push({
        productId,
        quantity: 1,
        name: product.name,
        price: product.price,
        unitType: product.unitType || 'units',
      });
      playAdd();
    }
  };

  const removeFromCurrentOrder = (productId: string) => {
    const index = currentOrderItems.value.findIndex(
      (item) => item.productId === productId
    );
    if (index !== -1) {
      const item = currentOrderItems.value[index]!;
      if (item.quantity > 1) {
        item.quantity--;
        playDecrement();
      } else {
        currentOrderItems.value.splice(index, 1);
        playTrash();
      }
    }
  };

  const removeItemCompletely = (productId: string) => {
    currentOrderItems.value = currentOrderItems.value.filter(
      (i) => i.productId !== productId
    );
    playTrash();
  };

  const updateQuantityInCurrentOrder = (
    productId: string,
    quantity: number
  ) => {
    const item = currentOrderItems.value.find((i) => i.productId === productId);
    if (item) {
      item.quantity = quantity;
      playAdd();
    }
  };

  const clearCurrentOrder = () => {
    playDecrement();
    currentOrderItems.value = [];
    editingOrderId.value = null;
  };

  const editOrder = async (orderId: IOrderId) => {
    const order = await orderStore.getOrderById(dayStore.currentDayId, orderId);
    if (!order) return;
    const productsMap = await productStore.getProductMap(dayStore.currentDayId);
    currentOrderItems.value = order.items.map(({ productId, quantity }) => {
      const { name, price, unitType } = productsMap.get(productId)!;
      return {
        productId,
        quantity,
        name,
        price,
        unitType: unitType || 'units',
      };
    });
    editingOrderId.value = orderId;
    showOrdersSheet.value = false;
  };

  const saveOrder = async () => {
    const items = currentOrderItems.value.filter((item) => item.quantity > 0);
    if (items.length === 0) return;

    if (editingOrderId.value) {
      await orderStore.updateOrder(
        dayStore.currentDayId,
        editingOrderId.value,
        items
      );
      playIncrement();
    } else {
      await orderStore.createOrder(dayStore.currentDayId, items);
      playCashRegister();
    }

    await tableStore.syncWithOrders(dayStore.currentDayId);
    currentOrderItems.value = [];
    editingOrderId.value = null;
    showProductSheet.value = false;
  };

  const deleteOrder = async (orderId: IOrderId) => {
    if (!dayStore.currentDayId) return;
    if (!confirm('¿Eliminar este pedido?')) return;
    await orderStore.deleteOrder(dayStore.currentDayId, orderId);
    playTrash();
    if (editingOrderId.value === orderId) {
      clearCurrentOrder();
    }
    await tableStore.syncWithOrders(dayStore.currentDayId);
  };

  // ---------- Order Filter ----------
  interface FilterCondition {
    productId: IProductId;
    operator: '>' | '<' | '>=' | '<=' | '==';
    quantity: number;
  }

  const filterConditions = ref<FilterCondition[]>([]);

  const addFilterCondition = () => {
    const products = productStore.currentProducts;
    if (products.length === 0) return;
    const randomIndex = Math.floor(Math.random() * products.length);
    const randomProduct = products[randomIndex]!;
    filterConditions.value.push({
      productId: randomProduct.id,
      operator: '>=',
      quantity: 1,
    });
  };

  const removeFilterCondition = (index: number) => {
    filterConditions.value.splice(index, 1);
  };

  const clearFilters = () => {
    filterConditions.value = [];
  };

  const filteredOrders = computed(() => {
    const orders = orderStore.currentOrders;
    if (filterConditions.value.length === 0) return orders;
    return orders.filter((order) => {
      return filterConditions.value.every((condition) => {
        const matchingItem = order.items.find(
          (item) => item.productId === condition.productId
        );
        if (!matchingItem) return false;
        const qty = matchingItem.quantity;
        switch (condition.operator) {
          case '>':
            return qty > condition.quantity;
          case '<':
            return qty < condition.quantity;
          case '>=':
            return qty >= condition.quantity;
          case '<=':
            return qty <= condition.quantity;
          case '==':
            return qty === condition.quantity;
          default:
            return false;
        }
      });
    });
  });

  // Clean up invalid product ids (if a product was deleted)
  watchEffect(() => {
    const validProductIds = new Set(
      productStore.currentProducts.map((p) => p.id)
    );
    filterConditions.value = filterConditions.value.filter((cond) =>
      validProductIds.has(cond.productId)
    );
  });
</script>

<template>
  <div v-if="dayStore.isLoading">Cargando</div>
  <div v-else class="flex h-full flex-col">
    <!-- Desktop Layout -->
    <div v-if="!isMobile" class="flex h-full gap-4">
      <!-- Left column - Products -->
      <div class="flex grow flex-col pr-2">
        <div class="bg-background pt-4 pb-2">
          <Input
            v-model="searchQuery"
            placeholder="Buscar productos..."
            class="w-full"
          />
        </div>
        <div class="h-full grow overflow-y-auto">
          <div
            class="grid grid-cols-2 gap-3 overflow-y-auto pb-4 lg:grid-cols-3 xl:grid-cols-4"
          >
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              class="bg-card rounded-lg border p-3 transition-shadow hover:shadow-md"
            >
              <div class="mb-2">
                <p class="font-medium">{{ product.name }}</p>
                <p class="text-muted-foreground text-sm">
                  {{ product.price }} CUP
                </p>
              </div>
              <Button
                class="w-full gap-1"
                size="sm"
                variant="outline"
                @click="addToCurrentOrder(product.id)"
              >
                <Plus class="size-4" />
                Agregar
              </Button>
            </div>
            <div
              v-if="filteredProducts.length === 0"
              class="text-muted-foreground col-span-2 py-8 text-center"
            >
              No hay productos para este día
            </div>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="flex h-full w-80 shrink-0 flex-col">
        <div class="flex grow flex-col overflow-y-auto *:grow">
          <CurrentOrder
            :items="currentOrderItems"
            :is-editing="!!editingOrderId"
            @increment="addToCurrentOrder"
            @decrement="removeFromCurrentOrder"
            @remove="removeItemCompletely"
            @update-quantity="updateQuantityInCurrentOrder"
            @save="saveOrder"
            @cancel="clearCurrentOrder"
          />
        </div>

        <!-- Order history button -->
        <div class="mt-4 border-t pt-4">
          <Button
            variant="outline"
            class="w-full gap-2"
            @click="showOrdersSheet = true"
          >
            <List class="size-4" />
            Historial de pedidos
            <span v-if="orderStore.currentOrders.length" class="ml-1 text-xs">
              ({{ orderStore.currentOrders.length }})
            </span>
          </Button>
        </div>

        <!-- QR Button for Desktop -->
        <div v-if="hasCards" class="mt-2">
          <Button
            variant="outline"
            class="w-full gap-2"
            @click="handleQRButtonClick"
          >
            <CreditCard class="size-4" />
            Mostrar QR de pago
          </Button>
        </div>
      </div>
    </div>

    <!-- Mobile Layout -->
    <div v-else class="flex h-full flex-col">
      <!-- Current order summary -->
      <div class="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-1"
          @click="showOrdersSheet = true"
        >
          <Eye class="size-4" />
          Historial
        </Button>
        <Button size="sm" class="gap-1" @click="showProductSheet = true">
          <Plus class="size-4" />
          Agregar
        </Button>
      </div>

      <div class="flex grow flex-col overflow-y-auto">
        <CurrentOrder
          :items="currentOrderItems"
          :is-editing="!!editingOrderId"
          @increment="addToCurrentOrder"
          @decrement="removeFromCurrentOrder"
          @remove="removeItemCompletely"
          @update-quantity="updateQuantityInCurrentOrder"
          @save="saveOrder"
          @cancel="clearCurrentOrder"
        />
      </div>

      <div class="mt-4 flex justify-end border-t pt-4">
        <Button
          v-if="hasCards"
          variant="outline"
          class="gap-2"
          @click="handleQRButtonClick"
        >
          <CreditCard class="size-4" />
          Mostrar QR de pago
        </Button>
      </div>
    </div>

    <!-- QR Dialog -->
    <QRDialog
      v-if="selectedCardForQR"
      v-model:open="showQRDialog"
      :card="selectedCardForQR"
    />

    <!-- QR Selector Sheet -->
    <QRSelectorSheet
      v-model:open="showQRSelector"
      :cards="cardStore.cards"
      @select-card="showQRForCard"
    />

    <Dialog v-model:open="showCardManager">
      <DialogContent class="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gestión de tarjetas Transfermóvil</DialogTitle>
          <DialogDescription>
            Administra las tarjetas para generar códigos QR de pago
          </DialogDescription>
        </DialogHeader>
        <CardManager />
      </DialogContent>
    </Dialog>

    <!-- Mobile Product Sheet -->
    <Sheet v-model:open="showProductSheet">
      <SheetContent
        side="bottom"
        class="flex h-[90vh] flex-col rounded-t-xl p-0"
      >
        <SheetHeader class="border-b p-4">
          <SheetTitle>Agregar productos</SheetTitle>
          <SheetDescription>
            Selecciona los productos para tu pedido
          </SheetDescription>
        </SheetHeader>
        <div class="flex grow flex-col overflow-auto">
          <div class="border-b p-4">
            <Input
              v-model="searchQuery"
              placeholder="Buscar productos..."
              class="w-full"
            />
          </div>
          <div class="flex flex-col space-y-2 overflow-y-auto p-4">
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              class="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p class="font-medium">{{ product.name }}</p>
                <p class="text-muted-foreground text-sm">
                  {{ product.price }} CUP
                </p>
              </div>
              <div class="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  class="size-8"
                  @click="removeFromCurrentOrder(product.id)"
                >
                  <Minus class="size-4" />
                </Button>
                <span class="w-8 text-center">
                  {{
                    currentOrderItems.find((i) => i.productId === product.id)
                      ?.quantity || 0
                  }}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  class="size-8"
                  @click="addToCurrentOrder(product.id)"
                >
                  <Plus class="size-4" />
                </Button>
              </div>
            </div>
            <div
              v-if="filteredProducts.length === 0"
              class="text-muted-foreground py-8 text-center"
            >
              No hay productos para este día
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <!-- Orders Sheet with Advanced Filter -->
    <Sheet v-model:open="showOrdersSheet">
      <SheetContent
        :side="isMobile ? 'bottom' : 'right'"
        class="h-[80vh] rounded-t-xl p-0 md:h-full"
      >
        <SheetHeader class="border-b p-4">
          <SheetTitle>Historial de pedidos del día</SheetTitle>
          <SheetDescription>
            {{ orderStore.currentOrders.length }} pedidos registrados
          </SheetDescription>
        </SheetHeader>

        <div class="overflow-y-auto p-4">
          <div class="border-b p-4">
            <div class="mb-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Filter class="size-4" />
                <span class="text-sm font-medium">Filtros avanzados</span>
                <span
                  v-if="filterConditions.length"
                  class="text-muted-foreground text-xs"
                >
                  ({{ filteredOrders.length }} de
                  {{ orderStore.currentOrders.length }} pedidos)
                </span>
              </div>
              <Button
                v-if="filterConditions.length"
                variant="ghost"
                size="sm"
                @click="clearFilters"
                class="h-7 gap-1 text-xs"
              >
                <Trash2 class="size-3" />
                Limpiar
              </Button>
            </div>

            <div class="space-y-3">
              <div
                v-for="(condition, idx) in filterConditions"
                :key="idx"
                class="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end"
              >
                <div class="flex-1">
                  <label class="text-muted-foreground mb-1 block text-xs"
                    >Producto</label
                  >
                  <Select v-model="condition.productId">
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="product in productStore.currentProducts"
                        :key="product.id"
                        :value="product.id"
                      >
                        {{ product.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="w-28">
                  <label class="text-muted-foreground mb-1 block text-xs"
                    >Operador</label
                  >
                  <Select v-model="condition.operator">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=">">&gt;</SelectItem>
                      <SelectItem value="<">&lt;</SelectItem>
                      <SelectItem value=">=">&gt;=</SelectItem>
                      <SelectItem value="<=">&lt;=</SelectItem>
                      <SelectItem value="==">==</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="w-28">
                  <label class="text-muted-foreground mb-1 block text-xs"
                    >Cantidad</label
                  >
                  <Input
                    type="number"
                    v-model.number="condition.quantity"
                    min="0"
                    step="1"
                    class="h-9"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  class="text-destructive mt-1 h-9 w-9 shrink-0"
                  @click="removeFilterCondition(idx)"
                >
                  <X class="size-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                class="w-full gap-1"
                @click="addFilterCondition"
                :disabled="productStore.currentProducts.length === 0"
              >
                <Plus class="size-3" />
                Añadir filtro
              </Button>

              <p
                v-if="productStore.currentProducts.length === 0"
                class="text-muted-foreground text-xs"
              >
                No hay productos disponibles para filtrar.
              </p>
            </div>
          </div>
          <OrderList
            :orders="filteredOrders"
            @edit="editOrder"
            @delete="deleteOrder"
          />
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
