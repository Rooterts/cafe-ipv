<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useProductStore } from '@/stores/product';
  import { useSoundEffect } from '@/composable/useSoundEffect';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import {
    Table,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
  import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
  import { Plus, Pencil, Trash2, GripVertical, Search } from 'lucide-vue-next';
  import { useDayStore } from '@/stores/day';
  import draggable from 'vuedraggable';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
  import type { AcceptableValue } from 'reka-ui';

  const productStore = useProductStore();
  const dayStore = useDayStore();
  const { playAdd, playTrash } = useSoundEffect();

  // Search state
  const searchQuery = ref('');
  const filteredProducts = computed(() => {
    if (!searchQuery.value.trim()) return productStore.currentProducts;
    const q = searchQuery.value.toLowerCase();
    return productStore.currentProducts.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
  });

  const showDialog = ref(false);
  const editingProduct = ref<{
    id?: string;
    name: string;
    price: number;
    unitType: 'units' | 'weighing';
    index: number;
  }>({
    name: '',
    price: 0,
    unitType: 'units',
    index: -1,
  });

  const openNew = () => {
    editingProduct.value = { name: '', price: 0, unitType: 'units', index: -1 };
    editingProduct.value.index = dayStore.currentDay.products.length;
    showDialog.value = true;
  };

  const openEdit = (product: {
    id: string;
    name: string;
    price: number;
    unitType?: 'units' | 'weighing';
  }) => {
    const index = productStore.currentProducts.findIndex(
      ({ id }) => id === product.id
    );
    editingProduct.value = {
      ...product,
      unitType: product.unitType || 'units',
      index,
    };
    showDialog.value = true;
  };

  const save = async () => {
    if (editingProduct.value.id) {
      if (!editingProduct.value.name.trim()) throw new Error('Nombre vacío!!');
      await productStore.updateProduct(
        dayStore.currentDayId,
        editingProduct.value.id,
        {
          name: editingProduct.value.name.trim(),
          price: editingProduct.value.price,
          unitType: editingProduct.value.unitType,
          index: editingProduct.value.index,
        }
      );
    } else {
      await productStore.addProduct(
        dayStore.currentDayId,
        editingProduct.value.name,
        editingProduct.value.price,
        editingProduct.value.unitType,
        editingProduct.value.index
      );
      playAdd();
    }
    showDialog.value = false;
  };

  const confirmDelete = async (productId: string) => {
    if (confirm('¿Eliminar producto?')) {
      await productStore.deleteProduct(dayStore.currentDayId, productId);
      playTrash();
    }
  };

  const onDragEnd = async () => {
    // Save the new order to the store
    if (dayStore.currentDay) {
      dayStore.currentDay.updatedAt = Date.now();
      await dayStore.saveDay(dayStore.currentDay);
    }
  };

  const positionOptions = computed(() => {
    const options = [{ value: 'after--1', label: '<< al principio >>' }];
    productStore.currentProducts.forEach((product, index) => {
      if (product.id !== editingProduct.value.id)
        options.push({
          value: 'after-' + index,
          label: `${product.name}${index === productStore.currentProducts.length - 1 ? ' << al final >>' : ''}`,
        });
    });
    return options;
  });

  const handlePositionChange = (value: AcceptableValue) => {
    if (typeof value !== 'string') throw new Error('Unknown select value type');
    if (value.startsWith('after-')) {
      editingProduct.value.index = parseInt(value.replace('after-', '')) + 1;
    }
  };
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
    >
      <h2 class="text-primary hidden text-2xl font-bold md:inline">
        Productos
      </h2>
      <Button @click="openNew" class="gap-2">
        <Plus class="size-4" />
        Nuevo producto
      </Button>
    </div>

    <!-- Search bar -->
    <div class="relative">
      <Search
        class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar producto..."
        class="pl-9"
      />
    </div>

    <div class="overflow-x-auto rounded-lg border shadow-sm select-none">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/50">
            <TableHead class="w-10"></TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Precio (CUP)</TableHead>
            <TableHead class="w-24">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <!-- Draggable list only when no search active -->
        <draggable
          v-if="!searchQuery"
          tag="tbody"
          data-slot="table-body"
          v-model="dayStore.currentDay.products"
          class="divide-y"
          item-key="id"
          ghostClass="opacity-50"
          dragClass="cursor-grabbing"
          handle=".drag-handle"
          group="products"
          :animation="200"
          :disabled="false"
          @end="onDragEnd"
        >
          <template #item="{ element: product }">
            <TableRow class="hover:bg-muted/30 cursor-default">
              <TableCell
                class="drag-handle hover:text-foreground text-muted-foreground w-10 cursor-grab"
              >
                <GripVertical class="size-4" />
              </TableCell>
              <TableCell class="font-medium">
                {{ product.name }}
                {{ product.unitType === 'weighing' ? '(pesaje)' : '' }}
              </TableCell>
              <TableCell class="font-mono">{{ product.price }}</TableCell>
              <TableCell>
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    @click="openEdit(product)"
                  >
                    <Pencil class="size-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    @click="confirmDelete(product.id)"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </draggable>
        <!-- Plain filtered table when search is active -->
        <tbody v-else class="divide-y">
          <TableRow
            v-for="product in filteredProducts"
            :key="product.id"
            class="hover:bg-muted/30 cursor-default"
          >
            <TableCell class="w-10"></TableCell>
            <TableCell class="font-medium">
              {{ product.name }}
              {{ product.unitType === 'weighing' ? '(pesaje)' : '' }}
            </TableCell>
            <TableCell class="font-mono">{{ product.price }}</TableCell>
            <TableCell>
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  @click="openEdit(product)"
                >
                  <Pencil class="size-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  @click="confirmDelete(product.id)"
                >
                  <Trash2 class="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="filteredProducts.length === 0">
            <TableCell
              colspan="4"
              class="text-muted-foreground py-8 text-center"
            >
              No hay productos que coincidan con "{{ searchQuery }}"
            </TableCell>
          </TableRow>
        </tbody>
      </Table>
      <div
        v-if="
          searchQuery &&
          filteredProducts.length !== productStore.currentProducts.length
        "
        class="text-muted-foreground border-t px-4 py-2 text-sm"
      >
        Mostrando {{ filteredProducts.length }} de
        {{ productStore.currentProducts.length }} productos
      </div>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            >{{ editingProduct.id ? 'Editar' : 'Nuevo' }} producto</DialogTitle
          >
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Nombre</label>
            <Input
              v-model="editingProduct.name"
              placeholder="Ej. Café con leche"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Precio (CUP)</label>
            <Input v-model="editingProduct.price" type="number" min="0" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Tipo de unidad</label>
            <Select v-model="editingProduct.unitType">
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="units">
                  Unidades (piezas enteras)
                </SelectItem>
                <SelectItem value="weighing">
                  Pesaje (kg, litros, etc.)
                </SelectItem>
              </SelectContent>
            </Select>
            <p
              v-if="editingProduct.unitType === 'weighing'"
              class="text-muted-foreground text-xs"
            >
              Los productos de pesaje permiten cantidades decimales y se editan
              manualmente en el carrito.
            </p>
          </div>
          <div class="flex items-center">
            <label class="text-sm font-medium">Insertar después de:</label>

            <Select
              :model-value="'after-' + (editingProduct.index - 1)"
              @update:model-value="handlePositionChange"
            >
              <SelectTrigger>
                <SelectValue placeholder="<< Error!! >>" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem
                  v-for="(option, index) in positionOptions"
                  :key="index"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">
            Cancelar
          </Button>
          <Button @click="save"> Guardar </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
  .drag-handle {
    touch-action: none;
  }
</style>
