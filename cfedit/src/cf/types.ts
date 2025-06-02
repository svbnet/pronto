import { Attrib, Class, ClassNotFoundError } from "../grammar/types";
import { deserializeValue } from "../grammar/attrib-type";
import { AttribType } from "../grammar/attrib-type";
import { formatHex32 } from "./utils";
import { CFArrayBufferStream, CFDeserializer } from "./deserializer";
import { TypeRegistry } from "../grammar/registry";

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
  /** The location of this pointer. */
  location: number;
  /** The location this pointer points to. */
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

    return deserializer.deserializeObject(new CFArrayBufferStream(data, true).seek(this.address));
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

export class CFArray extends CFObject {
  length: number;
  itemClassId: number;

  constructor(type: Class, address: number, properties: CFProperty[]) {
    super(type, address, properties);

    const lengthProp = this.get<CFIntegerProperty>("NrOfElements");
    if (!lengthProp) {
      throw new TypeError('Unexpected missing property for CFArray: NrOfElements');
    }
    this.length = lengthProp.value;

    const typeProp = this.get<CFIntegerProperty>("TypeOfData");
    if (!typeProp) {
      throw new TypeError('Unexpected missing property for CFArray: TypeOfData');
    }
    this.itemClassId = typeProp.value;
  }

  getClass(typeRegistry: TypeRegistry) {
    const klass = typeRegistry.findById(this.itemClassId);
    if (!klass) throw new ClassNotFoundError(`${this.inspect()}: Class ID ${this.itemClassId} not found`);
    return klass;
  }

  *getItemPointers(data: ArrayBuffer, typeRegistry: TypeRegistry) {
    const baseAddress = this.address + this.type.size;
    const bufferStream = new CFArrayBufferStream(data, true);
    bufferStream.position = baseAddress;

    for (let index = 0; index < this.length; index++) {
      const location = bufferStream.position;
      const address = bufferStream.readUint32();
      yield new CFObjectPointer(location, this.getClass(typeRegistry), address);
    }
  }

  *dereferenceItems(data: ArrayBuffer, deserializer: CFDeserializer) {
    for (let item of this.getItemPointers(data, deserializer.typeRegistry)) {
      yield item.dereference(deserializer, data);
    }
  }

  inspect(): string {
    return `<${this.constructor.name}@${formatHex32(this.address)} type=${this.type.inspect()}, length=${this.length}, itemClassId=${this.itemClassId}>`;
  }
}
