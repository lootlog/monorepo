type Props = {
  children?: React.ReactNode;
};

export const PageHeader: React.FC<Props> = ({ children }) => {
  return (
    <div className="h-16 min-h-16 flex items-center px-2 justify-between border-b sticky top-0 backdrop-blur bg-background/90 supports-[backdrop-filter]:bg-background/30 z-50">
      {children}
    </div>
  );
};
