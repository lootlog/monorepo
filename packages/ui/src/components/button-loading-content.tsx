import { Children, type ReactNode } from "react";
import { cn } from "cn";
import { Spinner } from "@lootlog/ui/components/spinner";

export function ButtonLoadingContent({
  loading = false,
  children,
}: {
  loading?: boolean;
  children: ReactNode;
}) {
  // Group only the leading content with the spinner so the button's other flex gaps stay intact.
  const content = Children.toArray(children);
  let leadingContentEnd = 1;
  if (typeof content[0] === "string" || typeof content[0] === "number") {
    const firstElementIndex = content.findIndex(
      (child) => typeof child !== "string" && typeof child !== "number",
    );
    leadingContentEnd =
      firstElementIndex < 0 ? content.length : firstElementIndex;
  }

  return (
    <>
      <span
        className="inline-flex min-w-0 items-center [column-gap:inherit] transition-[column-gap] duration-200 ease-out motion-reduce:transition-none"
        style={loading ? undefined : { columnGap: 0 }}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex shrink-0 items-center overflow-hidden transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none",
            loading ? "w-4 opacity-100" : "w-0 opacity-0",
          )}
        >
          <Spinner
            className={cn(
              "size-4 motion-reduce:animate-none",
              !loading && "animate-none",
            )}
          />
        </span>
        {content.slice(0, leadingContentEnd)}
      </span>
      {content.slice(leadingContentEnd)}
    </>
  );
}
