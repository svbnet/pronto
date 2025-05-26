import { TypeRegistry } from "../grammar/registry";
import {
  Attrib,
  AttribType,
  Class,
  ClassNotFoundError,
  deserializeValue,
} from "../grammar/types";
import {
  CFArray,
  CFDataPointer,
  CFIntegerArrayProperty,
  CFIntegerPointer,
  CFIntegerProperty,
  CFObject,
  CFObjectPointer,
  CFPointer,
  CFPointerProperty,
  CFProperty,
  CFString,
} from "./types";
import { checkAligned32 } from "./utils";

class CFArrayBufferStream {
  readonly data: ArrayBuffer;
  position: number = 0;
  isLittleEndian: boolean;

  constructor(data: ArrayBuffer, isLittleEndian = false) {
    this.data = data;
    this.isLittleEndian = isLittleEndian;
  }

  seek(position: number): CFArrayBufferStream {
    this.position = position;
    return this;
  }

  read(size: number): ArrayBuffer {
    const nextPos = this.position + size;
    const buf = this.data.slice(this.position, nextPos);
    this.position = nextPos;
    return buf;
  }

  private getDataView() {
    return new DataView(this.data, this.position);
  }

  peekUint8(extraOffset = 0) {
    return this.getDataView().getUint8(extraOffset);
  }

  peekUint16(extraOffset = 0) {
    return this.getDataView().getUint16(extraOffset, this.isLittleEndian);
  }

  readUint8() {
    const num = this.getDataView().getUint8(0);
    this.position += 1;
    return num;
  }

  readUint16() {
    const num = this.getDataView().getUint16(0, this.isLittleEndian);
    this.position += 2;
    return num;
  }

  readUint32() {
    const num = this.getDataView().getUint32(0, this.isLittleEndian);
    this.position += 4;
    return num;
  }

  slice(end?: number) {
    return this.data.slice(this.position, end);
  }
}

interface RawCFObject {
  objectType: number;
  extensionCount: number;
  rootType: number;
}

export class CFDeserializer {
  private readonly typeRegistry: TypeRegistry;
  private readonly explicitObjectTypes = new Map<number, typeof CFObject>();

  constructor(typeRegistry: TypeRegistry) {
    this.typeRegistry = typeRegistry;
    this.registerObjectType(100, CFString);
  }

  registerObjectType(classId: number, klass: typeof CFObject) {
    this.explicitObjectTypes.set(classId, klass);
  }

  unregisterObjectType(classId: number) {
    this.explicitObjectTypes.delete(classId);
  }

  parse(data: ArrayBuffer): CFObject {
    return this.visitObject(new CFArrayBufferStream(data, true), 0);
  }

  private getClass(classId: number): Class {
    const cls = this.typeRegistry.findById(classId);
    if (!cls) throw new ClassNotFoundError(`Class not found: ${classId}`);
    return cls;
  }

  private peekObject(buf: CFArrayBufferStream): RawCFObject {
    /**
     * struct S_CFOBJECT {
     *  uint16_t ObjectType;
     *  uint8_t ExtensionCount;
     *  uint8_t RootType;
     * }
     */
    const objectType = buf.peekUint16();
    const extensionCount = buf.peekUint8(2);
    const rootType = buf.peekUint8(3);
    return { objectType, extensionCount, rootType };
  }

  private readArray(buf: CFArrayBufferStream, attrib: Attrib): CFArray {
    /**
     * struct S_CFARRAY {
     *  uint16_t TypeOfData;
     *  uint16_t NrOfElements;
     *  uint32_t elements[];
     * }
     */

    const arrayPos = buf.position;

    // Read attributes manually instead of deserializing them
    const typeOfData = buf.readUint16();
    const nrOfElements = buf.readUint16();
    const elements: (CFObjectPointer | CFIntegerPointer)[] = [];

    if (typeof attrib.pointerTarget === "string") {
      for (let index = 0; index < nrOfElements; index++) {
        const addr = buf.position;
        const address = buf.readUint32();
        elements.push(
          new CFIntegerPointer(addr, attrib.pointerTarget!, address)
        );
      }
    } else {
      const elemClass = this.getClass(typeOfData);

      for (let index = 0; index < nrOfElements; index++) {
        const addr = buf.position;
        const address = buf.readUint32();
        elements.push(new CFObjectPointer(addr, elemClass, address));
      }
    }

    return new CFArray(attrib, arrayPos, elements);
  }

  private readInteger(
    buf: CFArrayBufferStream,
    attrib: Attrib
  ): CFIntegerProperty {
    const pos = buf.position;
    if (typeof attrib.type !== "string") {
      throw new TypeError("readInteger cannot be used with a composite value");
    }
    const num = deserializeValue(attrib.type, buf.read(attrib.size), 0);
    return new CFIntegerProperty(attrib, pos, num);
  }

  private readIntegerArray(
    buf: CFArrayBufferStream,
    attrib: Attrib
  ): CFIntegerArrayProperty {
    const pos = buf.position;
    if (typeof attrib.type !== "string") {
      throw new TypeError(
        "readIntegerArray cannot be used with a composite value"
      );
    }

    const value = [];
    const dataSize = attrib.size;

    for (let index = 0; index < attrib.count; index++) {
      value.push(deserializeValue(attrib.type, buf.read(dataSize), 0));
    }

    return new CFIntegerArrayProperty(attrib, pos, value);
  }

  private createProperty(buf: CFArrayBufferStream, attrib: Attrib): CFProperty {
    const pos = buf.position;

    // Attribute is some kind of pointer or array
    if (
      attrib.type === AttribType.dataPointer ||
      attrib.type === AttribType.pointer
    ) {
      if (attrib.array) return this.readArray(buf, attrib);

      // Attribute is a pointer
      let pointer: CFPointer;
      if (attrib.type === AttribType.pointer) {
        if (typeof attrib.pointerTarget === "string") {
          pointer = new CFIntegerPointer(
            pos,
            attrib.pointerTarget,
            buf.readUint32()
          );
        } else {
          pointer = new CFObjectPointer(
            pos,
            attrib.pointerTarget!.dereference(this.typeRegistry),
            buf.readUint32()
          );
        }
      } else {
        pointer = new CFDataPointer(pos, buf.readUint32());
      }
      return new CFPointerProperty(attrib, pos, pointer);
    }

    // Attribute is an integer or integer array
    if (attrib.count > 1) {
      return this.readIntegerArray(buf, attrib);
    }

    // Attribute is an integer
    return this.readInteger(buf, attrib);
  }

  private visitObject(buf: CFArrayBufferStream, offset: number): CFObject {
    checkAligned32(offset);

    // Seek to offset and peek object
    // S_CFOBJECT is always the first property in an object so we need to eagerly parse it to get the class ID
    buf.seek(offset);
    const objectBase = this.peekObject(buf);

    const klass = this.getClass(objectBase.objectType);
    const mask = objectBase.extensionCount;

    const dataAttributes = [];

    for (const attrib of klass.flatAttributes) {
      const attribMask = attrib.mask ?? 0;
      if ((attribMask & mask) !== attribMask) continue;

      dataAttributes.push(this.createProperty(buf, attrib));
    }

    const type = this.explicitObjectTypes.get(objectBase.objectType) ?? CFObject;
    return new type(klass, offset, dataAttributes);
  }
}
