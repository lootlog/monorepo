type AppTopBarProps = {
  children?: React.ReactNode;
};

export const AppTopBar: React.FC<AppTopBarProps> = ({ children }) => {
  return (
    <div className="@container/top-bar sticky top-0 z-50 box-border flex h-14 min-h-14 shrink-0 items-center justify-between border-b border-sidebar-border bg-background px-3">
      {children}
    </div>
  );
};
