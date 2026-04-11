type NotificationJobDetailRowProps = {
  label: string;
  value: React.ReactNode;
};

export const NotificationJobDetailRow = ({
  label,
  value,
}: NotificationJobDetailRowProps) => (
  <div className="flex items-center justify-between gap-4">
    <p className="text-sm text-muted-foreground">{label}</p>
    <div className="text-right text-sm font-medium">{value}</div>
  </div>
);
