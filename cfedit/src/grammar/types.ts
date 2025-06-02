import { Node } from "@xmldom/xmldom";
import { TypeRegistry } from "./registry";
import { ATTRIB_SIZES, AttribType } from "./attrib-type";

export class ClassNotFoundError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ClassNotFoundError";
  }
}

export type Documentation = Node[];

export interface EnumEntry {
  value: number;
  name?: string;
  documentation?: Documentation;
}

export interface Enum {
  prefix?: string;
  entries: EnumEntry[];
}

export interface Bits {
  from: number;
  to: number;
  name: string;
  enum?: Enum;
  documentation?: Documentation;
}

export interface Bit {
  index: number;
  name: string;
  documentation?: Documentation;
}

export interface Bitmask {
  bits: (Bit | Bits)[];
}

export interface Mask {
  name: string;
  value: number;
}

export class ClassRef {
  className: string;
  class?: Class;

  constructor(className: string, klass?: Class) {
    this.className = className;
    this.class = klass;
  }

  dereference(registry: TypeRegistry) {
    if (this.class) return this.class;

    this.class = registry.findByName(this.className);
    if (!this.class)
      throw new ClassNotFoundError(`Class not found: ${this.className}`);
    return this.class;
  }
}

const inspectTarget = (t: AttribType | ClassRef) => {
  if (typeof t === "string") {
    return t;
  } else {
    return `<ClassRef ${t.className}>`;
  }
};

export class Attrib {
  name: string;
  type: AttribType | ClassRef;
  ancestor: boolean;
  array: boolean;
  padding: number = 0;
  pointerTarget?: AttribType | ClassRef;
  mask: number = 0;
  enum?: Enum;
  count: number = 1;
  bitmask?: Bitmask;
  documentation?: Documentation;
  notes?: Documentation[];

  class: Class;

  constructor(
    klass: Class,
    name: string,
    type: AttribType | ClassRef,
    ancestor: boolean,
    array: boolean,
    padding = 0,
    pointerTarget?: AttribType | ClassRef,
    mask = 0,
    enumm?: Enum,
    count = 1,
    bitmask?: Bitmask,
    documentation?: Documentation,
    notes?: Documentation[]
  ) {
    this.class = klass;
    this.name = name;
    this.type = type;
    this.ancestor = ancestor;
    this.array = array;
    this.padding = padding;
    this.pointerTarget = pointerTarget;
    this.mask = mask;
    this.enum = enumm;
    this.count = count;
    this.bitmask = bitmask;
    this.documentation = documentation;
    this.notes = notes;

    if (array) {
      if (!pointerTarget) {
        throw new TypeError(
          `Expected array attribute '${this.name}' to have a pointer target`
        );
      }
      if (type !== AttribType.pointer) {
        throw new TypeError(
          `Expected array attribute '${this.name}' to be of type pointer`
        );
      }
      if (ancestor) {
        throw new TypeError(
          `Array attribute '${this.name}' cannot be an ancestor`
        );
      }
    }
  }

  get size(): number {
    if (this.array) {
      throw new TypeError(`Array attribute '${this.name}' size is dynamic`);
    }

    if (typeof this.type !== "string") {
      return this.type.dereference(this.class.registry).size;
    }

    return ATTRIB_SIZES[this.type];
  }

  inspect(): string {
    const optionalAttrs: string[] = [];
    ["ancestor", "array"].forEach((t) => {
      let val = this[t as keyof typeof this];
      if (val) {
        optionalAttrs.push(`${t}=${val}`);
      }
    });
    if (this.pointerTarget) {
      optionalAttrs.push(`pointerTarget=${inspectTarget(this.pointerTarget)}`);
    }
    if (this.count > 1) {
      optionalAttrs.push(`count=${this.count}`);
    }
    return `<Attrib{${inspectTarget(this.type)}} "${this.name}" ${optionalAttrs.join(", ")}>`;
  }
}

/**
 * Represents a class definition. A class is a type that can contain one or more attributes.
 */
export class Class {
  /**
   * Name of the class. This is only used for references within the grammar.
   */
  name: string;
  /**
   * Numeric ID of the class. This must match the ID in the binary format.
   */
  id: number;
  /**
   * Child attributes.
   */
  attributes: Attrib[];
  /**
   * [documentation only] An array of bitmasks that can be used to filter out attributes, depending on the
   * object's mask value.
   */
  masks: Mask[];
  /**
   * Documentation for this class.
   */
  documentation?: Documentation;
  /**
   * Note documentation for this class.
   */
  notes?: Documentation[];

  registry: TypeRegistry;
  private _fa?: Attrib[];
  private _size?: number;

  constructor(
    registry: TypeRegistry,
    name: string,
    id: number,
    attributes: Attrib[],
    masks: Mask[],
    documentation?: Documentation,
    notes?: Documentation[]
  ) {
    this.name = name;
    this.id = id;
    this.attributes = attributes;
    this.masks = masks;
    this.registry = registry;
    this.documentation = documentation;
    this.notes = notes;
  }

  get flatAttributes() {
    if (this._fa) return this._fa;

    this._fa = this.attributes.flatMap<Attrib>((attr): Attrib | Attrib[] => {
      // Don't dereference arrays as the size is dynamic
      if (attr.array) return attr;

      const attrType = attr.type;
      if (typeof attrType !== "string" || attr.ancestor) {
        if (typeof attrType === "string") {
          return attr;
        }
        const klass = attrType.dereference(this.registry);
        return klass.flatAttributes;
      }
      return attr;
    });
    return this._fa;
  }

  get size() {
    if (this._size) return this._size;

    this._size = this.flatAttributes.reduce((accum, v) => accum + v.size, 0);
    return this._size;
  }

  inspect() {
    return `<Class#${this.id} "${this.name}">`;
  }
}
