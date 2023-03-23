export type PymModel = {
  meta: {
    syntax: string;
    charset: string;
  };
  particles: Map<string, PymParticle>;
};
export type PymParticle = {
  name: string;
  properties: PymProperty[];
};
export type PymProperty = {
  name: string;
  type: PymType["type"];
};
export type PymType = {
  type: string | PymType | [PymType, ...PymType[]];
  array: boolean;
};
