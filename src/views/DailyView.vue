<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { useDayStore } from '@/stores/day';
  import { Button } from '@/components/ui/button';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
  import DayTable from '@/components/DayTable.vue';
  import {
    CalendarPlus,
    Settings,
    Pencil,
    Trash2,
    Calculator,
    FileSpreadsheet,
    Download,
    Upload,
    Search,
  } from 'lucide-vue-next';
  import { useTableStore } from '@/stores/table';
  import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from '@/components/ui/dialog';
  import { Input } from '@/components/ui/input';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
  import DownloadDialog from '@/components/DownloadDialog.vue';
  import type { IDayId } from '@/types';
  import * as xlsx from 'xlsx';

  const dayStore = useDayStore();
  const tableStore = useTableStore();

  const dailyTotal = computed(() => {
    if (!dayStore.currentDay) return 0;
    return dayStore.currentDay.products.reduce((sum, product) => {
      return sum + (product.daily.importe || 0);
    }, 0);
  });

  // Product search
  const searchQuery = ref('');
  const filteredProducts = computed(() => {
    if (!dayStore.currentDay) return [];
    if (!searchQuery.value.trim()) return dayStore.currentDay.products;
    const q = searchQuery.value.toLowerCase();
    return dayStore.currentDay.products.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
  });

  // Dialog state for new day
  const showDateDialog = ref(false);
  const selectedDate = ref(new Date().toISOString().split('T')[0]);
  const dateError = ref('');

  // Day selector
  const selectDedDay = ref(dayStore.currentDayId);
  watch(selectDedDay, async (newId) => {
    if (newId) await dayStore.setCurrentDay(newId);
    // Reset search when day changes
    searchQuery.value = '';
  });

  const daysOptions = computed(() => {
    return dayStore.daysList.map((dayId) => ({
      value: dayId,
      label: dayId.replace(/^day\-/, ''),
    }));
  });

  const existingDates = computed(() => {
    return new Set(
      dayStore.daysList.map((dayId) => dayId.replace(/^day\-/, ''))
    );
  });

  // New day dialog
  const openDateDialog = () => {
    selectedDate.value = new Date().toISOString().split('T')[0];
    dateError.value = '';
    showDateDialog.value = true;
  };

  const validateDate = (date: string) => {
    if (existingDates.value.has(date)) {
      dateError.value = 'Ya existe un día con esta fecha';
      return false;
    }
    dateError.value = '';
    return true;
  };

  const handleDateChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    selectedDate.value = input.value;
    validateDate(input.value);
  };

  const createNewDay = async () => {
    if (!validateDate(selectedDate.value!)) return;

    const date = new Date(selectedDate.value!);
    await dayStore.createDay(date, dayStore.currentDayId);
    showDateDialog.value = false;
  };

  // Day management dialog
  const showManagementDialog = ref(false);
  const showEditDateDialog = ref(false);
  const editingDayId = ref<IDayId | null>(null);
  const editDateValue = ref('');
  const editDateError = ref('');

  const openEditDateDialog = (dayId: IDayId) => {
    editingDayId.value = dayId;
    editDateValue.value = dayId.replace('day-', '');
    editDateError.value = '';
    showEditDateDialog.value = true;
  };

  const handleEditDateChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    editDateValue.value = input.value;
    validateEditDate();
  };

  const validateEditDate = () => {
    if (!editingDayId.value) return false;
    const newDate = editDateValue.value;
    if (!newDate) {
      editDateError.value = 'Selecciona una fecha';
      return false;
    }

    const existing = dayStore.daysList.find(
      (id) => id === `day-${newDate}` && id !== editingDayId.value
    );
    if (existing) {
      editDateError.value = 'Ya existe un día con esta fecha';
      return false;
    }
    editDateError.value = '';
    return true;
  };

  const saveEditDate = async () => {
    if (!validateEditDate() || !editingDayId.value) return;
    try {
      await dayStore.updateDayDate(editingDayId.value, editDateValue.value);
      showEditDateDialog.value = false;
    } catch (error) {
      editDateError.value = (error as Error).message;
    }
  };

  const confirmDeleteDay = async (dayId: IDayId) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar el día ${dayId.replace('day-', '')}? Esta acción no se puede deshacer.`
      )
    )
      return;
    await dayStore.deleteDay(dayId);
  };

  const pendingBlob = ref<Blob | null>(null);
  const pendingFileName = ref('');

  // Export to Excel $$$$
  const exportToExcel = () => {
    const book = xlsx.utils.book_new();

    const excelData = dayStore.currentDay.products.map((product) => ({
      Producto: product.name,
      Inicio: product.daily.inicio as number | string,
      Entrada: product.daily.entrada as number | string,
      Salida: product.daily.salida as number | string,
      Total: product.daily.total as number | string,
      'Precio (CUP)': product.price as number | string,
      Vendido: product.daily.vendido as number | string,
      'Importe (CUP)': product.daily.importe,
      Final: product.daily.final as number | string,
    }));

    // total row
    excelData.push({
      Producto: 'TOTAL DEL DÍA',
      Inicio: '',
      Entrada: '',
      Salida: '',
      Total: '',
      'Precio (CUP)': '',
      Vendido: '',
      'Importe (CUP)': dailyTotal.value,
      Final: '',
    });

    const sheet = xlsx.utils.json_to_sheet(excelData);
    sheet['!cols'] = [
      { wch: 30 }, // Producto
      { wch: 10 }, // Inicio
      { wch: 10 }, // Entrada
      { wch: 10 }, // Salida
      { wch: 10 }, // Total
      { wch: 12 }, // Precio
      { wch: 10 }, // Vendido
      { wch: 15 }, // Importe
      { wch: 10 }, // Final
    ];
    xlsx.utils.book_append_sheet(book, sheet, 'Tabla Diaria');

    // Save file
    const wbout = xlsx.write(book, { bookType: 'xlsx', type: 'array' });
    pendingFileName.value = `cafeteria-${dayStore.currentDay.date}.xlsx`;
    pendingBlob.value = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  // Export day as JSON
  const exportDay = async () => {
    if (!dayStore.currentDay) return;
    const json = (await dayStore.exportDayData(dayStore.currentDay.id))!;
    pendingFileName.value = `cafeteria-day-${dayStore.currentDay.date}.json`;
    pendingBlob.value = new Blob([json], { type: 'application/json' });
  };

  // Import day
  const fileInputRef = ref<HTMLInputElement | null>(null);
  const importDialogOpen = ref(false);
  const importedDay = ref<string | null>(null);
  const importError = ref('');

  const triggerFileInput = () => {
    fileInputRef.value?.click();
  };

  const handleFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      importedDay.value = e.target?.result as string;
      importDialogOpen.value = true;
      importError.value = '';
    };
    reader.onerror = () => {
      importError.value = 'Error al leer el archivo';
      setTimeout(() => (importError.value = ''), 3000);
    };
    reader.readAsText(file!);
    input.value = '';
  };

  const confirmImport = async () => {
    if (!importedDay.value || !dayStore.currentDay) return;
    try {
      await dayStore.importDayData(importedDay.value, dayStore.currentDayId);

      // Re-sync totals based on orders
      await tableStore.syncWithOrders(dayStore.currentDayId);
      importDialogOpen.value = false;
      importedDay.value = null;
    } catch (err) {
      importError.value =
        err instanceof Error ? err.message : 'Error al importar';
      setTimeout(() => (importError.value = ''), 3000);
    }
  };
</script>

<template>
  <div class="flex flex-col space-y-4">
    <div
      class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
    >
      <h2 class="text-primary hidden text-2xl font-bold md:inline">
        Tabla Diaria IPV
      </h2>
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Select v-model="selectDedDay">
          <SelectTrigger class="w-full sm:w-45">
            <SelectValue placeholder="Seleccionar día" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="day in daysOptions"
              :key="day.value"
              :value="day.value"
            >
              {{ day.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button @click="openDateDialog" class="gap-2">
          <CalendarPlus class="size-4" />
          <span class="hidden sm:inline">Nuevo día</span>
          <span class="sm:hidden">Nuevo</span>
        </Button>
        <Button
          @click="showManagementDialog = true"
          variant="outline"
          class="gap-2"
        >
          <Settings class="size-4" />
          <span class="inline">Gestionar días</span>
        </Button>
      </div>
    </div>

    <Card class="border-primary/20 bg-primary/5 self-end shadow-sm">
      <CardContent class="">
        <div class="flex items-center justify-between">
          <div class="mr-3 flex items-center gap-2">
            <Calculator class="text-primary size-4" />
            <span class="text-xs font-medium sm:text-sm">Total del día: </span>
          </div>
          <span class="text-primary text-lg font-bold sm:text-xl"
            >{{ dailyTotal }} CUP</span
          >
        </div>
      </CardContent>
    </Card>

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

    <!-- Create day dialog -->
    <Dialog v-model:open="showDateDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar fecha</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <Input
            :value="selectedDate"
            type="date"
            class="w-full"
            @input="handleDateChange"
          />
          <p v-if="dateError" class="text-destructive text-sm">
            {{ dateError }}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDateDialog = false">
            Cancelar
          </Button>
          <Button @click="createNewDay" :disabled="!!dateError">
            Crear día
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Day management dialog -->
    <Dialog v-model:open="showManagementDialog">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar días</DialogTitle>
          <DialogDescription>
            Aquí puedes editar o eliminar días existentes. Ten cuidado, los
            cambios son permanentes.
          </DialogDescription>
        </DialogHeader>
        <div class="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead class="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="dayId in dayStore.daysList" :key="dayId">
                <TableCell>{{ dayId.replace('day-', '') }}</TableCell>
                <TableCell>
                  <div class="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      @click="openEditDateDialog(dayId)"
                    >
                      <Pencil class="size-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      @click="confirmDeleteDay(dayId)"
                    >
                      <Trash2 class="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showManagementDialog = false">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit date dialog -->
    <Dialog v-model:open="showEditDateDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar fecha del día</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <Input
            :value="editDateValue"
            type="date"
            class="w-full"
            @input="handleEditDateChange"
          />
          <p v-if="editDateError" class="text-destructive text-sm">
            {{ editDateError }}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showEditDateDialog = false">
            Cancelar
          </Button>
          <Button @click="saveEditDate" :disabled="!!editDateError">
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Day table -->
    <div v-if="dayStore.currentDay && filteredProducts.length">
      <DayTable
        :day="{ ...dayStore.currentDay, products: filteredProducts }"
        @update="tableStore.updateField"
      />
      <div
        v-if="
          searchQuery &&
          filteredProducts.length !== dayStore.currentDay.products.length
        "
        class="text-muted-foreground mt-2 text-sm"
      >
        Mostrando {{ filteredProducts.length }} de
        {{ dayStore.currentDay.products.length }} productos
      </div>
    </div>
    <div
      v-else-if="
        dayStore.currentDay && filteredProducts.length === 0 && searchQuery
      "
      class="text-muted-foreground bg-card rounded-lg border py-12 text-center shadow-sm"
    >
      No hay productos que coincidan con "{{ searchQuery }}"
    </div>
    <div
      v-else-if="dayStore.currentDay && filteredProducts.length === 0"
      class="text-muted-foreground bg-card rounded-lg border py-12 text-center shadow-sm"
    >
      No hay productos para este día. Crea productos en la pestaña "Productos".
    </div>

    <!-- Export/Import buttons -->
    <div class="mt-4 flex justify-end gap-2">
      <Button @click="exportDay" size="sm" variant="outline" class="gap-2">
        <Download class="size-4" />
        Exportar día
      </Button>
      <Button
        @click="triggerFileInput"
        size="sm"
        variant="outline"
        class="gap-2"
      >
        <Upload class="size-4" />
        Importar día
      </Button>
      <Button
        @click="exportToExcel"
        size="sm"
        class="gap-2 bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
      >
        <FileSpreadsheet class="size-4" />
        Exportar a Excel
      </Button>
    </div>

    <!-- Hidden file input for import -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".json,application/json"
      class="hidden"
      @change="handleFileChange"
    />

    <!-- Import confirmation dialog -->
    <Dialog v-model:open="importDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar día</DialogTitle>
          <DialogDescription>
            Se reemplazará el día actual ({{ dayStore.currentDay?.date }}) con
            los datos del archivo. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <p v-if="importError" class="text-destructive text-sm">
          {{ importError }}
        </p>
        <DialogFooter>
          <Button variant="outline" @click="importDialogOpen = false">
            Cancelar
          </Button>
          <Button @click="confirmImport"> Reemplazar día actual </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <DownloadDialog v-model="pendingBlob" :file-name="pendingFileName" />
  </div>
</template>
