import type { ReactNode } from "react";
import { cn } from "cn";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";

type PageStateProps = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function PageState({
  icon,
  title,
  description,
  children,
  className,
}: PageStateProps) {
  return (
    <Empty className={cn("min-h-80", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>
          <h1>{title}</h1>
        </EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && (
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
          {children}
        </EmptyContent>
      )}
    </Empty>
  );
}
