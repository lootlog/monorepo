import { useTranslation } from "react-i18next";

/** Follows the name of a member who no longer belongs to the Lootlog. */
export const InactiveMemberSuffix = () => {
  const { t } = useTranslation();

  return (
    <span className="font-normal text-muted-foreground">
      {" "}
      {t("common.inactiveMember")}
    </span>
  );
};
