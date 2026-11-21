/** A page-level message for a missing page or a failed load. */
export function ErrorPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div role="alert" className="rounded-lg border border-border bg-card p-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
