import { PymType } from "./types";

export function asBytes(str: string): Uint8Array {
  const result = new Uint8Array(Math.ceil(str.length / 8));
  for (let i = 0; i < Math.ceil(str.length / 8); i++) {
    const byte = str.slice(i * 8, (i + 1) * 8).padEnd(8, "0");
    result[i] = parseInt(byte, 2);
  }
  return result;
}

export function isPrimitive(type: string | PymType): boolean {
  return typeof type === "string" && type.charCodeAt(0) >= 97;
}

export function compare(type: any, value: any): boolean {
  if (type === "null") return value === null;
  return type === typeof value;
}

export function isComplexe(type: PymType["type"]): boolean {
  return (
    typeof type !== "string" &&
    !((type as PymType).array && typeof (type as PymType).type === "string")
  );
}
