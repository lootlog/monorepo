import { escapeRegExp } from "es-toolkit";

type HighlightedTextProps = {
  text: string;
  /** Words to mark wherever they appear, ignoring case. */
  query: string;
};

/** The text with each word of the query marked, as search results show it. */
export function HighlightedText({ text, query }: HighlightedTextProps) {
  const words = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);

  if (words.length === 0) return text;

  // A capturing group keeps the matches in the split, at odd indexes.
  const parts = text.split(new RegExp(`(${words.join("|")})`, "giu"));

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark
        key={index}
        className="rounded-xs bg-primary/20 text-inherit [box-decoration-break:clone]"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
