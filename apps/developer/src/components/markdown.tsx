import parse from "html-react-parser";

interface MarkdownContentProps {
  html: string;
}

export function MarkdownContent({ html }: MarkdownContentProps) {
  return (
    <div className="prose prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed">
      {parse(html)}
    </div>
  );
}
