/**
 * A number field's text as a number between `min` and `max`. An empty field,
 * text that is no number and a number out of bounds read as none, so the
 * result shows nothing instead of a wrong value.
 */
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
