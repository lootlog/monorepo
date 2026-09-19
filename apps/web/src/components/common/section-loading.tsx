import { Spinner } from "@lootlog/ui/components/spinner";

/**
 * Placeholder for a page section whose shape is unknown until its data
 * arrives. It stays invisible briefly so a fast response never flashes it.
 */
export const SectionLoading = () => (
  <div className="flex h-64 animate-placeholder-in items-center justify-center">
    <Spinner className="size-8" />
  </div>
);
