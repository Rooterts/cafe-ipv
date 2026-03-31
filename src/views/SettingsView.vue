<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
  import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '@/components/ui/tabs';
  import ThemeSelector from '@/components/ThemeSelector.vue';
  import CardManager from '@/components/CardManager.vue';
  import { Download, Upload, AlertTriangle, Trash2 } from 'lucide-vue-next';
  import {
    CURRENT_DAY_KEY,
    DAYS_LIST_KEY,
    DAY_PREFIX,
    STORAGE_PREFIX,
    useDayStore,
  } from '@/stores/day';
  import { useAuthStore } from '@/stores/auth';
  import DownloadDialog from '@/components/DownloadDialog.vue';

  const pendingBlob = ref<Blob | null>(null);
  const pendingFileName = ref('');

  const router = useRouter();
  const dayStore = useDayStore();
  const authStore = useAuthStore();

  // Import
  const showImportDialog = ref(false);
  const importFile = ref<File | null>(null);
  const importError = ref('');
  const confirmText = ref('');
  const isImporting = ref(false);

  // Clear data
  const showClearDialog = ref(false);
  const clearMode = ref<'all' | 'keep-products'>('all');
  const clearConfirmText = ref('');
  const isClearing = ref(false);
  const clearError = ref('');

  const downloadFile = async (blob: Blob, filename: string) => {
    pendingBlob.value = blob;
    pendingFileName.value = filename;
  };

  const handleExport = async () => {
    const keys = Object.keys(localStorage);
    const cafeData: Record<string, string> = {};

    keys.forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        cafeData[key] = localStorage.getItem(key) || '';
      }
    });

    await downloadFile(
      new Blob([JSON.stringify(cafeData, null, 2)], {
        type: 'application/json',
      }),
      `cafeteria-backup-${new Date().toISOString().split('T')[0]}.json`
    );
  };

  const handleFileSelect = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      importFile.value = input.files[0]!;
      importError.value = '';
    }
  };

  const handleImport = async () => {
    if (!importFile.value) {
      importError.value = 'Selecciona un archivo';
      return;
    }

    if (confirmText.value.toLowerCase().trim() !== 'borrar') {
      importError.value = 'Escribe "borrar" para confirmar';
      return;
    }

    try {
      isImporting.value = true;
      const text = await importFile.value.text();
      const importedData = JSON.parse(text);

      const hasCafeData = Object.keys(importedData).some((key) =>
        key.startsWith(STORAGE_PREFIX)
      );

      if (!hasCafeData) {
        throw new Error('El archivo no contiene datos válidos de Cafetería');
      }

      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });

      Object.entries(importedData).forEach(([key, value]) => {
        localStorage.setItem(key, value as string);
      });

      showImportDialog.value = false;
      confirmText.value = '';
      importFile.value = null;

      authStore.logout();
      await router.push('/login');
      window.location.reload();
    } catch (error) {
      importError.value =
        error instanceof Error ? error.message : 'Error al importar';
    } finally {
      isImporting.value = false;
    }
  };

  const handleClearData = async () => {
    if (clearConfirmText.value.toLowerCase().trim() !== 'borrar') {
      clearError.value = 'Escribe "borrar" para confirmar';
      return;
    }

    try {
      isClearing.value = true;
      clearError.value = '';

      const keys = Object.keys(localStorage);
      const cafeKeys = keys.filter((key) => key.startsWith(STORAGE_PREFIX));

      if (clearMode.value === 'all') {
        // Delete everything
        cafeKeys.forEach((key) => localStorage.removeItem(key));
      } else {
        const daysListStr = localStorage.getItem(DAYS_LIST_KEY);
        let lastDayId: string | null = null;

        if (daysListStr) {
          const daysList = JSON.parse(daysListStr);
          if (daysList.length > 0) lastDayId = daysList[0];
        }

        cafeKeys.forEach((key) => {
          if (
            key !== `${DAY_PREFIX}${lastDayId}` &&
            key !== DAYS_LIST_KEY &&
            key !== CURRENT_DAY_KEY
          ) {
            localStorage.removeItem(key);
          }
        });

        // Reset the last day's data
        if (lastDayId) {
          const lastDay = await dayStore.loadDay(lastDayId as any);
          if (lastDay) {
            lastDay.orders = [];
            lastDay.updatedAt = Date.now();

            const key = DAY_PREFIX + lastDay.id;
            localStorage.setItem(key, JSON.stringify(lastDay));
          }
        }
      }

      showClearDialog.value = false;
      clearConfirmText.value = '';

      authStore.logout();
      await router.push('/login');
      window.location.reload();
    } catch (error) {
      clearError.value = 'Error al borrar los datos';
    } finally {
      isClearing.value = false;
    }
  };
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col justify-between md:flex-row">
      <h2 class="text-primary hidden text-2xl font-bold md:inline">
        Configuración
      </h2>
      <ThemeSelector />
    </div>

    <Tabs default-value="data" class="w-full">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="data">Datos</TabsTrigger>
        <TabsTrigger value="cards">Transfermóvil</TabsTrigger>
      </TabsList>

      <TabsContent value="data" class="mt-6">
        <div class="grid gap-6 md:grid-cols-2">
          <!-- Export Card -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Download class="size-5" />
                Exportar datos
              </CardTitle>
              <CardDescription>
                Descarga una copia de seguridad de todos los datos de la
                aplicación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button @click="handleExport" class="w-full gap-2">
                <Download class="size-4" />
                Exportar JSON
              </Button>
            </CardContent>
          </Card>

          <!-- Import Card -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Upload class="size-5" />
                Importar datos
              </CardTitle>
              <CardDescription>
                Restaura una copia de seguridad. Esta acción reemplazará todos
                los datos actuales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                class="w-full gap-2"
                @click="showImportDialog = true"
              >
                <Upload class="size-4" />
                Importar JSON
              </Button>
            </CardContent>
          </Card>

          <!-- Clear Data Card -->
          <Card class="border-destructive/20 md:col-span-2">
            <CardHeader>
              <CardTitle class="text-destructive flex items-center gap-2">
                <Trash2 class="size-5" />
                Borrar datos
              </CardTitle>
              <CardDescription>
                Elimina permanentemente todos los datos de la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                class="w-full gap-2"
                @click="showClearDialog = true"
              >
                <Trash2 class="size-4" />
                Borrar datos
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="cards" class="mt-6">
        <CardManager />
      </TabsContent>
    </Tabs>

    <!-- Import Dialog -->
    <Dialog v-model:open="showImportDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-destructive flex items-center gap-2">
            <AlertTriangle class="size-5" />
            Advertencia!
          </DialogTitle>
          <DialogDescription class="space-y-4">
            <p class="font-medium text-red-600 dark:text-red-400">
              Esta acción eliminará TODOS los datos actuales y los reemplazará
              con los datos del archivo importado.
            </p>
            <p>
              Para confirmar, escribe
              <span class="font-mono font-bold">borrar</span> en el campo
              siguiente:
            </p>
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <div class="space-y-2">
            <label class="text-sm font-medium">Archivo de respaldo</label>
            <Input
              type="file"
              accept=".json,application/json"
              @change="handleFileSelect"
              :disabled="isImporting"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">
              Escribe
              <span class="bg-destructive/50 p-1 font-mono font-bold"
                >borrar</span
              >
              para confirmar
            </label>
            <Input
              v-model="confirmText"
              placeholder="Escribe 'borrar' aquí"
              :disabled="isImporting"
            />
          </div>

          <p v-if="importError" class="text-destructive text-sm">
            {{ importError }}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            @click="showImportDialog = false"
            :disabled="isImporting"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            @click="handleImport"
            :disabled="
              confirmText.toLowerCase().trim() !== 'borrar' ||
              !importFile ||
              isImporting
            "
          >
            <span v-if="isImporting" class="mr-2 size-4 animate-spin">⏳</span>
            Importar y reemplazar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Clear Data Dialog -->
    <Dialog v-model:open="showClearDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-destructive flex items-center gap-2">
            <Trash2 class="size-5" />
            Borrar todos los datos
          </DialogTitle>
          <DialogDescription class="space-y-4">
            <p class="font-medium text-red-600 dark:text-red-400">
              Esta acción es permanente y no se puede deshacer
            </p>
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <div class="space-y-2">
            <label class="text-sm font-medium">Modo de borrado</label>
            <Select v-model="clearMode">
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el modo de borrado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"> Todo </SelectItem>
                <SelectItem value="keep-products">
                  Conservar productos
                </SelectItem>
              </SelectContent>
            </Select>
            <p
              v-if="clearMode === 'keep-products'"
              class="text-muted-foreground text-xs"
            >
              Se creará un día vacío con los productos del último día
            </p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">
              Escribe
              <span class="bg-destructive/50 rounded p-1 font-mono font-bold"
                >borrar</span
              >
              para confirmar
            </label>
            <Input
              v-model="clearConfirmText"
              placeholder="Escribe 'borrar' aqui"
              :disabled="isClearing"
            />
          </div>

          <p v-if="clearError" class="text-destructive text-sm">
            {{ clearError }}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            @click="showClearDialog = false"
            :disabled="isClearing"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            @click="handleClearData"
            :disabled="
              clearConfirmText.toLowerCase().trim() !== 'borrar' || isClearing
            "
          >
            <span v-if="isClearing" class="mr-2 size-4 animate-spin">⏳</span>
            {{
              clearMode === 'all'
                ? 'Borrar todo'
                : 'Borrar y conservar productos'
            }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <DownloadDialog v-model="pendingBlob" :file-name="pendingFileName" />
  </div>
</template>
