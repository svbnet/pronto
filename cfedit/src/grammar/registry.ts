import { Class } from "./types";

export class TypeRegistry {
  private readonly _types: Class[] = [];
  private readonly _typeNameLookup: Record<string, Class> = {};
  private readonly _typeIdLookup: Record<number, Class> = {};

  add(...types: Class[]) {
    this._types.push(...types);
    types.forEach((t) => {
      this._typeNameLookup[t.name] = t;
      this._typeIdLookup[t.id] = t;
    });
  }

  findByName(name: string): Class | undefined {
    return this._typeNameLookup[name];
  }

  findById(id: number): Class | undefined {
    return this._typeIdLookup[id];
  }
}
