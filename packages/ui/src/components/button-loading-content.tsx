import { Children, type ReactNode } from "react";
import { Spinner } from "@lootlog/ui/components/spinner";

const isText = (value: ReactNode): value is string | number =>
  typeof value === "string" || typeof value === "number";

export function ButtonLoadingContent({
  loading = false,
  children,
}: {
  loading?: boolean;
  children: ReactNode;
}) {
  const content: ReactNode[] = [];
  let text: (string | number)[] = [];

  const flushText = () => {
    if (text.length === 0) return;

    content.push(<span key={`text-${content.length}`}>{text}</span>);
    text = [];
  };

  for (const child of Children.toArray(children)) {
    if (isText(child)) {
      text.push(child);
    } else {
      flushText();
      content.push(child);
    }
  }

  flushText();

  return (
    <>
      {content}
      {loading && (
        <span
          aria-hidden="true"
          data-button-spinner=""
          className="absolute inset-0 grid place-items-center"
        >
          <Spinner className="size-4 motion-reduce:animate-none" />
        </span>
      )}
    </>
  );
}
