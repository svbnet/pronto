import { AlignmentError } from "./errors";

export const formatHex32 = (num: number) => (`0x${num.toString(16).padStart(8, '0')}`);

export const checkAligned32 = (offset: number) => {
  const mod = offset % 4;
  if (mod !== 0)
    throw new AlignmentError(
      `Alignment error: offset ${formatHex32(offset)} not aligned to 32 bits`
    );
};
