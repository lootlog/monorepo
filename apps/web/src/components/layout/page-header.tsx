type Props = {
  children?: React.ReactNode;
};

export const PageHeader: React.FC<Props> = ({ children }) => {
  return (
    <div className="z-50 box-border flex h-14 min-h-14 shrink-0 items-center justify-between border-b border-border bg-background px-3">
      {children}
    </div>
  );
};
