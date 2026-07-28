interface LoadingStateProps {
  title: string;
  description: string;
}

export const LoadingState = ({ title, description }: LoadingStateProps) => {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-[32px] border border-border/70 bg-background p-5">
        <div className="h-4 w-28 rounded-full bg-muted/70" />
        <div className="mt-4 h-12 w-3/4 rounded-2xl bg-muted/60" />
        <div className="mt-3 h-4 w-1/2 rounded-full bg-muted/50" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-32 rounded-[28px] bg-muted/50" />
        <div className="h-32 rounded-[28px] bg-muted/50" />
        <div className="h-32 rounded-[28px] bg-muted/50" />
      </div>
      <div className="rounded-[28px] border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1">{description}</p>
      </div>
    </div>
  );
};
