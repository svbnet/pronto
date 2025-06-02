<template>
<h3>Attribute : {{ value.name }}</h3>
<v-divider />

<v-form disabled>
  <v-text-field label="Class" :model-value="value.class.name" />
  <v-text-field label="Name" :model-value="value.name" />
  <v-text-field label="Size" :model-value="actualSize" />
  <v-text-field label="Type" :model-value="actualType" />
  <v-checkbox label="Ancestor?" :model-value="value.ancestor" />
  <v-checkbox label="Array?" :model-value="value.array" />
  <v-text-field label="Pointer Target" :model-value="pointerType" />
  <v-text-field label="Mask" :model-value="value.mask" />
  <v-text-field label="Count" :model-value="value.count" />
</v-form>
</template>
<script setup lang="ts">
import type { Attrib } from '@@/grammar/types';
import { computed } from 'vue';

const props = defineProps<{
  value: Attrib,
}>();

const actualType = computed(() => (typeof props.value.type === 'string' ? props.value.type : props.value.type.className));

const actualSize = computed(() => (props.value.array ? 'Unknown - array' : props.value.size));

const pointerType = computed(() => {
  if (props.value.pointerTarget) {
    return typeof props.value.pointerTarget === 'string' ? props.value.pointerTarget : props.value.pointerTarget.className;
  }
});
</script>
