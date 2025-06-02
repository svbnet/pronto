<template>
  <CFPointerDetail :value="value.pointer" />
</template>
<script setup lang="ts">
import type { CFPointerProperty } from '@@/cf/types';
import CFPointerDetail from '../cf-pointer/CFPointerDetail.vue';

defineProps<{
  value: CFPointerProperty
}>();
</script>
