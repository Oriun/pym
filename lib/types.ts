export interface PymModel {
  meta: {
    syntax: string;
    charset: string;
  };
  particles: Map<string, PymParticle>;
}

export interface PymParticle {
  name: string;
  properties: PymProperty[];
}

export interface PymProperty {
  name: string;
  type: string | PymType;
}

export type PymType = {
  type: string | PymType | [PymType, ...PymType[]];
  array: boolean;
};
