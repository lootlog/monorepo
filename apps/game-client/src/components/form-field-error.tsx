import type { FC } from "react";

type FormFieldErrorProps = {
  message?: string;
};

export const FormFieldError: FC<FormFieldErrorProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  return <p className="ll:mt-1 ll:text-xs ll:text-destructive">{message}</p>;
};
