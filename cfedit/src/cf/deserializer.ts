import { TypeRegistry } from "../grammar/registry";
import {
  Attrib,
  Class,
  ClassNotFoundError,
} from "../grammar/types";
import { deserializeValue } from "../grammar/attrib-type";
import { AttribType } from "../grammar/attrib-type";
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

/**
 * A stateful stream reader that operates on an ArrayBuffer.
 */
export class CFArrayBufferStream {
  /** The underlying ArrayBuffer containing the data to be read */
  readonly data: ArrayBuffer;
  
  /** Current position in the buffer (byte offset) */
  position: number = 0;
  
  /** Whether to use little-endian byte order for multi-byte reads */
  isLittleEndian: boolean;

  /**
   * Creates a new CFArrayBufferStream instance.
   * @param data - The ArrayBuffer to read from
   * @param isLittleEndian - Whether to use little-endian byte order (defaults to false for big-endian)
   */
  constructor(data: ArrayBuffer, isLittleEndian = false) {
    this.data = data;
    this.isLittleEndian = isLittleEndian;
  }

  /**
   * Sets the current position in the buffer.
   * @param position - The byte offset to seek to
   * @returns This stream instance for method chaining
   */
  seek(position: number): CFArrayBufferStream {
    this.position = position;
    return this;
  }

  /**
   * Reads a specified number of bytes from the current position and advances the position.
   * @param size - Number of bytes to read
   * @returns A new ArrayBuffer containing the read data
   */
  read(size: number): ArrayBuffer {
    const nextPos = this.position + size;
    const buf = this.data.slice(this.position, nextPos);
    this.position = nextPos;
    return buf;
  }

  private getDataView() {
    return new DataView(this.data, this.position);
  }

  /**
   * Reads an 8-bit unsigned integer at the current position plus offset without advancing the position.
   * @param extraOffset - Additional offset from current position (defaults to 0)
   * @returns The 8-bit unsigned integer value
   */
  peekUint8(extraOffset = 0) {
    return this.getDataView().getUint8(extraOffset);
  }

  /**
   * Reads a 16-bit unsigned integer at the current position plus offset without advancing the position.
   * @param extraOffset - Additional offset from current position (defaults to 0)
   * @returns The 16-bit unsigned integer value
   */
  peekUint16(extraOffset = 0) {
    return this.getDataView().getUint16(extraOffset, this.isLittleEndian);
  }

  /**
   * Reads an 8-bit unsigned integer from the current position and advances the position by 1 byte.
   * @returns The 8-bit unsigned integer value
   */
  readUint8() {
    const num = this.getDataView().getUint8(0);
    this.position += 1;
    return num;
  }

  /**
   * Reads a 16-bit unsigned integer from the current position and advances the position by 2 bytes.
   * @returns The 16-bit unsigned integer value
   */
  readUint16() {
    const num = this.getDataView().getUint16(0, this.isLittleEndian);
    this.position += 2;
    return num;
  }

  /**
   * Reads a 32-bit unsigned integer from the current position and advances the position by 4 bytes.
   * @returns The 32-bit unsigned integer value
   */
  readUint32() {
    const num = this.getDataView().getUint32(0, this.isLittleEndian);
    this.position += 4;
    return num;
  }

  /**
   * Returns a slice of the underlying data from the current position to the specified end.
   * @param end - The end position for the slice (optional, defaults to end of buffer)
   * @returns A new ArrayBuffer containing the sliced data
   */
  slice(end?: number) {
    return this.data.slice(this.position, end);
  }
}

interface RawCFObject {
  objectType: number;
  extensionCount: number;
  rootType: number;
}

/**
 * A deserializer implementation for CF files.
 */
export class CFDeserializer {
  /** The type registry this deserializer is working on. */
  readonly typeRegistry: TypeRegistry;
  private readonly explicitObjectTypes = new Map<number, typeof CFObject>();

  /**
   * Creates a new instance.
   * @param typeRegistry The type registry containing class and attribute types.
   */
  constructor(typeRegistry: TypeRegistry) {
    this.typeRegistry = typeRegistry;
    this.registerObjectType(100, CFString);
    this.registerObjectType(101, CFArray);
  }

  /**
   * Registers a class deriving from CFObject to be used when deserializing an object.
   * There are two built-in classes registered for S_CFSTRING and S_CFARRAY to make dereferencing
   * their respective values easier.
   * @param classId The numeric ID of the class to register this object type against.
   * @param klass The class deriving from CFObject that will be instantiated.
   */
  registerObjectType(classId: number, klass: typeof CFObject) {
    this.explicitObjectTypes.set(classId, klass);
  }

  /**
   * Unregisters an object type.
   * @param classId The numeric ID of the class to unregister.
   */
  unregisterObjectType(classId: number) {
    this.explicitObjectTypes.delete(classId);
  }

  /**
   * Deserializes a complete CF file. Do not pass a sliced ArrayBuffer as pointer offsets will be off,
   * instead use deserializeObject.
   * @param data The raw content of the CF file to deserialize.
   * @returns The root CFObject of the file.
   */
  parse(data: ArrayBuffer): CFObject {
    return this.deserializeObject(new CFArrayBufferStream(data, true));
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

    if (
      attrib.type === AttribType.dataPointer ||
      attrib.type === AttribType.pointer
    ) {
      // Attribute is a pointer
      let pointer: CFPointer;
      if (attrib.type === AttribType.pointer) {
        // Points to a fixed size thing
        if (typeof attrib.pointerTarget === "string") {
          // Points to U8, U16, etc
          pointer = new CFIntegerPointer(
            pos,
            attrib.pointerTarget,
            buf.readUint32()
          );
        } else {
          // Points to object      
          pointer = new CFObjectPointer(
            pos,
            attrib.pointerTarget!.dereference(this.typeRegistry),
            buf.readUint32()
          );
        }
      } else {
        // Points to a blob
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

  /**
   * Deserializes an object at the current position of the CFArrayBufferStream.
   * @param buf The CFArrayBufferStream of a CF file.
   * @returns A CFObject at the position of the buffer.
   */
  deserializeObject(buf: CFArrayBufferStream): CFObject {
    const offset = buf.position;
    checkAligned32(buf.position);

    // Peek object
    // S_CFOBJECT is always the first property in an object so we need to eagerly parse it to get the class ID
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
