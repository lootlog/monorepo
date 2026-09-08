interface TranslationTree {
  [key: string]: string | TranslationTree;
}

export function createTranslationLookup(
  tree: TranslationTree,
  prefix = "",
): Map<string, string> {
  const translations = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value instanceof Object) {
      for (const [nestedPath, message] of createTranslationLookup(value, path))
        translations.set(nestedPath, message);
    } else {
      translations.set(path, value);
    }
  }
  return translations;
}
