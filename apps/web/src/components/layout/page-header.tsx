type Props = {
  children?: React.ReactNode;
};

export const PageHeader: React.FC<Props> = ({ children }) => {
  return (
    <div className="h-14 min-h-14 flex items-center px-2 justify-between border-b sticky top-0 backdrop-blur z-50">
      {children}
    </div>
  );
};
