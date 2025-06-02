<template>
  <h3>Integer Pointer</h3>
  <v-divider />
  <v-form disabled>
    <v-text-field label="Dec" :model-value="intValue" />
    <v-text-field label="Hex" :model-value="formatHex32(intValue)" />
  </v-form>
</template>
<script setup lang="ts">
import { cfData } from '@/store/cf-store';
import type { CFIntegerPointer } from '@@/cf/types';
import { formatHex32 } from '@@/cf/utils';
import { computed } from 'vue';

const props = defineProps<{
  value: CFIntegerPointer
}>();

const intValue = computed(() => {
  return props.value.dereference(cfData);
});
</script>
