import { useTranslation } from "react-i18next";

export const InactiveMemberSuffix = () => {
  const { t } = useTranslation();

  return (
    <span className="font-normal text-muted-foreground">
      {" "}
      {t("common.inactiveMember")}
    </span>
  );
};
