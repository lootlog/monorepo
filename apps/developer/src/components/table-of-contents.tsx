import type { Heading } from "~/utils/markdown";

interface TableOfContentsProps {
  headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  return (
    <nav className="sticky top-8">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Na tej stronie
      </h3>
      <ul className="flex flex-col gap-0.5 border-l border-white/[0.06]">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={`block py-1 text-[13px] leading-snug text-muted-foreground/60 transition-colors duration-150 hover:text-foreground ${
                heading.level === 3 ? "pl-6" : "pl-3"
              } -ml-px border-l border-transparent hover:border-muted-foreground/40`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
