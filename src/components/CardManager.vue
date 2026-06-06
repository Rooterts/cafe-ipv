<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { useCardStore } from '@/stores/card';
  import { useSoundEffect } from '@/composable/useSoundEffect';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from '@/components/ui/dialog';
  import { Card, CardContent, CardTitle } from '@/components/ui/card';
  import { Plus, QrCode, Edit, Trash2 } from 'lucide-vue-next';
  import type { ICard } from '@/types';
  import QRDialog from './QRDialog.vue';

  const cardStore = useCardStore();
  const { playAdd, playTrash } = useSoundEffect();

  const showCardDialog = ref(false);
  const editingCard = ref<ICard | null>(null);
  const formData = ref({
    alias: '',
    cardNumber: '',
    phoneNumber: '',
  });

  const showQRDialog = ref(false);
  const selectedCard = ref<ICard | null>(null);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join('-');
  };

  const handleCardNumberInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/-/g, '');
    value = value.replace(/\D/g, '');
    if (value.length > 16) {
      value = value.slice(0, 16);
    }
    formData.value.cardNumber = formatCardNumber(value);
  };

  const handlePhoneNumberInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 15) {
      value = value.slice(0, 15);
    }
    formData.value.phoneNumber = value;
  };

  const isValidCardNumber = (cardNumber: string) => {
    const digits = cardNumber.replace(/-/g, '');
    return digits.length >= 16;
  };

  const isValidPhoneNumber = (phoneNumber: string) => {
    const digits = phoneNumber.replace(/\D/g, '');
    return digits.length >= 8;
  };

  const isFormValid = computed(() => {
    return (
      formData.value.alias.trim() !== '' &&
      isValidCardNumber(formData.value.cardNumber) &&
      isValidPhoneNumber(formData.value.phoneNumber)
    );
  });

  const openNewCard = () => {
    editingCard.value = null;
    formData.value = {
      alias: '',
      cardNumber: '',
      phoneNumber: '',
    };
    showCardDialog.value = true;
  };

  const openEditCard = (card: ICard) => {
    editingCard.value = card;
    console.log(card);
    formData.value = {
      alias: card.alias,
      cardNumber: formatCardNumber(card.cardNumber),
      phoneNumber: card.phoneNumber,
    };
    showCardDialog.value = true;
  };

  const saveCard = async () => {
    if (!isFormValid.value) return;

    const cleanCardNumber = formData.value.cardNumber.replace(/-/g, '');

    const cardData = {
      alias: formData.value.alias,
      cardNumber: cleanCardNumber,
      phoneNumber: formData.value.phoneNumber,
    };

    if (editingCard.value) {
      await cardStore.updateCard(editingCard.value.id, cardData);
    } else {
      await cardStore.addCard(cardData);
      playAdd();
    }
    showCardDialog.value = false;
  };

  const deleteCard = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta tarjeta?')) {
      await cardStore.deleteCard(id);
      playTrash();
    }
  };

  const showQR = (card: ICard) => {
    selectedCard.value = card;
    showQRDialog.value = true;
  };

  onMounted(() => {
    cardStore.loadCards();
  });
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Tarjetas para Transfermóvil</h3>
      <Button size="sm" @click="openNewCard" class="gap-2">
        <Plus class="size-4" />
        Nueva tarjeta
      </Button>
    </div>

    <div
      v-if="cardStore.cards.length === 0"
      class="text-muted-foreground py-8 text-center"
    >
      No hay tarjetas registradas.
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="card in cardStore.cards" :key="card.id" class="relative">
        <CardContent class="pb-2">
          <CardTitle class="flex items-center justify-between text-base">
            <span class="truncate">{{ card.alias }}</span>
            <div class="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                class="size-7"
                @click="showQR(card)"
              >
                <QrCode class="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="size-7"
                @click="openEditCard(card)"
              >
                <Edit class="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="text-destructive hover:text-destructive size-7"
                @click="deleteCard(card.id)"
              >
                <Trash2 class="size-4" />
              </Button>
            </div>
          </CardTitle>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="showCardDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {{ editingCard ? 'Editar tarjeta' : 'Nueva tarjeta' }}
          </DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="alias">Alias</Label>
            <Input
              id="alias"
              v-model="formData.alias"
              placeholder="Ej. FELIPE CUP"
            />
          </div>
          <div class="space-y-2">
            <Label for="cardNumber">Número de tarjeta</Label>
            <Input
              id="cardNumber"
              :model-value="formData.cardNumber"
              @input="handleCardNumberInput"
              placeholder="Ej. 1234-5678-9012-3456"
              :class="{
                'border-red-500':
                  formData.cardNumber &&
                  !isValidCardNumber(formData.cardNumber),
              }"
            />
            <p
              v-if="
                formData.cardNumber && !isValidCardNumber(formData.cardNumber)
              "
              class="text-xs text-red-500"
            >
              El número de tarjeta debe tener al menos 16 dígitos
            </p>
          </div>
          <div class="space-y-2">
            <Label for="phoneNumber">Teléfono</Label>
            <Input
              id="phoneNumber"
              :model-value="formData.phoneNumber"
              @input="handlePhoneNumberInput"
              placeholder="Ej. 51234567"
              :class="{
                'border-red-500':
                  formData.phoneNumber &&
                  !isValidPhoneNumber(formData.phoneNumber),
              }"
            />
            <p
              v-if="
                formData.phoneNumber &&
                !isValidPhoneNumber(formData.phoneNumber)
              "
              class="text-xs text-red-500"
            >
              El número de teléfono debe tener al menos 8 dígitos
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showCardDialog = false">
            Cancelar
          </Button>
          <Button @click="saveCard" :disabled="!isFormValid">
            {{ editingCard ? 'Actualizar' : 'Guardar' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <QRDialog v-model:open="showQRDialog" :card="selectedCard!" />
  </div>
</template>
