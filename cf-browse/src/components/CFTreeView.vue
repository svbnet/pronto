<template>
  <v-treeview density="compact" activatable :items="rootItem" :load-children="enumerateChildren">
    <template #title="{ item }">
      <p>{{ getTitle(item) }}</p>
    </template>
    <template #subtitle="{ item }">
      <p>{{ getValueSubtitle(item) }}</p>
    </template>
    <template #prepend="{ item }">
      <v-icon :icon="getIconForValue((item as TreeItem).value)" />
    </template>
  </v-treeview>
</template>
<script setup lang="ts">
import { cfData, cfFile, mainCfDeserializer } from '@/store/cf-store';
import { CFArray, CFDataPointer, CFIntegerArrayProperty, CFIntegerProperty, CFObject, CFObjectPointer, CFPointerProperty, CFProperty, CFString } from '@@/cf/types';
import { formatHex32 } from '@@/cf/utils';
import { computed, reactive, type Reactive } from 'vue';

interface TreeItem {
  index?: number;
  value: CFObject | CFProperty;
  children?: TreeItem[];
}

const rootItem = computed(() => {
  if (cfFile.value) {
    const root = cfFile.value;
    return [makeItem(root)];
  } else {
    return [];
  }
});

const makeItem = (value: CFObject | CFProperty, index?: number): TreeItem => {
  return reactive({
    index,
    value,
    children: reactive([])
  }) as unknown as TreeItem;
};

const enumerateChildren = (item: unknown) => {
  const treeItem = item as TreeItem;

  if (treeItem.value instanceof CFObject) {
    if (treeItem.value instanceof CFArray) {
      treeItem.children = Array.from(treeItem.value.dereferenceItems(cfData, mainCfDeserializer)).map((item, index) => makeItem(item, index));
    } else {
      treeItem.children = treeItem.value.properties.map((p) => (makeItem(p)));
    }

    return Promise.resolve();
  }

  if (treeItem.value instanceof CFPointerProperty && !treeItem.value.pointer.isNull) {
    if (treeItem.value.pointer instanceof CFObjectPointer) {
      const deref = treeItem.value.pointer.dereference(mainCfDeserializer, cfData);
      treeItem.children = [makeItem(deref)];
    }
  } else {
    treeItem.children = undefined;
  }

  return Promise.resolve();
}

const getTitle = (item: TreeItem) => {
  const value = item.value;
  let title = '???';

  if (value instanceof CFObject) {
    title = value.type.name;
  }
  if (value instanceof CFProperty) {
    title = value.attrib.name;
  }

  if (item.index !== undefined) {
    return `[${item.index}] ${title}`;
  }
  return title;
}

const getValueSubtitle = (item: TreeItem) => {
  if (item.value instanceof CFObject) {
    return formatHex32(item.value.address);
  }
  if (item.value instanceof CFProperty) {
    if (item.value instanceof CFPointerProperty) {
      if (item.value.pointer.isNull) {
        return `${formatHex32(item.value.location)} → (null)`;
      }
      return `${formatHex32(item.value.location)} → ${formatHex32(item.value.pointer.address)}`;
    }
    return formatHex32(item.value.location);
  }
}

const getIconForValue = (value: CFObject | CFProperty) => {
  // CFObject
  if (value instanceof CFString) {
    return 'mdi-alphabetical';
  }
  if (value instanceof CFArray) {
    return 'mdi-code-brackets'
  }
  if (value instanceof CFObject) {
    return 'mdi-sitemap'
  }

  // CFProperty
  if (value instanceof CFPointerProperty) {
    if (value.pointer instanceof CFDataPointer) {
      return 'mdi-hexadecimal';
    }
    return 'mdi-asterisk'
  }
  if (value instanceof CFIntegerProperty) {
    return 'mdi-numeric-1-box-outline'
  }
  if (value instanceof CFIntegerArrayProperty) {
    return 'mdi-numeric-1-box-multiple-outline'
  }
  if (value instanceof CFProperty) {
    return 'mdi-cube';
  }

  return 'mdi-help';
};

</script>
