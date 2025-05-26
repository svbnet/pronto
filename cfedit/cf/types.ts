import { Attrib, AttribType, Class, deserializeValue } from "../grammar/types";
import { formatHex32 } from "./utils";
import { CFDeserializer } from "./deserializer";

/**
 * The abstract base class of all properties. A property is a piece of data associated with a class attribute.
 */
export abstract class CFProperty {
  attrib: Attrib;
  location: number;

  constructor(attrib: Attrib, location: number) {
    this.attrib = attrib;
    this.location = location;
  }

  inspect(): string {
    return `<${this.constructor.name}@${formatHex32(this.location)} attrib=${this.attrib.inspect()}>`;
  }
}

/**
 * A property that holds an integer value.
 */
export class CFIntegerProperty extends CFProperty {
  value: number;

  constructor(attrib: Attrib, location: number, integer: number) {
    super(attrib, location);

    if (attrib.count > 1) {
      throw new TypeError('Attribute is a fixed array, use CFFixedIntegerArrayProperty');
    }

    if (typeof attrib.type !== "string") {
      throw new TypeError(
        "CFIntegerProperty cannot be used with a composite value"
      );
    }

    this.value = integer;
  }

  inspect(): string {
    return `<${this.constructor.name}@${formatHex32(this.location)} value=${this.value}, attrib=${this.attrib.inspect()}>`;
  }
}

/**
 * A property that holds a fixed list of integer values.
 */
export class CFIntegerArrayProperty extends CFProperty {
  value: number[];

  constructor(type: Attrib, address: number, value: number[]) {
    super(type, address);

    if (typeof type.type !== "string") {
      throw new TypeError(
        "CFFixedIntegerArrayProperty cannot be used with a composite value"
      );
    }

    this.value = value;
  }

  inspect(): string {
    return `<${this.constructor.name}@${formatHex32(this.location)} value=${JSON.stringify(this.value)}, attrib=${this.attrib.inspect()}>`;
  }
}

/**
 * Abstract base class of all pointer. A pointer is an integer value that references another object, an integer, or a piece of data.
 */
export abstract class CFPointer {
  location: number;
  address: number;

  constructor(location: number, address: number) {
    this.location = location;
    this.address = address;
  }

  get isNull() {
    return this.address === 0;
  }

  inspect(): string {
    return `<${this.constructor.name}@${formatHex32(this.location)} address=${formatHex32(this.address)}>`;
  }
}

/**
 * Represents an object pointer. An object pointer references an object that is defined somewhere else.
 */
export class CFObjectPointer extends CFPointer {
  type: Class;
  
  constructor(location: number, type: Class, address: number) {
    super(location, address);
    this.type = type;
  }

  dereference(deserializer: CFDeserializer, data: ArrayBuffer): CFObject {
    if (this.isNull) throw new TypeError('Cannot dereference null pointer');

    return deserializer.parse(data.slice(this.address));
  }

  inspect(): string {
    return `<${this.constructor.name}@${formatHex32(this.location)} address=${formatHex32(this.address)} type=${this.type.inspect()}>`;
  }
}

export class CFIntegerPointer extends CFPointer {
  type: AttribType;

  constructor(location: number, type: AttribType, address: number) {
    super(location, address);
    this.type = type;
  }

  dereference(data: ArrayBuffer): number {
    if (this.isNull) throw new TypeError('Cannot dereference null pointer');

    return deserializeValue(this.type, data.slice(this.address), 0);
  }

  inspect(): string {
    return `<${this.constructor.name}@${formatHex32(this.location)} address=${formatHex32(this.address)} type=\`${this.type}\`>`;
  }
}

export class CFDataPointer extends CFPointer {
  dereference(data: ArrayBuffer, length: number): ArrayBuffer {
    if (this.isNull) throw new TypeError('Cannot dereference null pointer');

    return data.slice(this.address, this.address + length);
  }
}

export class CFPointerProperty extends CFProperty {
  pointer: CFPointer;

  constructor(type: Attrib, address: number, value: CFPointer) {
    super(type, address);
    this.pointer = value;
  }
}

export class CFArray extends CFProperty {
  items: CFPointer[];

  constructor(type: Attrib, address: number, value: CFPointer[]) {
    super(type, address);
    this.items = value;
  }

  dereferenceItems(data: ArrayBuffer, deserializer?: CFDeserializer) {
    if (this.attrib.pointerTarget === AttribType.dataPointer) {
      throw new TypeError('Cannot use dereferenceItems on an array of DataPointers');
    }

    if (this.attrib.pointerTarget === AttribType.pointer) {
      if (!deserializer) {
        throw new TypeError('deserializer must be given for an array of Pointers');
      }
      return (this.items as CFObjectPointer[]).map((item) => (
        item.dereference(deserializer, data)
      ));
    }

    return (this.items as CFIntegerPointer[]).map((item) => (
        item.dereference(data)
    ));
  }

  inspect(): string {
    const inspectItems = this.items.map((i) => i.inspect());
    return `<${this.constructor.name}@${formatHex32(this.location)} items=[${inspectItems.join(', ')}], attrib=${this.attrib.inspect()}>`;
  }
}

export class CFObject {
  type: Class;
  address: number;
  properties: CFProperty[];

  constructor(type: Class, address: number, properties: CFProperty[]) {
    this.type = type;
    this.address = address;
    this.properties = properties;
  }

  get<T extends CFProperty>(name: string): T | undefined {
    return this.properties.find((v) => v.attrib.name === name) as T;
  }

  inspect(): string {
    return `<${this.constructor.name}@${formatHex32(this.address)} type=${this.type.inspect()}>`;
  }
}

export class CFString extends CFObject {
  getContents(data: ArrayBuffer) {
    const size = this.get<CFIntegerProperty>("Size");
    const dataPtr = this.get<CFPointerProperty>("cfData");

    if (!size || !dataPtr) throw new Error('CFString does not have size and cfData!');

    const textBytes = (dataPtr.pointer as CFDataPointer).dereference(data, size.value);
    const td = new TextDecoder('utf-8');
    return td.decode(textBytes);
  }
}
