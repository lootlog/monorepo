type AppTopBarProps = {
  children?: React.ReactNode;
};

/**
 * Phones paint the bar in the page's own colour without a rule, so it reads
 * as part of the page while its controls float on their own glass. It stays
 * opaque to its bottom edge: page tabs, filter bars and list toolbars pin
 * flush under it, and a fading edge would show content between the two.
 */
export const AppTopBar: React.FC<AppTopBarProps> = ({ children }) => {
  return (
    <div className="@container/top-bar sticky top-0 z-50 box-border flex h-14 min-h-14 shrink-0 items-center justify-between bg-background px-3 sm:px-4 md:border-b md:border-sidebar-border md:bg-sidebar/80 md:backdrop-blur-lg md:backdrop-saturate-150">
      {children}
    </div>
  );
};
