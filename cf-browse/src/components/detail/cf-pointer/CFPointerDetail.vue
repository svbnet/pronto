<template>
  <h3>Pointer</h3>
  <v-divider />
  <v-form disabled>
    <v-text-field label="Type" :model-value="value.constructor.name" />
    <v-text-field label="Address" :model-value="value.address" />
  </v-form>
  <CFIntegerPointerDetail v-if="value instanceof CFIntegerPointer" :value="value" />
</template>
<script setup lang="ts">
import { CFIntegerPointer, type CFPointer } from '@@/cf/types';
import CFIntegerPointerDetail from './CFIntegerPointerDetail.vue';

defineProps<{
  value: CFPointer
}>();
</script>
