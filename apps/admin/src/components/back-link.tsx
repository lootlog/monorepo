import { TextLink } from "@lootlog/ui/components/text-link";
import { ArrowLeft } from "lucide-react";
import type { ReactElement } from "react";

export function BackLink({
  render,
  children,
}: {
  render: ReactElement;
  children: string;
}) {
  return (
    <TextLink
      render={render}
      className="group/back-link inline-flex h-8 items-center gap-1 self-start"
    >
      <ArrowLeft
        aria-hidden="true"
        className="size-3.5 shrink-0 transition-[translate] duration-150 ease-emphasized group-hover/back-link:-translate-x-0.5 group-focus-visible/back-link:-translate-x-0.5 motion-reduce:transition-none"
      />
      {children}
    </TextLink>
  );
}
