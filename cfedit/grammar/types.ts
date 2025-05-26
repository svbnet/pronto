import { Node } from "@xmldom/xmldom";
import { TypeRegistry } from "./registry";

export class ClassNotFoundError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ClassNotFoundError";
  }
}

export type Documentation = Node[];

export enum AttribType {
  u8 = "U8",
  u16 = "U16",
  u32 = "U32",
  s8 = "S8",
  s16 = "S16",
  s32 = "S32",
  dataLenU16 = "DataLenU16",
  dataLenU32 = "DataLenU32",
  colorRef = "T_ColorRef",
  gid = "T_Gid",
  irDuration = "T_IrDuration",
  position = "T_Position",
  dimension = "T_Dimension",
  pointer = "Pointer",
  dataPointer = "DataPointer",
}

export const deserializeValue = (
  type: AttribType,
  data: ArrayBuffer,
  offset = 0
) => {
  const dv = new DataView(data);
  switch (type) {
    case AttribType.u8:
      return dv.getUint8(offset);

    case AttribType.s8:
      return dv.getInt8(offset);

    case AttribType.dataLenU16:
    case AttribType.u16:
      return dv.getUint16(offset, true);

    case AttribType.colorRef:
    case AttribType.gid:
    case AttribType.irDuration:
    case AttribType.position:
    case AttribType.dimension:
    case AttribType.pointer:
    case AttribType.dataPointer:
    case AttribType.dataLenU32:
    case AttribType.u32:
      return dv.getUint32(offset, true);

    case AttribType.s16:
      return dv.getInt16(offset, true);

    case AttribType.s32:
      return dv.getInt32(offset, true);

    default:
      throw new TypeError(`Cannot convert to a number: ${type}`);
  }
};

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
      return `\`${t}\``;
    } else {
      return `<ClassRef: ${t.className}>`;
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

    switch (this.type) {
      case AttribType.u8:
      case AttribType.s8:
        return 1;

      case AttribType.u16:
      case AttribType.s16:
      case AttribType.dataLenU16:
      case AttribType.gid:
      case AttribType.irDuration:
        return 2;

      case AttribType.u32:
      case AttribType.s32:
      case AttribType.dataLenU32:
      case AttribType.colorRef:
      case AttribType.position:
      case AttribType.dimension:
      case AttribType.pointer:
      case AttribType.dataPointer:
        return 4;

      default:
        return 0;
    }
  }

  inspect(): string {
    const optionalAttrs: string[] = [];
    ["ancestor", "array", "count"].forEach((t) => {
      let val = this[t as keyof typeof this];
      if (val) {
        optionalAttrs.push(`${t}=${val}`);
      }
    });
    if (this.pointerTarget) {
      optionalAttrs.push(`pointerTarget=${inspectTarget(this.pointerTarget)}`);
    }
    return `<Attrib name=${this.name}, type=${inspectTarget(this.type)}, ${optionalAttrs.join(
      ", "
    )}>`;
  }
}

export class Class {
  name: string;
  id: number;
  attributes: Attrib[];
  masks: Mask[];
  documentation?: Documentation;
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
    notes?: Documentation[],
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
    return `<Class id=${this.id}, name=${this.name}>`;
  }
}
