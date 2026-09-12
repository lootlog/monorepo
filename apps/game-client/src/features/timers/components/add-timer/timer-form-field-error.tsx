import type { FC } from "react";

type TimerFormFieldErrorProps = {
  message?: string;
};

export const TimerFormFieldError: FC<TimerFormFieldErrorProps> = ({
  message,
}) => {
  if (!message) {
    return null;
  }

  return <p className="ll:text-xs ll:text-red-500 ll:mt-1">{message}</p>;
};
