
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
  dataPointer = "DataPointer"
}

export const ATTRIB_SIZES: Record<AttribType, number> = Object.freeze({
  [AttribType.u8]: 1,
  [AttribType.s8]: 1,

  [AttribType.u16]: 2,
  [AttribType.s16]: 2,
  [AttribType.dataLenU16]: 2,
  [AttribType.gid]: 2,
  [AttribType.irDuration]: 2,

  [AttribType.u32]: 4,
  [AttribType.s32]: 4,
  [AttribType.dataLenU32]: 4,
  [AttribType.colorRef]: 4,  
  [AttribType.position]: 4,
  [AttribType.dimension]: 4,
  [AttribType.pointer]: 4,
  [AttribType.dataPointer]: 4
});

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
    case AttribType.gid:
    case AttribType.irDuration:  
      return dv.getUint16(offset, true);

    case AttribType.colorRef:
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

