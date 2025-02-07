export const generateSlug = (text?: string) => {
  if (!text) {
    return undefined;
  }

  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};
