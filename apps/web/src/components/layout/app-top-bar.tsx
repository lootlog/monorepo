type AppTopBarProps = {
  children?: React.ReactNode;
};

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
