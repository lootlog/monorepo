type AppTopBarProps = {
  children?: React.ReactNode;
};

export const AppTopBar: React.FC<AppTopBarProps> = ({ children }) => {
  return (
    <div className="@container/top-bar sticky top-0 z-50 box-border flex h-14 min-h-14 shrink-0 items-center justify-between px-3 sm:px-4 md:border-b md:border-sidebar-border md:bg-sidebar/80 md:backdrop-blur-lg md:backdrop-saturate-150">
      {/* Phones have no bar surface: its controls float on their own glass,
          and a scroll edge fades the content scrolling under them. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-background from-55% to-background/0 backdrop-blur-md mask-b-from-75% md:hidden"
      />
      {children}
    </div>
  );
};
