export function parseJsonFromString(jsonString: string): any | null {
  try {
    const parsedJson = JSON.parse(jsonString);
    return parsedJson;
  } catch (error) {
    return null;
  }
}
