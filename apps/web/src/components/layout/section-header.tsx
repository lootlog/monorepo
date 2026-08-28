type SectionHeaderProps = {
  icon: React.FC<{ className?: string }>;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
}: SectionHeaderProps) => {
  return (
    <section className="flex min-w-0 flex-col gap-3 border-b border-border pb-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-xl bg-surface-selected p-2.5">
            <Icon className="size-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight tracking-[-0.02em]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="ml-auto">{actions}</div>}
      </div>
      {children && <div className="min-w-0 max-w-full">{children}</div>}
    </section>
  );
};
