<template>
  <v-container class="fill-height">
    <v-app-bar>
      <v-app-bar-title>CF Browse</v-app-bar-title>
    </v-app-bar>
    <v-row class="align-self-stretch">
      <v-col cols="3">
        <CFTreeView @update:activated="onTreeViewActivated" />
      </v-col>
      <v-col cols="auto">
        <component :is="currentComponent" :value="selectedItem" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import CFTreeView from './CFTreeView.vue';
import NoFile from './detail/NoFile.vue';
import { cfFile } from '@/store/cf-store';
import { CFObject, CFProperty } from '@@/cf/types';
import NoView from './detail/NoView.vue';
import CFObjectView from './detail/CFObjectView.vue';
import CFPropertyView from './detail/CFPropertyView.vue';

const selectedItem = ref<CFProperty | CFObject | null>(null)

const onTreeViewActivated = (items: unknown[]) => {
  if (items.length === 0) {
    selectedItem.value = null;
    return;
  }

  const item = items[0] as (CFProperty | CFObject);
  selectedItem.value = item;
}

const currentComponent = computed(() => {
  if (!cfFile.value) return NoFile;

  if (selectedItem.value instanceof CFObject) {
    return CFObjectView;
  } else if (selectedItem.value instanceof CFProperty) {
    return CFPropertyView;
  } else {
    return NoView;
  }
});

</script>
