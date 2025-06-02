<template>
  <h3>Integer Value</h3>
  <v-form disabled>
    <v-text-field label="Dec" :model-value="props.value.value" />
    <v-text-field label="Hex" :model-value="formatHex32(props.value.value)" />
  </v-form>
</template>
<script setup lang="ts">
import type { CFIntegerProperty } from '@@/cf/types';
import { formatHex32 } from '@@/cf/utils';

const props = defineProps<{
  value: CFIntegerProperty
}>();
</script>
