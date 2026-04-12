type Props = {
  children?: React.ReactNode;
};

export const PageHeader: React.FC<Props> = ({ children }) => {
  return (
    <div className="h-14 min-h-14 flex items-center px-3 justify-between z-50 box-border shrink-0 shadow-[0_1px_4px_0_rgb(0_0_0/0.06)] border-b bg-background">
      {children}
    </div>
  );
};
