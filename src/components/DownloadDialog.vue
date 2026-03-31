<script setup lang="ts">
  import { ref } from 'vue';
  import { Button } from '@/components/ui/button';
  import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from '@/components/ui/dialog';
  import { ShareIcon, DownloadIcon } from 'lucide-vue-next';
  import { useFileHandler } from '@/composable/useFileHandler';

  const blob = defineModel<Blob | null>({ required: true });
  const props = defineProps<{
    fileName: string;
  }>();

  const { isAndroid, saveToDevice, shareFile } = useFileHandler();
  const actionInProgress = ref(false);

  const handleShare = async () => {
    if (!blob.value) return;

    actionInProgress.value = true;
    await shareFile(blob.value, props.fileName);
    actionInProgress.value = false;
    blob.value = null;
  };

  const handleSave = async () => {
    if (!blob.value) return;

    actionInProgress.value = true;

    await saveToDevice(blob.value, props.fileName);

    actionInProgress.value = false;
    blob.value = null;
  };
</script>

<template>
  <Dialog :open="blob !== null" @update:open="blob = null">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>¿Qué quieres hacer con este archivo?</DialogTitle>
        <DialogDescription
          class="max-h-96 overflow-auto rounded-lg bg-gray-50 p-4 dark:bg-gray-900"
        >
          <pre>{{ fileName }}</pre>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter v-if="isAndroid" class="flex flex-col gap-2 py-4">
        <Button @click="handleShare" :disabled="actionInProgress">
          <ShareIcon class="mr-2 size-4" />
          Compartir
        </Button>
        <Button
          @click="handleSave"
          :disabled="actionInProgress"
          variant="outline"
        >
          <DownloadIcon class="mr-2 size-4" />
          Guardar en dispositivo
        </Button>
      </DialogFooter>
      <DialogFooter v-else class="flex justify-end gap-2 py-4">
        <Button @click="handleSave" :disabled="actionInProgress">
          <DownloadIcon class="mr-2 size-4" />
          Descargar
        </Button>
        <Button @click="blob = null" variant="outline"> Cancelar </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
