import { escapeRegExp } from "es-toolkit";

type HighlightedTextProps = {
  text: string;
  query: string;
};

export function HighlightedText({ text, query }: HighlightedTextProps) {
  const words = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);

  if (words.length === 0) return text;

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
