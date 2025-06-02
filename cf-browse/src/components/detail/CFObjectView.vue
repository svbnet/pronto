<template>
  <h2>{{ value.type.name }}@{{ formatHex32(value.address) }}</h2>
  <v-divider />
  <CFArrayDetail v-if="props.value instanceof CFArray" :value="props.value" />
  <CFStringDetail v-if="props.value instanceof CFString" :value="props.value" />
  <ClassDetail :value="value.type" />
</template>
<script setup lang="ts">
import { CFArray, CFString, type CFObject } from '@@/cf/types';
import { formatHex32 } from '@@/cf/utils';
import CFStringDetail from './cf-object/CFStringDetail.vue';
import ClassDetail from './grammar/ClassDetail.vue';
import CFArrayDetail from './cf-object/CFArrayDetail.vue';

const props = defineProps<{
  value: CFObject
}>();
</script>
