import { highlightSegments } from "@/lib/highlight-segments";

type HighlightedTextProps = {
  text: string;
  query: string;
};

export function HighlightedText({ text, query }: HighlightedTextProps) {
  return highlightSegments(text, query).map((segment, index) =>
    segment.marked ? (
      <mark
        key={index}
        className="rounded-xs bg-primary/20 text-inherit [box-decoration-break:clone]"
      >
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}
