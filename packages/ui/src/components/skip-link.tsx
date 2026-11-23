import { TextLink } from "./text-link";

export function SkipLink({
  target,
  children,
}: {
  target: string;
  children: string;
}) {
  return (
    <TextLink
      href={`#${target}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:bg-background focus:px-4 focus:py-3"
    >
      {children}
    </TextLink>
  );
}
