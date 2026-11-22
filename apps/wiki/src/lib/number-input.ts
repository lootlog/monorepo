export const readNumberInput = (
  text: string,
  { min, max }: { min: number; max: number },
) => {
  if (text.trim() === "") return undefined;

  const value = Number(text);

  return Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
};
