type Props = {
  children: React.ReactNode;
};

export const PageContainer: React.FC<Props> = ({ children }) => {
  return (
    <div className="w-full flex justify-center items-center h-screen">
      <div className="w-full h-full">{children}</div>
    </div>
  );
};
