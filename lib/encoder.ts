import { PymModel, PymParticle, PymProperty, PymType } from "./types";
import { isPrimitive, compare, isComplexe, asBytes } from "./utils";

// 5        bits for length of header
// [1-32]   bits for length of string
// [1-1e32] bits for string

function getLengthHeader(length: number): string {
  const bin = length.toString(2);
  const header = bin.length.toString(2).padStart(5, "0");
  return header + bin;
}
export function encodeString(table: string, value: string) {
  let str = "";
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const index = table.indexOf(char);
    if (index !== -1) {
      str += index.toString(2).padStart(7, "0");
    } else {
      const code = char.charCodeAt(0);
      if (code > 2 ** 8) {
        str += (126).toString(2);
        str += code.toString(2).padStart(16, "0");
      } else {
        str += (125).toString(2);
        str += code.toString(2).padStart(8, "0");
      }
    }
  }
  return str + (127).toString(2);
}
function encodePrimitive(table: string, type: string, value: any): string {
  switch (type) {
    case "string":
      return encodeString(table, value);
    case "number":
      const bin = value.toString(2);
      return bin.length.toString(2).padStart(6, "0") + bin;
    case "boolean":
      return +value + "";
    case "null":
      return "";
    default:
      throw new Error("Invalid type");
  }
}

function encodeSimpleField(
  model: PymModel,
  property: PymProperty,
  object: any
) {
  const type = property.type as string;
  if (isPrimitive(type)) {
    if (!compare(type, object[property.name]))
      throw new Error(`Invalid type for ${property.name}`);
    const word = encodePrimitive(
      model.meta.charset,
      type,
      object[property.name]
    );
    return word; //(
    //*"1" +*/ (type === "number" ? getLengthHeader(word.length) : "") + word
    //);
  } else {
    const ref = model.particles.get(type);
    if (!ref)
      throw new Error(
        `Invalid reference for ${property.name} : ` +
          Array.from(model.particles.keys()).join(", ")
      );
    if (!compare("object", object[property.name])) {
      throw new Error(`Invalid type for ${property.name}`);
    }
    const word = encode(model, type, object[property.name]);
    return /*getLengthHeader(word.length) + */ word.toString();
  }
}

function is(models: PymModel, type: PymType, value: any): boolean {
  if (type.array) {
    if (!Array.isArray(value)) return false;
    return value.every((item) => is(models, { ...type, array: false }, item));
  }
  if (typeof type.type === "string") {
    if (isPrimitive(type.type)) {
      return compare(type.type, value);
    }
    const ref = models.particles.get(type.type);
    if (!ref) return false;
    return isParticle(models, ref, value);
  }
  if (Array.isArray(type.type)) {
    return type.type.some((item) =>
      is(
        models,
        typeof item === "string" ? { type: item, array: false } : item,
        value
      )
    );
  }
  throw new Error("Invalid type" + JSON.stringify(type));
}

function isParticle(
  models: PymModel,
  particle: PymParticle,
  value: any
): boolean {
  for (const property of particle.properties) {
    if (value === null) return false;
    if (!(property.name in value)) return false;
    let type = property.type;
    if (typeof property.type === "string")
      type = { type: property.type, array: false };
    if (!is(models, type as PymType, value[property.name])) return false;
  }
  return true;
}

function handleNonComplexe(
  model: PymModel,
  property: PymProperty,
  object: any
): string {
  const isSimple = typeof property.type === "string";
  if (isSimple) {
    return encodeSimpleField(model, property, object);
  }
  if (!Array.isArray(object[property.name]))
    throw new Error(`Invalid type for ${property.name}`);

  let type = (property.type as PymType).type;
  if (Array.isArray(type)) type = { type, array: false };
  const items = Array.from(
    { length: object[property.name].length },
    (_: any, index: number) =>
      encodeSimpleField(
        model,
        { name: index + "", type: type as string | PymType },
        object[property.name]
      )
  ).join("");
  return getLengthHeader(object[property.name].length) + items;
}

export const encode = (
  model: PymModel,
  entryPoint: string,
  object: Record<string, any>,
  bytes = false
): Uint8Array | string => {
  const start = model.particles.get(entryPoint);
  if (!start) throw new Error("Invalid entry point");
  let encoded = "";
  for (const property of start.properties) {
    if (object === null)
      throw new Error(
        `Invalid type for ${property.name} ` +
          null +
          " || " +
          JSON.stringify(property.type)
      );
    if (
      !(property.name in object) ||
      object[property.name] === undefined ||
      object[property.name] === null
    ) {
      encoded += "0";
      continue;
    }
    encoded += "1";
    if (!isComplexe(property.type as PymType["type"])) {
      encoded += handleNonComplexe(model, property, object);
    } else {
      let types = (property.type as PymType).type as (string | PymType)[];
      const matchingType = types.findIndex((type) =>
        is(
          model,
          typeof type === "string" ? { type: type, array: false } : type,
          object[property.name]
        )
      );
      if (matchingType === -1)
        throw new Error(
          `Invalid type for ${property.name} ` +
            JSON.stringify(object[property.name]) +
            " || " +
            JSON.stringify(types)
        );
      const maxtypes = types.length.toString(2).length;
      const finalType = types[matchingType];
      const word = handleNonComplexe(
        model,
        {
          ...property,
          type: finalType,
        },
        object
      );
      encoded += matchingType.toString(2).padStart(maxtypes, "0") + word;
    }
  }
  return bytes ? asBytes(encoded) : encoded;
};
