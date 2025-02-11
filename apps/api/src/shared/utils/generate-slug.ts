export const generateSlug = (text?: string) => {
  if (!text) {
    return null;
  }

  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};
