import { parse } from "./schema";
import { encode } from "./encoder";

export function pym(schema: string) {
  const model = parse(schema);
  const errors: Error[] = [];
  return {
    model,
    encode(entrypoint: string, object: Record<string, any>): Buffer | null {
      try {
        return encode(model, entrypoint, object);
      } catch (e) {
        errors.push(e as Error);
      }
      return null;
    },
  };
}
