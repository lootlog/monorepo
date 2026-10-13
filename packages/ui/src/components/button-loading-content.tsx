import { Children, type ReactNode } from "react";
import { Spinner } from "@lootlog/ui/components/spinner";

const isText = (value: ReactNode): value is string | number =>
  typeof value === "string" || typeof value === "number";

/**
 * Keeps the button's own children in place and lays the spinner over them, so
 * the button never changes size while it loads. Runs of text become one span
 * so the button can hide every child while keeping it in the accessible name.
 */
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
