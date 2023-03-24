import { PymModel, PymProperty, PymType } from "./types";
import { isComplexe, isPrimitive } from "./utils";

function parseHeader(bits: string, start: number): [number, number] {
  const length = parseInt(bits.slice(start, start + 5), 2);
  const header = parseInt(bits.slice(start + 5, start + 5 + length), 2);
  return [header, start + 5 + length];
}
const stop = (127).toString(2);
function decodeString(
  charset: string,
  bits: string,
  start: number
): [string, number] {
  let index = start;
  let str = "";
  let slice: string;
  while ((slice = bits.slice(index, index + 7)) !== stop && bits.slice(index)) {
    const code = parseInt(slice, 2);
    if (code === 126) {
      str += String.fromCharCode(
        parseInt(bits.slice(index + 7, index + 23), 2)
      );
      index += 23;
    } else if (code === 125) {
      str += String.fromCharCode(
        parseInt(bits.slice(index + 7, index + 15), 2)
      );
      index += 15;
    } else {
      str += charset[code] ?? String.fromCharCode(code);
      index += 7;
    }
  }
  return [str, index + 7];
}
function decodePrimitive(
  model: PymModel,
  type: string,
  bits: string,
  start: number
): [any, number] {
  switch (type) {
    case "string":
      return decodeString(model.meta.charset, bits, start);
    case "number":
      const length = parseInt(bits.slice(start, start + 6), 2);
      const value = parseInt(bits.slice(start + 6, start + 6 + length), 2);
      return [value, start + 6 + length];
    case "boolean":
      return [bits[start] === "1", start + 1];
    case "null":
      return [null, start];
    default:
      throw new Error("Invalid type");
  }
}

function decodeNonComplex(
  model: PymModel,
  type: string | PymType,
  bytes: string,
  index: number
): [any, number] {
  if (isPrimitive(type)) {
    return decodePrimitive(model, type as string, bytes, index);
  }
  if (typeof type === "string") {
    const particle = model.particles.get(type);
    if (!particle) throw new Error("Invalid particle");
    return decode(model, type, bytes, index);
  }
  if (type.array) {
    let [length, newIndex] = parseHeader(bytes, index);
    index = newIndex;
    const array: any[] = [];
    for (let i = 0; i < length; i++) {
      let [value, newIndex] = decodeNonComplex(
        model,
        typeof type.type === "string"
          ? type.type
          : {
              ...type,
              array: false,
            },
        bytes,
        index
      );
      array.push(value);
      index = newIndex;
    }
    return [array, index];
  }
  throw new Error("Invalid type");
}
function asString(bytes: Uint8Array): string {
  const str = bytes.reduce(
    (acc, byte) => acc + byte.toString(2).padStart(8, "0"),
    ""
  );
  return str;
}
export const decode = (
  model: PymModel,
  entryPoint: string,
  bytes: Uint8Array | string,
  startIndex = 0
): [Record<string, any>, number] => {
  const start = model.particles.get(entryPoint);
  if (!start) throw new Error("Invalid entry point : " + entryPoint);

  const bits: string = typeof bytes === "string" ? bytes : asString(bytes);
  let decoded: Record<string, any> = {};
  let index = startIndex;
  for (const property of start.properties) {
    if (index > bits.length) throw new Error("Invalid bits");
    if (bits[index++] === "0") {
      decoded[property.name] = null;
      continue;
    }
    if (!isComplexe(property.type)) {
      const [value, newIndex] = decodeNonComplex(
        model,
        property.type,
        bits,
        index
      );
      decoded[property.name] = value;
      index = newIndex;
      continue;
    }

    let types = (property.type as PymType).type as (string | PymType)[];
    const maxtypes = types.length.toString(2).length;
    const usedType = parseInt(bits.slice(index, index + maxtypes), 2);
    index += maxtypes;
    const type = types[usedType];
    const [value, newIndex] = decodeNonComplex(model, type, bits, index);
    decoded[property.name] = value;
    index = newIndex;
  }
  return [decoded, index];
};
