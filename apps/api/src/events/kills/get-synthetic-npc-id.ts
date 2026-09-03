export function getSyntheticNpcId(heroId: string): number {
  let hash = 0;
  for (let i = 0; i < heroId.length; i++) {
    hash = (hash << 5) - hash + heroId.charCodeAt(i);
    hash |= 0;
  }
  return -Math.abs(hash || 1);
}
