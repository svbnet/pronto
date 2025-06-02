import { GrammarParser } from '@@/grammar/parser';
import grammar from '@@/grammar/grammar-merged.xml?raw';
import { CFDeserializer } from '@@/cf/deserializer';
import { ref, type Ref } from 'vue';
import { CFObject } from '@@/cf/types';

export const grammarParser = new GrammarParser(grammar);
export const typeRegistry = grammarParser.parse();

export const mainCfDeserializer = new CFDeserializer(typeRegistry);

export let cfData: ArrayBuffer;
export const cfFile: Ref<CFObject | null> = ref(null);

export const importCfFile = async (file: File) => {
  cfData = await file.arrayBuffer();
  cfFile.value = mainCfDeserializer.parse(cfData);
};
