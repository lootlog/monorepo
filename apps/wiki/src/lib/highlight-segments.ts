import { foldText } from "@lootlog/domain/text-fold";

export type HighlightSegment = {
  readonly text: string;
  readonly marked: boolean;
};

const foldForMatch = (value: string) => foldText(value).toLowerCase();

export const highlightSegments = (
  text: string,
  query: string,
): HighlightSegment[] => {
  const words = query.trim().split(/\s+/).filter(Boolean).map(foldForMatch);
  const chars = Array.from(text);
  const charAt: number[] = [];
  let folded = "";

  for (const [index, char] of chars.entries()) {
    const foldedChar = foldForMatch(char);

    for (let unit = 0; unit < foldedChar.length; unit += 1) charAt.push(index);

    folded += foldedChar;
  }

  const marked = chars.map(() => false);

  for (const word of words) {
    for (
      let start = folded.indexOf(word);
      start !== -1;
      start = folded.indexOf(word, start + 1)
    ) {
      for (let unit = start; unit < start + word.length; unit += 1)
        marked[charAt[unit] ?? 0] = true;
    }
  }

  const segments: { text: string; marked: boolean }[] = [];

  for (const [index, char] of chars.entries()) {
    const isMarked = marked[index] ?? false;
    const last = segments.at(-1);

    if (last?.marked === isMarked) last.text += char;
    else segments.push({ text: char, marked: isMarked });
  }

  return segments;
};
