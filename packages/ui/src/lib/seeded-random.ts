export function createSeededRandom(seed: number) {
  let state = seed;

  return () => {
    state = (state * 16807 + 11) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hash);
}
