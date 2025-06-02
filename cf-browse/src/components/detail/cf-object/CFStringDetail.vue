<template>
  <h3>String Contents</h3>
  <v-divider />
  <v-sheet>
    <code>{{ contents }}</code>
  </v-sheet>
</template>
<script setup lang="ts">
import { cfData } from '@/store/cf-store';
import type { CFString } from '@@/cf/types';
import { computed } from 'vue';

const props = defineProps<{
  value: CFString
}>();

const contents = computed(() => {
  return props.value.getContents(cfData);
})
</script>
