import { writeFileSync } from "fs";
import { PymModel, PymParticle, PymProperty, PymType } from "./types";

export function parse(schema: string): PymModel {
  // console.log({ schema });
  const model: Partial<PymModel> = {
    particles: new Map<string, PymParticle>(),
  };
  const [meta, data] = schema.split(/\n-{4,}\n/);
  const { syntax, charset } = Object.fromEntries(
    meta.split("\n").map((line) => {
      const split = line.indexOf(" = ");
      const key = line.slice(0, split);
      const value = JSON.parse(line.slice(split + 3));
      return [key, value];
    })
  );
  model.meta = { syntax, charset };
  let to_parse = data;
  let phase: "name" | "property" = "name";
  let current_particle: PymParticle | null = null;
  while (to_parse.length > 0) {
    const newLine = to_parse.indexOf("\n");
    const line = to_parse.slice(0, newLine);
    to_parse = to_parse.slice(newLine + 1);
    if (!line.length) continue;

    if (phase === "name") {
      if (!line.endsWith("{")) {
        throw new Error("Expected { at end of line");
      }
      const name = line.slice(0, line.length - 1).trim();
      if (!/[a-zA-Z]+/.test(name)) {
        throw new Error("Invalid name");
      }
      current_particle = {
        name,
        properties: [],
      };
      phase = "property";
    } else if (line.trim() === "}") {
      if (
        !current_particle ||
        !current_particle.name ||
        !current_particle.properties?.length
      ) {
        throw new Error("Invalid particle");
      }
      model.particles!.set(current_particle.name, current_particle);
      current_particle = null;
      phase = "name";
    } else {
      let [name, type] = line.split(":").map((s) => s.trim());
      if (!name || !type) {
        throw new Error("Invalid property");
      }
      if (!current_particle) {
        throw new Error("Invalid property");
      }
      const parsedType = parseType(type);
      const short = parsedType.array && typeof parsedType.type === "string";
      current_particle.properties.push({
        name,
        type: short ? parsedType.type : parsedType,
      });
    }
  }
  console.dir(model, { depth: null });
  return model as PymModel;
}

function parseType(_type: string): PymType {
  const array = _type.endsWith("[]");
  const type = array ? _type.slice(0, -2) : _type;
  if (/^[a-zA-Z]+(\[\])?$/.test(type)) {
    return { type, array };
  }
  if (type.startsWith("(") && type.endsWith(")")) {
    const res = parseType(type.slice(1, -1).trim());
    return {
      type: typeof res === "string" ? res : res.type,
      array,
    };
  }
  if (type.includes("|")) {
    const list = _type.split("|").map((t) => parseType(t.trim()));
    if (!list.length) throw new Error("Found no types in union");
    if (list.length === 1) return list[0];
    return {
      type: list as PymType["type"],
      array,
    };
  }
  console.log({ type }, "not matching");
  throw new Error("Invalid type");
}
