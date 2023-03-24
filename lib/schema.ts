import { writeFileSync } from "fs";
import { PymModel, PymParticle, PymProperty, PymType } from "./types";
import { defaultCharset } from "./defaults";
export function parse(schema: string): PymModel {
  const model: Partial<PymModel> = {
    particles: new Map<string, PymParticle>(),
  };
  const [meta, data] = schema.split(/\n-{4,}\n/);
  const { syntax, charset = defaultCharset } = Object.fromEntries(
    meta.split("\n").map((line) => {
      const split = line.indexOf(" = ");
      const key = line.slice(0, split);
      const value = JSON.parse(line.slice(split + 3));
      return [key, value];
    })
  );
  if (charset.length > 125) throw new Error("Invalid charset length");
  model.meta = { syntax, charset };
  let to_parse = data;
  let phase: "name" | "property" = "name";
  let current_particle: PymParticle | null = null;
  if (!to_parse.endsWith("\n")) to_parse += "\n";
  while (to_parse.length > 0) {
    let newLine = to_parse.indexOf("\n");
    const comment = to_parse.indexOf("/*");
    if (comment !== -1 && comment < newLine) {
      const commentEnd = to_parse.indexOf("*/", comment);
      to_parse = to_parse.slice(0, comment) + to_parse.slice(commentEnd + 2);
      newLine = to_parse.indexOf("\n");
    }
    const line = to_parse.slice(0, newLine);
    to_parse = to_parse.slice(newLine + 1);
    if (!line.length) continue;

    if (phase === "name") {
      if (!line.endsWith("{")) {
        throw new Error("Expected { at end of line");
      }
      const name = line.slice(0, line.length - 1).trim();
      if (!/[A-Z][a-zA-Z]*/.test(name)) {
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
      const short =
        typeof parsedType !== "string" &&
        !parsedType.array &&
        typeof parsedType.type === "string";
      current_particle.properties.push({
        name,
        type: short ? (parsedType.type as string) : parsedType,
      });
    }
  }
  writeFileSync(
    "model.json",
    JSON.stringify(
      // @ts-ignore
      { ...model, particles: Object.fromEntries(model.particles) },
      null,
      2
    )
  );
  return model as PymModel;
}

function splitWithParentheses(str: string): string[] {
  const separator = "|";
  const res: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
    } else if (char === separator && depth === 0) {
      res.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.length) res.push(current);
  return res;
}

function parseType(_type: string): string | PymType {
  const array = _type.endsWith("[]");
  const type = array ? _type.slice(0, -2) : _type;
  if (/^[a-zA-Z]+(\[\])?$/.test(type)) {
    return array ? { type: parseType(type), array } : type;
  }
  if (type.startsWith("(") && type.endsWith(")")) {
    const res = parseType(type.slice(1, -1).trim());
    return {
      type: typeof res === "string" ? res : res.type,
      array,
    };
  }
  if (type.includes("|")) {
    const split = splitWithParentheses(_type);
    const list = split.map((t) => parseType(t.trim()));
    if (!list.length) throw new Error("Found no types in union");
    if (list.length === 1) return list[0];
    return {
      type: list as PymType["type"],
      array: false,
    };
  }
  console.log(_type);
  throw new Error("Invalid type");
}
