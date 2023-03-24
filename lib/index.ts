import { parse } from "./schema";
import { encode } from "./encoder";
import { decode } from "./decoder";
import { PymModelSchema } from "./defaults";

const compilationModel = parse(PymModelSchema);
export function pym(schema: string) {
  const model = parse(schema);
  const errors: Error[] = [];
  return {
    model,
    errors,
    encode(entrypoint: string, object: Record<string, any>): Uint8Array | null {
      try {
        return encode(model, entrypoint, object, true) as Uint8Array;
      } catch (e) {
        errors.push(e as Error);
        console.error(e);
      }
      return null;
    },
    compile(): Uint8Array {
      try {
        return encode(
          compilationModel,
          "A",
          { meta: model, particles: Array.from(model.particles.values()) },
          true
        ) as Uint8Array;
      } catch (e) {
        console.log("Error while compiling model");
        throw e;
      }
    },
    decode(entrypoint: string, buffer: Uint8Array): any {
      try {
        return decode(model, entrypoint, buffer)[0];
      } catch (e) {
        errors.push(e as Error);
        console.error(e);
      }
      return null;
    },
  };
}

pym.decompile = function (buffer: Uint8Array): any {
  try {
    return decode(compilationModel, "A", buffer)[0];
  } catch (e) {
    console.log("Error while decompiling model");
    throw e;
  }
};
