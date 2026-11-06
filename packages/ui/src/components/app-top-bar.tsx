type AppTopBarProps = {
  children?: React.ReactNode;
};

/**
 * Phones paint the bar as glass in the page's own colour without a rule, so
 * it reads as part of the page while content blurs under it. The glass is
 * even to its bottom edge, with no fading scroll edge: page tabs, filter bars
 * and list toolbars pin flush under it, and a fade would show sharp content
 * between the two. Its tint also reaches 1px below its edge: phones
 * composite sticky layers at fractional offsets while scrolling, which would
 * otherwise open a hairline seam above the bar pinned under it.
 */
export const AppTopBar: React.FC<AppTopBarProps> = ({ children }) => {
  return (
    <div className="@container/top-bar sticky top-0 z-50 box-border flex h-14 min-h-14 shrink-0 items-center justify-between bg-background/70 backdrop-blur-xl backdrop-saturate-150 max-md:shadow-[0_1px_0_color-mix(in_oklab,var(--color-background)_70%,transparent)] px-3 sm:px-4 md:border-b md:border-sidebar-border md:bg-sidebar/80 md:backdrop-blur-lg">
      {children}
    </div>
  );
};
