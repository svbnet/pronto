<template>
  <h3>Array Details</h3>
  <v-divider />
  <v-form disabled>
    <v-text-field label="Item Type" :model-value="itemType.name" />
    <v-text-field label="Length" :model-value="value.length" />
  </v-form>
</template>
<script setup lang="ts">
import { cfData, typeRegistry } from '@/store/cf-store';
import type { CFArray } from '@@/cf/types';
import { computed } from 'vue';

const props = defineProps<{
  value: CFArray
}>();

const itemType = computed(() => {
  return props.value.getClass(typeRegistry);
})
</script>
