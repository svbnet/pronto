<template>
  <v-dialog v-model="data.isDialogOpen" width="auto">
    <v-card max-width="400" text="Please select one file.">
      <template #actions>
        <v-btn class="ms-auto" text="OK" @click="data.isDialogOpen = false" />
      </template>
    </v-card>
  </v-dialog>
  <v-file-upload @update:model-value="onFileSelected" />
</template>
<script setup lang="ts">
import { importCfFile } from '@/store/cf-store';
import { reactive } from 'vue';


const data = reactive<{ isDialogOpen: boolean }>({isDialogOpen: false});

const onFileSelected = (files: unknown) => {
  const file = files as File;

  importCfFile(file);
}
</script>
