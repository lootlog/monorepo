import { Card } from "@lootlog/ui/components/card";

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
    <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="ml-auto">{actions}</div>}
      </div>
      {children}
    </Card>
  );
};
