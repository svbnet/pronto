<template>
<h3>Class : {{ value.name }}</h3>
<v-divider />

<v-form disabled>
  <v-text-field label="ID" :model-value="value.id" />
  <v-text-field label="Name" :model-value="value.name" />
  <v-text-field label="Size" :model-value="safeClassSize" />
</v-form>

<h4>Attributes</h4>
<v-divider />
<v-data-table :items="attributesForTable" />
</template>
<script setup lang="ts">
import type { Class } from '@@/grammar/types';
import { computed } from 'vue';

const props = defineProps<{
  value: Class,
}>();

const attributesForTable = computed(() => {
  return props.value.flatAttributes.map((attr) => {
    const actualSize = attr.array ? 'Unknown - array' : attr.size;
    const actualType = typeof attr.type === 'string' ? attr.type : attr.type.className;
    let pointerType;
    if (attr.pointerTarget) {
      pointerType = typeof attr.pointerTarget === 'string' ? attr.pointerTarget : attr.pointerTarget.className;
    }
    return {
      Class: attr.class.name,
      Name: attr.name,
      Size: actualSize,
      Type: actualType,
      'Ancestor?': attr.ancestor,
      'Array?': attr.array,
      'Pointer Target': pointerType,
      Mask: attr.mask,
      Count: attr.count,
    }
  });
});

const safeClassSize = computed(() => {
  try {
    return props.value.size;
  } catch (e) {
    if (e instanceof TypeError) return 'Unknown - has array member';
    throw e;
  }
});
</script>
