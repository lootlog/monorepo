import type { FC } from "react";

type FormFieldErrorProps = {
  message?: string;
};

export const FormFieldError: FC<FormFieldErrorProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  return <p className="ll:text-xs ll:text-red-500 ll:mt-1">{message}</p>;
};
