<template>
  <h3>Integer Array Value</h3>
  <v-sheet>
    <code>{{ formatted }}</code>
  </v-sheet>
</template>
<script setup lang="ts">
import type { CFIntegerArrayProperty } from '@@/cf/types';
import { computed } from 'vue';

const props = defineProps<{
  value: CFIntegerArrayProperty
}>();

const formatted = computed(() => {
  return props.value.value.map((n) => n.toString(16)).join(' ');
})
</script>
