export const parseEditablePoints = (value: string): number | null => {
  const normalizedValue = value.trim().replace(/,/g, ".");
  if (normalizedValue.length === 0) {
    return null;
  }

  const parsed = Number(normalizedValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};
