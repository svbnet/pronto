<template>
  <h2>{{ value.attrib.name }}@{{ formatHex32(value.location) }}</h2>
  <v-divider />
  <CFIntegerArrayPropertyDetail v-if="value instanceof CFIntegerArrayProperty" :value="value" />
  <CFIntegerPropertyDetail v-if="value instanceof CFIntegerProperty" :value="value" />
  <CFPointerPropertyDetail v-if="value instanceof CFPointerProperty" :value="value" />

  <AttributeDetail :value="value.attrib" />
</template>
<script setup lang="ts">
import { CFIntegerArrayProperty, CFIntegerProperty, CFPointerProperty, CFProperty } from '@@/cf/types';
import { formatHex32 } from '@@/cf/utils';
import AttributeDetail from './grammar/AttributeDetail.vue';
import CFIntegerArrayPropertyDetail from './cf-property/CFIntegerArrayPropertyDetail.vue';
import CFIntegerPropertyDetail from './cf-property/CFIntegerPropertyDetail.vue';
import CFPointerPropertyDetail from './cf-property/CFPointerPropertyDetail.vue';

defineProps<{
  value: CFProperty
}>();
</script>
