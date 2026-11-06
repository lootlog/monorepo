type AppTopBarProps = {
  children?: React.ReactNode;
};

/**
 * The bar is glass (`glass-bar` in page-scroll.css), like the bars pinned
 * under it. Phones tint it with the page's own colour and draw no rule, so
 * it reads as part of the page; wider bars keep the sidebar's tint and rule.
 * On phones a bar pinned flush under it takes the glass over for both, so the
 * two blur as one surface; see `data-top-bar-glass`.
 */
export const AppTopBar: React.FC<AppTopBarProps> = ({ children }) => {
  return (
    <div
      data-app-top-bar
      className="glass-bar @container/top-bar sticky top-0 z-50 box-border flex h-14 min-h-14 shrink-0 items-center justify-between px-3 sm:px-4 md:border-b md:border-sidebar-border md:[--glass-bar-tint:var(--sidebar)]"
    >
      {children}
    </div>
  );
};
