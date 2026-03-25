import { simpleStringHash } from "src/shared/utils/simple-string-hash";

export function getSyntheticNpcId(heroId: string): number {
  return -Math.abs(simpleStringHash(heroId) || 1);
}
